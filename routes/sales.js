/**
 * Routes Ventes (caisse)
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

const PAIEMENTS = ['especes', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'carte'];

const SELECT = `
    SELECT v.*,
           TRIM(CONCAT(COALESCE(c.nom, ''), ' ', COALESCE(c.prenom, ''))) AS client_nom,
           c.telephone AS client_telephone,
           COALESCE(u.nom_complet, u.username) AS vendeur_nom,
           (SELECT COALESCE(SUM(d.quantite), 0) FROM details_vente d WHERE d.vente_id = v.id) AS nb_articles
    FROM ventes v
    LEFT JOIN clients c ON c.id = v.client_id
    LEFT JOIN users u ON u.id = v.vendeur_id`;

async function findSale(id) {
    const rows = await query(`${SELECT} WHERE v.id = ?`, [id]);
    const sale = rows[0];
    if (!sale) throw new AppError('Vente introuvable', 404, 'SALE_NOT_FOUND');
    sale.lignes = await query(
        `SELECT d.id, d.produit_id, COALESCE(d.produit_nom, p.nom, 'Produit supprimé') AS produit_nom,
                d.quantite, d.prix_unitaire, d.sous_total
         FROM details_vente d LEFT JOIN produits p ON p.id = d.produit_id
         WHERE d.vente_id = ? ORDER BY d.id`,
        [id]
    );
    return sale;
}

/**
 * GET /api/sales?du=AAAA-MM-JJ&au=AAAA-MM-JJ&statut=terminee|annulee&limit=200
 */
router.get('/', asyncHandler(async (req, res) => {
    const where = [];
    const params = [];
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;

    if (dateRe.test(req.query.du || '')) { where.push('DATE(v.date) >= ?'); params.push(req.query.du); }
    if (dateRe.test(req.query.au || '')) { where.push('DATE(v.date) <= ?'); params.push(req.query.au); }
    if (['terminee', 'annulee'].includes(req.query.statut)) { where.push('v.statut = ?'); params.push(req.query.statut); }
    if (req.query.client_id) { where.push('v.client_id = ?'); params.push(parseId(req.query.client_id)); }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
    const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY v.date DESC, v.id DESC LIMIT ${limit}`;
    res.json(await query(sql, params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await findSale(parseId(req.params.id)));
}));

/**
 * POST /api/sales
 * { client_id?, mode_paiement, montant_recu?, lignes: [{ produit_id, quantite }] }
 */
router.post('/', asyncHandler(async (req, res) => {
    const d = validateOrThrow(req.body, {
        client_id: { type: 'int', min: 1, label: 'Client' },
        mode_paiement: { type: 'enum', values: PAIEMENTS, default: 'especes', label: 'Mode de paiement' },
        montant_recu: { type: 'number', min: 0, max: 100000000, label: 'Montant reçu' }
    });

    if (!Array.isArray(req.body.lignes) || req.body.lignes.length === 0) {
        throw new AppError('Le panier est vide', 400, 'EMPTY_CART');
    }
    if (req.body.lignes.length > 100) throw new AppError('Trop d\'articles dans une seule vente', 400, 'TOO_MANY_LINES');

    // Regroupe les lignes d'un même produit
    const quantities = new Map();
    for (const raw of req.body.lignes) {
        const line = validateOrThrow(raw, {
            produit_id: { type: 'int', required: true, min: 1, label: 'Produit' },
            quantite: { type: 'int', required: true, min: 1, max: 10000, label: 'Quantité' }
        });
        quantities.set(line.produit_id, (quantities.get(line.produit_id) || 0) + line.quantite);
    }

    const saleId = await transaction(async (conn) => {
        if (d.client_id) {
            const [clients] = await conn.execute('SELECT id FROM clients WHERE id = ?', [d.client_id]);
            if (!clients.length) throw new AppError('Client introuvable', 400, 'CLIENT_NOT_FOUND');
        }

        // Verrouille les produits pour éviter qu'une autre caisse vende le même stock en même temps
        const lines = [];
        for (const [produitId, quantite] of quantities) {
            const [rows] = await conn.execute('SELECT id, nom, prix, stock FROM produits WHERE id = ? FOR UPDATE', [produitId]);
            const product = rows[0];
            if (!product) throw new AppError(`Produit n°${produitId} introuvable`, 400, 'PRODUCT_NOT_FOUND');
            if (product.stock < quantite) {
                throw new AppError(`Stock insuffisant pour « ${product.nom} » (disponible : ${product.stock})`, 400, 'INSUFFICIENT_STOCK');
            }
            lines.push({ product, quantite, sousTotal: Math.round(Number(product.prix) * quantite * 100) / 100 });
        }

        const total = lines.reduce((sum, l) => sum + l.sousTotal, 0);
        if (d.mode_paiement === 'especes' && d.montant_recu !== null && d.montant_recu < total) {
            throw new AppError('Le montant reçu est inférieur au total', 400, 'INSUFFICIENT_PAYMENT');
        }

        const [result] = await conn.execute(
            `INSERT INTO ventes (client_id, vendeur_id, total, statut, mode_paiement, montant_recu)
             VALUES (?, ?, ?, 'terminee', ?, ?)`,
            [d.client_id, req.user.id, total, d.mode_paiement, d.montant_recu]
        );

        for (const l of lines) {
            await conn.execute(
                `INSERT INTO details_vente (vente_id, produit_id, produit_nom, quantite, prix_unitaire, sous_total)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [result.insertId, l.product.id, l.product.nom, l.quantite, l.product.prix, l.sousTotal]
            );
            await conn.execute('UPDATE produits SET stock = stock - ? WHERE id = ?', [l.quantite, l.product.id]);
        }
        return result.insertId;
    });

    logger.info('Vente enregistrée', { saleId, userId: req.user.id });
    res.status(201).json(await findSale(saleId));
}));

/**
 * POST /api/sales/:id/annuler — annule une vente et remet les produits en stock
 */
router.post('/:id/annuler', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    await transaction(async (conn) => {
        const [rows] = await conn.execute('SELECT id, statut FROM ventes WHERE id = ? FOR UPDATE', [id]);
        if (!rows[0]) throw new AppError('Vente introuvable', 404, 'SALE_NOT_FOUND');
        if (rows[0].statut === 'annulee') throw new AppError('Cette vente est déjà annulée', 400, 'ALREADY_CANCELLED');

        const [details] = await conn.execute('SELECT produit_id, quantite FROM details_vente WHERE vente_id = ?', [id]);
        for (const detail of details) {
            if (detail.produit_id) {
                await conn.execute('UPDATE produits SET stock = stock + ? WHERE id = ?', [detail.quantite, detail.produit_id]);
            }
        }
        await conn.execute(
            "UPDATE ventes SET statut = 'annulee', annulee_le = UTC_TIMESTAMP(), annulee_par = ? WHERE id = ?",
            [req.user.id, id]
        );
    });

    logger.info('Vente annulée', { saleId: id, userId: req.user.id });
    res.json(await findSale(id));
}));

module.exports = router;
