/**
 * Routes Commandes fournisseurs (réapprovisionnement)
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const { query, transaction } = require('../db/mysql');
const Logger = require('../utils/logger');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authorizeRole } = require('../middleware/auth');
const { validateOrThrow, parseId } = require('../utils/validate');

const logger = new Logger({ level: config.LOG_LEVEL });

const STATUTS = ['en_attente', 'en_cours', 'livree', 'annulee'];

const SELECT = `
    SELECT c.*, f.nom AS fournisseur_nom, f.telephone AS fournisseur_telephone,
           (SELECT COALESCE(SUM(d.quantite), 0) FROM details_commande d WHERE d.commande_id = c.id) AS nb_articles
    FROM commandes c
    LEFT JOIN fournisseurs f ON f.id = c.fournisseur_id`;

async function findOrder(id) {
    const rows = await query(`${SELECT} WHERE c.id = ?`, [id]);
    const order = rows[0];
    if (!order) throw new AppError('Commande introuvable', 404, 'ORDER_NOT_FOUND');
    order.lignes = await query(
        `SELECT d.id, d.produit_id, p.nom AS produit_nom, d.quantite, d.prix_unitaire,
                d.quantite * d.prix_unitaire AS sous_total
         FROM details_commande d LEFT JOIN produits p ON p.id = d.produit_id
         WHERE d.commande_id = ? ORDER BY d.id`,
        [id]
    );
    return order;
}

router.use(authorizeRole('pharmacien'));

router.get('/', asyncHandler(async (req, res) => {
    const params = [];
    let where = '';
    if (STATUTS.includes(req.query.statut)) {
        where = 'WHERE c.statut = ?';
        params.push(req.query.statut);
    }
    res.json(await query(`${SELECT} ${where} ORDER BY c.date_commande DESC, c.id DESC`, params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await findOrder(parseId(req.params.id)));
}));

/**
 * POST /api/orders
 * { fournisseur_id, date_livraison?, notes?, lignes: [{ produit_id, quantite, prix_unitaire }] }
 */
router.post('/', asyncHandler(async (req, res) => {
    const d = validateOrThrow(req.body, {
        fournisseur_id: { type: 'int', required: true, min: 1, label: 'Fournisseur' },
        date_livraison: { type: 'date', label: 'Date de livraison prévue' },
        notes: { type: 'string', max: 1000, label: 'Notes' }
    });
    if (!Array.isArray(req.body.lignes) || req.body.lignes.length === 0) {
        throw new AppError('Ajoutez au moins un produit à la commande', 400, 'EMPTY_ORDER');
    }
    const lignes = req.body.lignes.slice(0, 200).map(raw => validateOrThrow(raw, {
        produit_id: { type: 'int', required: true, min: 1, label: 'Produit' },
        quantite: { type: 'int', required: true, min: 1, max: 100000, label: 'Quantité' },
        prix_unitaire: { type: 'number', required: true, min: 0, max: 100000000, label: 'Prix d\'achat' }
    }));

    const orderId = await transaction(async (conn) => {
        const [suppliers] = await conn.execute('SELECT id FROM fournisseurs WHERE id = ?', [d.fournisseur_id]);
        if (!suppliers.length) throw new AppError('Fournisseur introuvable', 400, 'SUPPLIER_NOT_FOUND');

        const total = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire, 0);
        const [result] = await conn.execute(
            `INSERT INTO commandes (fournisseur_id, statut, total, date_livraison, notes, cree_par)
             VALUES (?, 'en_attente', ?, ?, ?, ?)`,
            [d.fournisseur_id, total, d.date_livraison, d.notes, req.user.id]
        );
        for (const l of lignes) {
            const [products] = await conn.execute('SELECT id FROM produits WHERE id = ?', [l.produit_id]);
            if (!products.length) throw new AppError(`Produit n°${l.produit_id} introuvable`, 400, 'PRODUCT_NOT_FOUND');
            await conn.execute(
                'INSERT INTO details_commande (commande_id, produit_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)',
                [result.insertId, l.produit_id, l.quantite, l.prix_unitaire]
            );
        }
        return result.insertId;
    });

    logger.info('Commande créée', { orderId, userId: req.user.id });
    res.status(201).json(await findOrder(orderId));
}));

/**
 * PUT /api/orders/:id/statut { statut }
 * Passer une commande à "livree" ajoute automatiquement les quantités au stock (une seule fois).
 */
router.put('/:id/statut', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { statut } = validateOrThrow(req.body, {
        statut: { type: 'enum', values: STATUTS, required: true, label: 'Statut' }
    });

    await transaction(async (conn) => {
        const [rows] = await conn.execute('SELECT * FROM commandes WHERE id = ? FOR UPDATE', [id]);
        const order = rows[0];
        if (!order) throw new AppError('Commande introuvable', 404, 'ORDER_NOT_FOUND');
        if (order.statut === 'livree' && statut !== 'livree') {
            throw new AppError('Une commande livrée ne peut plus changer de statut', 400, 'ALREADY_DELIVERED');
        }

        if (statut === 'livree' && !order.stock_ajoute) {
            const [details] = await conn.execute('SELECT produit_id, quantite FROM details_commande WHERE commande_id = ?', [id]);
            for (const detail of details) {
                await conn.execute('UPDATE produits SET stock = stock + ? WHERE id = ?', [detail.quantite, detail.produit_id]);
            }
            await conn.execute(
                "UPDATE commandes SET statut = 'livree', stock_ajoute = TRUE, date_livraison = COALESCE(date_livraison, CURDATE()) WHERE id = ?",
                [id]
            );
        } else {
            await conn.execute('UPDATE commandes SET statut = ? WHERE id = ?', [statut, id]);
        }
    });

    logger.info('Statut de commande modifié', { orderId: id, statut, userId: req.user.id });
    res.json(await findOrder(id));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const order = await findOrder(id);
    if (order.statut === 'livree') {
        throw new AppError('Une commande livrée ne peut pas être supprimée (elle a modifié le stock)', 400, 'ALREADY_DELIVERED');
    }
    await query('DELETE FROM commandes WHERE id = ?', [id]);
    res.json({ message: 'Commande supprimée' });
}));

module.exports = router;
