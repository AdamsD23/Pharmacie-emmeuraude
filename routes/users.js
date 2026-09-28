/**
 * Gestion des comptes utilisateurs (réservé à l'administrateur)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const config = require('../config');
const { query } = require('../db/mysql');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authorizeRole } = require('../middleware/auth');
const { validateOrThrow, parseId } = require('../utils/validate');

const ROLES = ['admin', 'pharmacien', 'vendeur'];
const FIELDS = 'id, username, nom_complet, email, role, actif, derniere_connexion, created_at';

router.use(authorizeRole('admin'));

router.get('/', asyncHandler(async (req, res) => {
    res.json(await query(`SELECT ${FIELDS} FROM users ORDER BY username`));
}));

router.post('/', asyncHandler(async (req, res) => {
    const data = validateOrThrow(req.body, {
        username: { type: 'string', required: true, min: config.USERNAME_MIN_LENGTH, max: 50, pattern: /^[a-zA-Z0-9_.-]+$/, label: 'Identifiant' },
        password: { type: 'string', required: true, min: config.PASSWORD_MIN_LENGTH, max: 200, label: 'Mot de passe' },
        nom_complet: { type: 'string', max: 150, label: 'Nom complet' },
        email: { type: 'email', max: 100, label: 'Email' },
        role: { type: 'enum', values: ROLES, required: true, label: 'Rôle' }
    });

    const result = await query(
        'INSERT INTO users (username, password, nom_complet, email, role) VALUES (?, ?, ?, ?, ?)',
        [data.username, await bcrypt.hash(data.password, 10), data.nom_complet, data.email, data.role]
    );
    const users = await query(`SELECT ${FIELDS} FROM users WHERE id = ?`, [result.insertId]);
    res.status(201).json(users[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = validateOrThrow(req.body, {
        nom_complet: { type: 'string', max: 150, label: 'Nom complet' },
        email: { type: 'email', max: 100, label: 'Email' },
        role: { type: 'enum', values: ROLES, required: true, label: 'Rôle' },
        actif: { type: 'boolean', default: true },
        password: { type: 'string', min: config.PASSWORD_MIN_LENGTH, max: 200, label: 'Mot de passe' }
    });

    if (id === req.user.id && (data.role !== 'admin' || !data.actif)) {
        throw new AppError('Vous ne pouvez pas retirer vos propres droits administrateur', 400, 'SELF_LOCKOUT');
    }

    const result = await query(
        'UPDATE users SET nom_complet = ?, email = ?, role = ?, actif = ? WHERE id = ?',
        [data.nom_complet, data.email, data.role, data.actif, id]
    );
    if (result.affectedRows === 0) throw new AppError('Utilisateur introuvable', 404, 'NOT_FOUND');

    if (data.password) {
        await query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(data.password, 10), id]);
    }

    const users = await query(`SELECT ${FIELDS} FROM users WHERE id = ?`, [id]);
    res.json(users[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === req.user.id) throw new AppError('Vous ne pouvez pas supprimer votre propre compte', 400, 'SELF_DELETE');

    const result = await query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw new AppError('Utilisateur introuvable', 404, 'NOT_FOUND');
    res.json({ message: 'Utilisateur supprimé' });
}));

module.exports = router;
