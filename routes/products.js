/**
 * Routes Produits (stock)
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const { query } = require('../db/mysql');
const Logger = require('../utils/logger');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authorizeRole } = require('../middleware/auth');
const { validateOrThrow, parseId } = require('../utils/validate');

const logger = new Logger({ level: config.LOG_LEVEL });

const SCHEMA = {
    nom: { type: 'string', required: true, max: 200, label: 'Nom' },
    description: { type: 'string', max: 1000, label: 'Description' },
    prix: { type: 'number', required: true, min: 0, max: 100000000, label: 'Prix' },
    stock: { type: 'int', required: true, min: 0, max: 1000000, label: 'Stock' },
    stock_min: { type: 'int', min: 0, max: 100000, default: 10, label: 'Stock minimum' },
    categorie: { type: 'string', max: 100, label: 'Catégorie' },
    fournisseur_id: { type: 'int', min: 1, label: 'Fournisseur' },
    date_expiration: { type: 'date', label: 'Date d\'expiration' }
};

const SELECT = `
    SELECT p.*, f.nom AS fournisseur_nom,
           (p.stock <= p.stock_min) AS stock_faible,
           (p.date_expiration IS NOT NULL AND p.date_expiration < CURDATE()) AS expire,
           (p.date_expiration IS NOT NULL AND p.date_expiration >= CURDATE()
                AND p.date_expiration < DATE_ADD(CURDATE(), INTERVAL ${config.EXPIRY_WARNING_DAYS} DAY)) AS expire_bientot
    FROM produits p
    LEFT JOIN fournisseurs f ON f.id = p.fournisseur_id`;

async function findProduct(id) {
    const rows = await query(`${SELECT} WHERE p.id = ?`, [id]);
    if (!rows[0]) throw new AppError('Produit introuvable', 404, 'PRODUCT_NOT_FOUND');
    return rows[0];
}

/**
 * GET /api/products?q=&categorie=&alerte=stock|expiration
 */
router.get('/', asyncHandler(async (req, res) => {
    const where = [];
    const params = [];

    if (req.query.q) {
        where.push('(p.nom LIKE ? OR p.categorie LIKE ? OR p.description LIKE ?)');
        const like = `%${String(req.query.q).slice(0, 100)}%`;
        params.push(like, like, like);
    }
    if (req.query.categorie) {
        where.push('p.categorie = ?');
        params.push(String(req.query.categorie));
    }
    if (req.query.alerte === 'stock') where.push('p.stock <= p.stock_min');
    if (req.query.alerte === 'expiration') {
        where.push(`p.date_expiration IS NOT NULL AND p.date_expiration < DATE_ADD(CURDATE(), INTERVAL ${config.EXPIRY_WARNING_DAYS} DAY)`);
    }

    const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.nom ASC`;
    res.json(await query(sql, params));
}));

/**
 * GET /api/products/categories — liste des catégories utilisées
 */
router.get('/categories', asyncHandler(async (req, res) => {
    const rows = await query('SELECT DISTINCT categorie FROM produits WHERE categorie IS NOT NULL AND categorie <> \'\' ORDER BY categorie');
    res.json(rows.map(r => r.categorie));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await findProduct(parseId(req.params.id)));
}));

router.post('/', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const d = validateOrThrow(req.body, SCHEMA);
    const result = await query(
        `INSERT INTO produits (nom, description, prix, stock, stock_min, categorie, fournisseur_id, date_expiration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.nom, d.description, d.prix, d.stock, d.stock_min, d.categorie, d.fournisseur_id, d.date_expiration]
    );
    logger.info('Produit créé', { productId: result.insertId, userId: req.user.id });
    res.status(201).json(await findProduct(result.insertId));
}));

router.put('/:id', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await findProduct(id);
    const d = validateOrThrow(req.body, SCHEMA);
    await query(
        `UPDATE produits SET nom = ?, description = ?, prix = ?, stock = ?, stock_min = ?, categorie = ?,
                fournisseur_id = ?, date_expiration = ?
         WHERE id = ?`,
        [d.nom, d.description, d.prix, d.stock, d.stock_min, d.categorie, d.fournisseur_id, d.date_expiration, id]
    );
    logger.info('Produit modifié', { productId: id, userId: req.user.id });
    res.json(await findProduct(id));
}));

/**
 * PATCH /api/products/:id/stock — ajustement rapide (+/-) du stock
 */
router.patch('/:id/stock', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { variation } = validateOrThrow(req.body, {
        variation: { type: 'int', required: true, min: -1000000, max: 1000000, label: 'Variation' }
    });
    const result = await query('UPDATE produits SET stock = stock + ? WHERE id = ? AND stock + ? >= 0', [variation, id, variation]);
    if (result.affectedRows === 0) {
        await findProduct(id);
        throw new AppError('Le stock ne peut pas devenir négatif', 400, 'NEGATIVE_STOCK');
    }
    res.json(await findProduct(id));
}));

router.delete('/:id', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await findProduct(id);
    const used = await query('SELECT COUNT(*) AS n FROM details_vente WHERE produit_id = ?', [id]);
    if (used[0].n > 0) {
        throw new AppError('Ce produit apparaît dans des ventes : mettez plutôt son stock à 0 pour garder l\'historique.', 409, 'IN_USE');
    }
    await query('DELETE FROM produits WHERE id = ?', [id]);
    logger.info('Produit supprimé', { productId: id, userId: req.user.id });
    res.json({ message: 'Produit supprimé' });
}));

module.exports = router;
