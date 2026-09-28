/**
 * Tests d'intégration de l'API Pharmacie Émeraude.
 *
 * Ils utilisent une vraie base MySQL : lancez-les sur une base dédiée, par exemple
 *   DB_NAME=pharmacie_tests npm test
 * La base est vidée au début des tests.
 */

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'pharmacie_tests';
process.env.ADMIN_PASSWORD = 'admin-test-123';
process.env.LOG_LEVEL = 'error';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../config');

if (!/test/i.test(config.DB_NAME)) {
    throw new Error(`Par sécurité, les tests ne tournent que sur une base dont le nom contient "test" (actuel : ${config.DB_NAME})`);
}

const { initDB, initTables, seedAdmin, closePool, query } = require('../db/mysql');
const { createApp } = require('../server');

let server;
let baseUrl;
let adminToken;
let vendeurToken;

async function api(method, path, { token, body } = {}) {
    const res = await fetch(baseUrl + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
}

before(async () => {
    await initDB();
    await query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of ['details_commande', 'commandes', 'details_vente', 'ventes', 'produits', 'fournisseurs', 'clients', 'parametres', 'users']) {
        await query(`DROP TABLE IF EXISTS ${table}`);
    }
    await query('SET FOREIGN_KEY_CHECKS = 1');
    await initTables();
    await seedAdmin();

    server = createApp().listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    server?.close();
    await closePool();
});

test('les fichiers du serveur ne sont jamais servis', async () => {
    for (const file of ['/.env', '/server.js', '/config.js', '/package.json', '/db/mysql.js']) {
        const res = await fetch(baseUrl + file);
        const text = await res.text();
        assert.ok(!text.includes('require('), `${file} ne doit pas être exposé`);
        assert.ok(!text.includes('JWT_SECRET='), `${file} ne doit pas être exposé`);
    }
});

test('les données sont protégées par la connexion', async () => {
    for (const path of ['/api/products', '/api/clients', '/api/sales', '/api/stats', '/api/users']) {
        const res = await api('GET', path);
        assert.equal(res.status, 401, path);
    }
});

test('connexion : refus avec un mauvais mot de passe, succès sinon', async () => {
    const bad = await api('POST', '/api/auth/login', { body: { username: 'admin', password: 'faux' } });
    assert.equal(bad.status, 401);

    const ok = await api('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin-test-123' } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    assert.equal(ok.body.user.role, 'admin');
    assert.equal(ok.body.user.password, undefined, 'le mot de passe ne doit jamais être renvoyé');
    adminToken = ok.body.token;
});

test('l\'admin crée un vendeur, qui a des droits limités', async () => {
    const created = await api('POST', '/api/users', {
        token: adminToken,
        body: { username: 'vendeur1', password: 'motdepasse1', role: 'vendeur', nom_complet: 'Vendeur Test' }
    });
    assert.equal(created.status, 201);

    const login = await api('POST', '/api/auth/login', { body: { username: 'vendeur1', password: 'motdepasse1' } });
    vendeurToken = login.body.token;

    const createProduct = await api('POST', '/api/products', { token: vendeurToken, body: { nom: 'X', prix: 100, stock: 1 } });
    assert.equal(createProduct.status, 403, 'un vendeur ne peut pas créer de produit');

    const listUsers = await api('GET', '/api/users', { token: vendeurToken });
    assert.equal(listUsers.status, 403, 'un vendeur ne peut pas gérer les comptes');
});

test('validation : un produit sans nom ou avec un prix négatif est refusé', async () => {
    const res = await api('POST', '/api/products', { token: adminToken, body: { nom: '', prix: -5, stock: 3 } });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Nom/);
    assert.match(res.body.error, /Prix/);
});

