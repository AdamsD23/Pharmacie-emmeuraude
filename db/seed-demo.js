/**
 * Données de démonstration : fournisseurs, produits, clients, comptes et ventes des 14 derniers jours.
 * Ne fait rien si des produits existent déjà.
 *
 * Utilisation manuelle : npm run seed
 */

const bcrypt = require('bcryptjs');
const { query, transaction } = require('./mysql');

const FOURNISSEURS = [
    ['Laborex Côte d\'Ivoire', '+225 27 21 75 00 00', 'commandes@laborex.ci', 'Zone 4, Marcory, Abidjan'],
    ['Copharmed', '+225 27 21 35 10 10', 'contact@copharmed.ci', 'Rue des Jardins, Vridi, Abidjan'],
    ['DPCI Distribution', '+225 27 22 40 20 20', 'ventes@dpci.ci', 'Cocody Riviera 3, Abidjan']
];

// nom, catégorie, prix, stock, stock_min, fournisseur (index), jours avant expiration
const PRODUITS = [
    ['Paracétamol 500 mg (boîte de 16)', 'Antalgique', 800, 140, 30, 0, 540],
    ['Doliprane 1000 mg (boîte de 8)', 'Antalgique', 1500, 85, 20, 0, 420],
    ['Ibuprofène 400 mg (boîte de 20)', 'Anti-inflammatoire', 1800, 6, 15, 1, 300],
    ['Amoxicilline 500 mg (boîte de 12)', 'Antibiotique', 3500, 42, 15, 1, 250],
    ['Coartem 80/480 (6 comprimés)', 'Antipaludique', 4500, 38, 20, 0, 365],
    ['Artésunate injectable 60 mg', 'Antipaludique', 6500, 4, 10, 2, 45],
    ['Sérum de réhydratation orale (SRO)', 'Réhydratation', 300, 200, 50, 2, 700],
    ['Vitamine C 500 mg (tube de 20)', 'Vitamines', 1200, 60, 15, 1, 20],
    ['Smecta (boîte de 10 sachets)', 'Gastro-entérologie', 2800, 27, 10, 0, 480],
    ['Sirop contre la toux enfant 125 ml', 'ORL', 2500, 0, 10, 2, 200],
    ['Métronidazole 250 mg (boîte de 20)', 'Antibiotique', 1600, 33, 10, 1, -5],
    ['Gel hydroalcoolique 100 ml', 'Hygiène', 1000, 75, 20, 2, 600],
    ['Bande de gaze 10 cm', 'Pansement', 500, 120, 30, 0, 1000],
    ['Tensiomètre électronique', 'Matériel médical', 18000, 5, 2, 2, null]
];

const CLIENTS = [
    ['Kouassi', 'Adama', '+225 07 00 11 22 33', 'adama.kouassi@email.ci', 'Plateau, Abidjan'],
    ['Yao', 'Aya', '+225 05 44 55 66 77', 'aya.yao@email.ci', 'Cocody Angré, Abidjan'],
    ['Traoré', 'Moussa', '+225 01 23 45 67 89', null, 'Yopougon Selmer, Abidjan'],
    ['Konan', 'Marie-Laure', '+225 07 98 76 54 32', 'ml.konan@email.ci', 'Marcory Zone 4, Abidjan'],
    ['Bamba', 'Ibrahim', '+225 05 12 12 12 12', null, 'Treichville, Abidjan']
];

const PAIEMENTS = ['especes', 'especes', 'especes', 'wave', 'wave', 'orange_money', 'mtn_money'];

