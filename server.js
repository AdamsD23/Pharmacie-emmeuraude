/**
 * Serveur principal Pharmacie Émeraude
 * API REST (Express + MySQL) et interface web (dossier public/)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('./config');
const Logger = require('./utils/logger');
const { initDB, initTables, seedAdmin, closePool } = require('./db/mysql');
const { seedDemo } = require('./db/seed-demo');

const RateLimiter = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');
const { sanitizeBody } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

const logger = new Logger({ level: config.LOG_LEVEL });

function createApp() {
    const app = express();

    // Derrière l'hébergeur (Render…), l'IP réelle du visiteur est dans X-Forwarded-For
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    // En-têtes de sécurité de base
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'same-origin');
        next();
    });

    if (config.CORS_ORIGIN) app.use('/api', cors({ origin: config.CORS_ORIGIN }));
    app.use(express.json({ limit: '200kb' }));
    app.use(sanitizeBody);

    // Interface web : uniquement le dossier public/ (le code serveur et .env ne sont jamais exposés)
    app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], dotfiles: 'deny' }));

    // Santé du service (utilisé par l'hébergeur)
    // "demo" permet à la page de connexion d'afficher les comptes de démonstration
    app.get('/api/health', (req, res) => res.json({ status: 'ok', demo: config.SEED_DEMO }));

    // Connexion : limite stricte contre les attaques par force brute
    const loginLimiter = new RateLimiter({ windowMs: config.LOGIN_RATE_LIMIT.WINDOW_MS, maxRequests: config.LOGIN_RATE_LIMIT.MAX_REQUESTS });
    app.use('/api/auth/login', loginLimiter.middleware());
    app.use('/api', new RateLimiter({ windowMs: config.RATE_LIMIT.WINDOW_MS, maxRequests: config.RATE_LIMIT.MAX_REQUESTS }).middleware());

    app.use('/api/auth', require('./routes/auth'));

    // Toutes les autres routes exigent d'être connecté
    app.use('/api', authenticateToken);
    app.use('/api/users', require('./routes/users'));
    app.use('/api/products', require('./routes/products'));
    app.use('/api/sales', require('./routes/sales'));
    app.use('/api/clients', require('./routes/clients'));
    app.use('/api/suppliers', require('./routes/suppliers'));
    app.use('/api/orders', require('./routes/orders'));
    app.use('/api/stats', require('./routes/stats'));
    app.use('/api/settings', require('./routes/settings'));

    app.use('/api', (req, res) => {
        res.status(404).json({ error: 'Route API introuvable', code: 'NOT_FOUND' });
    });

    // Toute autre adresse : retour à la page de connexion
    app.use((req, res) => {
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.use(errorHandler);
    return app;
}

async function start() {
    try {
        await initDB();
        await initTables();
        await seedAdmin();
        if (config.SEED_DEMO) await seedDemo();

        const app = createApp();
        const server = app.listen(config.PORT, () => {
            logger.info('Serveur démarré', { port: config.PORT, nodeEnv: config.NODE_ENV });
            console.log('\n=== PHARMACIE ÉMERAUDE ===');
            console.log(`✅ Application : http://localhost:${config.PORT}`);
            console.log('🔐 Compte : admin (mot de passe défini par ADMIN_PASSWORD, admin123 par défaut)');
            console.log('==========================\n');
        });

        const shutdown = async () => {
            logger.info('Arrêt du serveur…');
            server.close();
            await closePool();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (error) {
        logger.error('Erreur au démarrage du serveur', error);
        console.error('❌ Impossible de démarrer :', error.message);
        process.exit(1);
    }
}

module.exports = { createApp };

if (require.main === module) start();