test('vente multi-produits : stock décrémenté, annulation qui le restaure', async () => {
    const p1 = (await api('POST', '/api/products', { token: adminToken, body: { nom: 'Paracétamol', prix: 800, stock: 10, stock_min: 2 } })).body;
    const p2 = (await api('POST', '/api/products', { token: adminToken, body: { nom: 'Vitamine C', prix: 1200, stock: 5 } })).body;
    const client = (await api('POST', '/api/clients', { token: vendeurToken, body: { nom: 'Kouassi', prenom: 'Awa', telephone: '0707070707' } })).body;

    const sale = await api('POST', '/api/sales', {
        token: vendeurToken,
        body: {
            client_id: client.id,
            mode_paiement: 'especes',
            montant_recu: 5000,
            lignes: [{ produit_id: p1.id, quantite: 2 }, { produit_id: p2.id, quantite: 1 }, { produit_id: p1.id, quantite: 1 }]
        }
    });
    assert.equal(sale.status, 201, JSON.stringify(sale.body));
    assert.equal(sale.body.total, 3 * 800 + 1200);
    assert.equal(sale.body.lignes.length, 2, 'les lignes d\'un même produit sont regroupées');
    assert.equal(sale.body.client_nom, 'Kouassi Awa');

    assert.equal((await api('GET', `/api/products/${p1.id}`, { token: adminToken })).body.stock, 7);

    const tooMuch = await api('POST', '/api/sales', { token: vendeurToken, body: { lignes: [{ produit_id: p2.id, quantite: 99 }] } });
    assert.equal(tooMuch.status, 400);
    assert.match(tooMuch.body.error, /Stock insuffisant/);

    const notEnoughCash = await api('POST', '/api/sales', {
        token: vendeurToken, body: { mode_paiement: 'especes', montant_recu: 100, lignes: [{ produit_id: p1.id, quantite: 1 }] }
    });
    assert.equal(notEnoughCash.status, 400);

    const cancelByVendeur = await api('POST', `/api/sales/${sale.body.id}/annuler`, { token: vendeurToken });
    assert.equal(cancelByVendeur.status, 403, 'seul un pharmacien ou l\'admin peut annuler');

    const cancel = await api('POST', `/api/sales/${sale.body.id}/annuler`, { token: adminToken });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.statut, 'annulee');
    assert.equal((await api('GET', `/api/products/${p1.id}`, { token: adminToken })).body.stock, 10);

    const again = await api('POST', `/api/sales/${sale.body.id}/annuler`, { token: adminToken });
    assert.equal(again.status, 400, 'une vente ne peut pas être annulée deux fois');

    const history = await api('GET', `/api/clients/${client.id}`, { token: adminToken });
    assert.equal(history.body.achats.length, 1);
    assert.equal(history.body.total_achats, 0, 'une vente annulée ne compte pas dans le total');
});

test('commande fournisseur livrée : le stock n\'est ajouté qu\'une fois', async () => {
    const supplier = (await api('POST', '/api/suppliers', { token: adminToken, body: { nom: 'Laborex', telephone: '0102030405' } })).body;
    const product = (await api('POST', '/api/products', { token: adminToken, body: { nom: 'Amoxicilline', prix: 3500, stock: 1 } })).body;

    const order = await api('POST', '/api/orders', {
        token: adminToken,
        body: { fournisseur_id: supplier.id, lignes: [{ produit_id: product.id, quantite: 20, prix_unitaire: 2500 }] }
    });
    assert.equal(order.status, 201);
    assert.equal(order.body.total, 50000);

    await api('PUT', `/api/orders/${order.body.id}/statut`, { token: adminToken, body: { statut: 'livree' } });
    await api('PUT', `/api/orders/${order.body.id}/statut`, { token: adminToken, body: { statut: 'livree' } });
    assert.equal((await api('GET', `/api/products/${product.id}`, { token: adminToken })).body.stock, 21);

    const del = await api('DELETE', `/api/orders/${order.body.id}`, { token: adminToken });
    assert.equal(del.status, 400, 'une commande livrée ne peut pas être supprimée');
});

test('statistiques et paramètres', async () => {
    const stats = await api('GET', '/api/stats', { token: adminToken });
    assert.equal(stats.status, 200);
    assert.equal(typeof stats.body.total_revenue, 'number');

    const daily = await api('GET', '/api/stats/daily?jours=7', { token: adminToken });
    assert.equal(daily.body.length, 7);

    const settings = await api('PUT', '/api/settings', { token: adminToken, body: { nom_pharmacie: 'Pharmacie Test', telephone: '0101' } });
    assert.equal(settings.body.nom_pharmacie, 'Pharmacie Test');

    const forbidden = await api('PUT', '/api/settings', { token: vendeurToken, body: { nom_pharmacie: 'Pirate' } });
    assert.equal(forbidden.status, 403);
});

test('changement de mot de passe', async () => {
    const wrong = await api('PUT', '/api/auth/password', { token: vendeurToken, body: { ancien: 'mauvais', nouveau: 'nouveau-mdp-1' } });
    assert.equal(wrong.status, 400);

    const ok = await api('PUT', '/api/auth/password', { token: vendeurToken, body: { ancien: 'motdepasse1', nouveau: 'nouveau-mdp-1' } });
    assert.equal(ok.status, 200);

    const login = await api('POST', '/api/auth/login', { body: { username: 'vendeur1', password: 'nouveau-mdp-1' } });
    assert.equal(login.status, 200);
});

test('un compte désactivé perd l\'accès immédiatement', async () => {
    const users = (await api('GET', '/api/users', { token: adminToken })).body;
    const vendeur = users.find(u => u.username === 'vendeur1');
    await api('PUT', `/api/users/${vendeur.id}`, { token: adminToken, body: { role: 'vendeur', actif: false } });

    const res = await api('GET', '/api/products', { token: vendeurToken });
    assert.equal(res.status, 401);
});
