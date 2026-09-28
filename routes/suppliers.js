/**
 * Routes Fournisseurs
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db/mysql');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authorizeRole } = require('../middleware/auth');
const { validateOrThrow, parseId } = require('../utils/validate');

const SCHEMA = {
    nom: { type: 'string', required: true, max: 100, label: 'Nom' },
    telephone: { type: 'phone', label: 'Téléphone' },
    email: { type: 'email', max: 100, label: 'Email' },
    adresse: { type: 'string', max: 500, label: 'Adresse' }
};

const SELECT = `
    SELECT f.*,
           (SELECT COUNT(*) FROM produits p WHERE p.fournisseur_id = f.id) AS nb_produits,
           (SELECT COUNT(*) FROM commandes c WHERE c.fournisseur_id = f.id) AS nb_commandes,
           (SELECT MAX(c.date_commande) FROM commandes c WHERE c.fournisseur_id = f.id) AS derniere_commande
    FROM fournisseurs f`;

async function findSupplier(id) {
    const rows = await query(`${SELECT} WHERE f.id = ?`, [id]);
    if (!rows[0]) throw new AppError('Fournisseur introuvable', 404, 'SUPPLIER_NOT_FOUND');
    return rows[0];
}

router.get('/', asyncHandler(async (req, res) => {
    res.json(await query(`${SELECT} ORDER BY f.nom`));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await findSupplier(parseId(req.params.id)));
}));

router.post('/', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const d = validateOrThrow(req.body, SCHEMA);
    const result = await query(
        'INSERT INTO fournisseurs (nom, telephone, email, adresse) VALUES (?, ?, ?, ?)',
        [d.nom, d.telephone, d.email, d.adresse]
    );
    res.status(201).json(await findSupplier(result.insertId));
}));

router.put('/:id', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await findSupplier(id);
    const d = validateOrThrow(req.body, SCHEMA);
    await query(
        'UPDATE fournisseurs SET nom = ?, telephone = ?, email = ?, adresse = ? WHERE id = ?',
        [d.nom, d.telephone, d.email, d.adresse, id]
    );
    res.json(await findSupplier(id));
}));

router.delete('/:id', authorizeRole('pharmacien'), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const supplier = await findSupplier(id);
    if (supplier.nb_commandes > 0) {
        throw new AppError('Ce fournisseur a des commandes enregistrées : il ne peut pas être supprimé.', 409, 'IN_USE');
    }
    await query('DELETE FROM fournisseurs WHERE id = ?', [id]);
    res.json({ message: 'Fournisseur supprimé' });
}));

module.exports = router;
