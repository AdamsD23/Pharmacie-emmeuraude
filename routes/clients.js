/**
 * Routes Clients
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db/mysql');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authorizeRole } = require('../middleware/auth');
const { validateOrThrow, parseId } = require('../utils/validate');

const SCHEMA = {
    nom: { type: 'string', required: true, max: 100, label: 'Nom' },
    prenom: { type: 'string', max: 100, label: 'Prénom' },
    telephone: { type: 'phone', label: 'Téléphone' },
    email: { type: 'email', max: 100, label: 'Email' },
    adresse: { type: 'string', max: 500, label: 'Adresse' }
};

// Chaque client avec son nombre d'achats et le total dépensé (ventes annulées exclues)
const SELECT = `
    SELECT c.*,
           COUNT(v.id) AS nb_achats,
           COALESCE(SUM(v.total), 0) AS total_achats,
           MAX(v.date) AS dernier_achat
    FROM clients c
    LEFT JOIN ventes v ON v.client_id = c.id AND v.statut = 'terminee'`;

async function findClient(id) {
    const rows = await query(`${SELECT} WHERE c.id = ? GROUP BY c.id`, [id]);
    if (!rows[0]) throw new AppError('Client introuvable', 404, 'CLIENT_NOT_FOUND');
    return rows[0];
}

router.get('/', asyncHandler(async (req, res) => {
    const params = [];
    let where = '';
    if (req.query.q) {
        const like = `%${String(req.query.q).slice(0, 100)}%`;
        where = 'WHERE c.nom LIKE ? OR c.prenom LIKE ? OR c.telephone LIKE ? OR c.email LIKE ?';
        params.push(like, like, like, like);
    }
    res.json(await query(`${SELECT} ${where} GROUP BY c.id ORDER BY c.nom, c.prenom`, params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const client = await findClient(id);
    client.achats = await query(
        `SELECT v.id, v.date, v.total, v.statut, v.mode_paiement,
                (SELECT COUNT(*) FROM details_vente d WHERE d.vente_id = v.id) AS nb_articles
         FROM ventes v WHERE v.client_id = ? ORDER BY v.date DESC LIMIT 50`,
        [id]
    );
    res.json(client);
}));

router.post('/', asyncHandler(async (req, res) => {
    const d = validateOrThrow(req.body, SCHEMA);
    const result = await query(
        'INSERT INTO clients (nom, prenom, telephone, email, adresse) VALUES (?, ?, ?, ?, ?)',
        [d.nom, d.prenom, d.telephone, d.email, d.adresse]
    );
    res.status(201).json(await findClient(result.insertId));
}));

router.put('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await findClient(id);
    const d = validateOrThrow(req.body, SCHEMA);
    await query(
        'UPDATE clients SET nom = ?, prenom = ?, telephone = ?, email = ?, adresse = ? WHERE id = ?',
        [d.nom, d.prenom, d.telephone, d.email, d.adresse, id]
    );
    res.json(await findClient(id));
}));

router.delete('/:id', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const result = await query('DELETE FROM clients WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw new AppError('Client introuvable', 404, 'CLIENT_NOT_FOUND');
    res.json({ message: 'Client supprimé (ses ventes sont conservées)' });
}));

module.exports = router;