async function seedDemo() {
    const existing = await query('SELECT COUNT(*) AS n FROM produits');
    if (existing[0].n > 0) return false;

    await transaction(async (conn) => {
        const supplierIds = [];
        for (const f of FOURNISSEURS) {
            const [r] = await conn.execute('INSERT INTO fournisseurs (nom, telephone, email, adresse) VALUES (?, ?, ?, ?)', f);
            supplierIds.push(r.insertId);
        }

        const products = [];
        for (const [nom, categorie, prix, stock, stockMin, fIndex, jours] of PRODUITS) {
            const [r] = await conn.execute(
                `INSERT INTO produits (nom, categorie, prix, stock, stock_min, fournisseur_id, date_expiration)
                 VALUES (?, ?, ?, ?, ?, ?, ${jours === null ? 'NULL' : `DATE_ADD(CURDATE(), INTERVAL ${jours} DAY)`})`,
                [nom, categorie, prix, stock, stockMin, supplierIds[fIndex]]
            );
            products.push({ id: r.insertId, nom, prix });
        }

        const clientIds = [];
        for (const c of CLIENTS) {
            const [r] = await conn.execute('INSERT INTO clients (nom, prenom, telephone, email, adresse) VALUES (?, ?, ?, ?, ?)', c);
            clientIds.push(r.insertId);
        }

        // Comptes de démonstration pour tester les rôles
        const hash = await bcrypt.hash('demo12345', 10);
        await conn.execute(
            "INSERT IGNORE INTO users (username, password, role, nom_complet) VALUES ('pharmacien', ?, 'pharmacien', 'Dr Aïcha Coulibaly'), ('vendeur', ?, 'vendeur', 'Serge N''Guessan')",
            [hash, hash]
        );
        const [[admin]] = await conn.execute("SELECT id FROM users WHERE username = 'admin'");

        // Ventes des 14 derniers jours (déterministes pour que la démo soit toujours identique)
        let seed = 7;
        const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        for (let day = 13; day >= 0; day--) {
            const nbSales = 3 + Math.floor(random() * 5);
            for (let s = 0; s < nbSales; s++) {
                const nbLines = 1 + Math.floor(random() * 3);
                const lines = [];
                for (let l = 0; l < nbLines; l++) {
                    const product = products[Math.floor(random() * 9)];
                    if (!lines.some(x => x.product.id === product.id)) {
                        lines.push({ product, quantite: 1 + Math.floor(random() * 3) });
                    }
                }
                const total = lines.reduce((sum, l) => sum + l.product.prix * l.quantite, 0);
                const clientId = random() < 0.5 ? clientIds[Math.floor(random() * clientIds.length)] : null;
                const hour = 8 + Math.floor(random() * 11);
                const minute = Math.floor(random() * 60);
                const [r] = await conn.execute(
                    `INSERT INTO ventes (client_id, vendeur_id, total, statut, mode_paiement, date)
                     VALUES (?, ?, ?, 'terminee', ?, DATE_ADD(DATE_SUB(CURDATE(), INTERVAL ${day} DAY), INTERVAL ${hour * 60 + minute} MINUTE))`,
                    [clientId, admin.id, total, PAIEMENTS[Math.floor(random() * PAIEMENTS.length)]]
                );
                for (const l of lines) {
                    await conn.execute(
                        'INSERT INTO details_vente (vente_id, produit_id, produit_nom, quantite, prix_unitaire, sous_total) VALUES (?, ?, ?, ?, ?, ?)',
                        [r.insertId, l.product.id, l.product.nom, l.quantite, l.product.prix, l.product.prix * l.quantite]
                    );
                }
            }
        }

        // Une commande fournisseur en attente pour les produits en rupture
        const [order] = await conn.execute(
            "INSERT INTO commandes (fournisseur_id, statut, total, date_livraison, notes, cree_par) VALUES (?, 'en_attente', ?, DATE_ADD(CURDATE(), INTERVAL 3 DAY), ?, ?)",
            [supplierIds[2], 50 * 1700 + 40 * 4800, 'Réassort urgent : sirop enfant et artésunate', admin.id]
        );
        await conn.execute('INSERT INTO details_commande (commande_id, produit_id, quantite, prix_unitaire) VALUES (?, ?, 50, 1700), (?, ?, 40, 4800)',
            [order.insertId, products[9].id, order.insertId, products[5].id]);
    });

    console.log('✅ Données de démonstration ajoutées (comptes : pharmacien / vendeur, mot de passe demo12345)');
    return true;
}

module.exports = { seedDemo };

// Lancement direct : node db/seed-demo.js
if (require.main === module) {
    const { initDB, initTables, seedAdmin, closePool } = require('./mysql');
    (async () => {
        await initDB();
        await initTables();
        await seedAdmin();
        const done = await seedDemo();
        if (!done) console.log('ℹ️  La base contient déjà des produits : rien n\'a été ajouté.');
        await closePool();
    })().catch(error => {
        console.error('❌', error.message);
        process.exit(1);
    });
}
