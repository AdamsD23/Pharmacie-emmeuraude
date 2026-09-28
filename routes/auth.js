/**
 * Routes d'authentification et du compte connecté
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const config = require('../config');
const { query } = require('../db/mysql');
const Logger = require('../utils/logger');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validateOrThrow } = require('../utils/validate');

const logger = new Logger({ level: config.LOG_LEVEL });

function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        nom_complet: user.nom_complet,
        email: user.email,
        role: user.role,
        derniere_connexion: user.derniere_connexion,
        created_at: user.created_at
    };
}

/**
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = validateOrThrow(req.body, {
        username: { type: 'string', required: true, max: 50, label: 'Identifiant' },
        password: { type: 'string', required: true, max: 200, label: 'Mot de passe' }
    });

    const users = await query('SELECT * FROM users WHERE username = ?', [username]);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
        logger.warn('Tentative de connexion échouée', { username });
        throw new AppError('Identifiant ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
    }
    if (!user.actif) {
        throw new AppError('Ce compte est désactivé. Contactez l\'administrateur.', 403, 'ACCOUNT_DISABLED');
    }

    const token = jwt.sign({ id: user.id }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRY });
    await query('UPDATE users SET derniere_connexion = UTC_TIMESTAMP() WHERE id = ?', [user.id]);
    logger.info('Connexion réussie', { username, userId: user.id });

    res.json({ token, user: publicUser(user) });
}));

/**
 * GET /api/auth/me — profil de l'utilisateur connecté
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const users = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(publicUser(users[0]));
}));

/**
 * PUT /api/auth/me — mise à jour de ses informations
 */
router.put('/me', authenticateToken, asyncHandler(async (req, res) => {
    const data = validateOrThrow(req.body, {
        nom_complet: { type: 'string', max: 150, label: 'Nom complet' },
        email: { type: 'email', max: 100, label: 'Email' }
    });
    await query('UPDATE users SET nom_complet = ?, email = ? WHERE id = ?', [data.nom_complet, data.email, req.user.id]);
    const users = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(publicUser(users[0]));
}));

/**
 * PUT /api/auth/password — changement de son mot de passe
 */
router.put('/password', authenticateToken, asyncHandler(async (req, res) => {
    const { ancien, nouveau } = validateOrThrow(req.body, {
        ancien: { type: 'string', required: true, label: 'Mot de passe actuel' },
        nouveau: { type: 'string', required: true, min: config.PASSWORD_MIN_LENGTH, max: 200, label: 'Nouveau mot de passe' }
    });

    const users = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!(await bcrypt.compare(ancien, users[0].password))) {
        throw new AppError('Mot de passe actuel incorrect', 400, 'WRONG_PASSWORD');
    }

    await query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(nouveau, 10), req.user.id]);
    logger.info('Mot de passe modifié', { userId: req.user.id });
    res.json({ message: 'Mot de passe modifié' });
}));

module.exports = router;
