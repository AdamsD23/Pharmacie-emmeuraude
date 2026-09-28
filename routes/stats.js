/**
 * Routes Statistiques (tableau de bord et rapports)
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const { query } = require('../db/mysql');
const { asyncHandler } = require('../middleware/errorHandler');

const DONE = "statut = 'terminee'";

/**
 * GET /api/stats — indicateurs du tableau de bord
 */
router.get('/', asyncHandler(async (req, res) => {
    const [[ventes], [produits], [clients], [commandes]] = await Promise.all([
        query(`SELECT
                 COUNT(*) AS total_sales,
                 COALESCE(SUM(total), 0) AS total_revenue,
                 COALESCE(SUM(CASE WHEN DATE(date) = CURDATE() THEN total END), 0) AS today_revenue,
                 COUNT(CASE WHEN DATE(date) = CURDATE() THEN 1 END) AS today_sales,
                 COALESCE(SUM(CASE WHEN DATE(date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN total END), 0) AS yesterday_revenue,
                 COALESCE(SUM(CASE WHEN YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE()) THEN total END), 0) AS month_revenue
               FROM ventes WHERE ${DONE}`),
        query(`SELECT
                 COUNT(*) AS total_products,
                 COUNT(CASE WHEN stock <= stock_min THEN 1 END) AS low_stock,
                 COUNT(CASE WHEN stock = 0 THEN 1 END) AS out_of_stock,
                 COUNT(CASE WHEN date_expiration < CURDATE() THEN 1 END) AS expired_products,
                 COUNT(CASE WHEN date_expiration >= CURDATE()
                             AND date_expiration < DATE_ADD(CURDATE(), INTERVAL ${config.EXPIRY_WARNING_DAYS} DAY) THEN 1 END) AS expiring_soon,
                 COALESCE(SUM(stock * prix), 0) AS stock_value
               FROM produits`),
        query('SELECT COUNT(*) AS total_clients FROM clients'),
        query("SELECT COUNT(*) AS pending_orders FROM commandes WHERE statut IN ('en_attente', 'en_cours')")
    ]);

    res.json({ ...ventes, ...produits, ...clients, ...commandes, expiry_warning_days: config.EXPIRY_WARNING_DAYS });
}));

/**
 * GET /api/stats/daily?jours=7 — chiffre d'affaires jour par jour (jours sans vente inclus)
 */
router.get('/daily', asyncHandler(async (req, res) => {
    const jours = Math.min(Math.max(parseInt(req.query.jours, 10) || 7, 1), 90);
    const rows = await query(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS jour, COUNT(*) AS nb_ventes, SUM(total) AS chiffre_affaires
         FROM ventes
         WHERE ${DONE} AND date >= DATE_SUB(CURDATE(), INTERVAL ${jours - 1} DAY)
         GROUP BY jour`
    );
    const byDay = new Map(rows.map(r => [r.jour, r]));

    const result = [];
    const today = new Date();
    for (let i = jours - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
        const key = d.toISOString().slice(0, 10);
        const row = byDay.get(key);
        result.push({ jour: key, nb_ventes: row ? row.nb_ventes : 0, chiffre_affaires: row ? Number(row.chiffre_affaires) : 0 });
    }
    res.json(result);
}));

/**
 * GET /api/stats/top-products?jours=30&limit=5 — produits les plus vendus
 */
router.get('/top-products', asyncHandler(async (req, res) => {
    const jours = Math.min(Math.max(parseInt(req.query.jours, 10) || 30, 1), 365);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);
    res.json(await query(
        `SELECT d.produit_id, COALESCE(p.nom, d.produit_nom) AS nom,
                SUM(d.quantite) AS quantite, SUM(d.sous_total) AS chiffre_affaires
         FROM details_vente d
         JOIN ventes v ON v.id = d.vente_id AND v.${DONE}
         LEFT JOIN produits p ON p.id = d.produit_id
         WHERE v.date >= DATE_SUB(CURDATE(), INTERVAL ${jours - 1} DAY)
         GROUP BY d.produit_id, nom
         ORDER BY quantite DESC
         LIMIT ${limit}`
    ));
}));

/**
 * GET /api/stats/payments?jours=30 — répartition par mode de paiement
 */
router.get('/payments', asyncHandler(async (req, res) => {
    const jours = Math.min(Math.max(parseInt(req.query.jours, 10) || 30, 1), 365);
    res.json(await query(
        `SELECT mode_paiement, COUNT(*) AS nb_ventes, SUM(total) AS chiffre_affaires
         FROM ventes
         WHERE ${DONE} AND date >= DATE_SUB(CURDATE(), INTERVAL ${jours - 1} DAY)
         GROUP BY mode_paiement ORDER BY chiffre_affaires DESC`
    ));
}));

module.exports = router;
