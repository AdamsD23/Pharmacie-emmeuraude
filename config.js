/**
 * Configuration centralisée pour l'application Pharmacie Émeraude
 */

require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const bool = (value, fallback = false) => value === undefined ? fallback : ['1', 'true', 'yes', 'oui'].includes(String(value).toLowerCase());

if (isProduction && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET doit être défini en production (variable d\'environnement).');
}

module.exports = {
    // Serveur
    PORT: process.env.PORT || 3000,
    NODE_ENV,
    IS_PRODUCTION: isProduction,

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    JWT_EXPIRY: '12h',

    // Base de données MySQL
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'pharmacie_emeraude',
    DB_PORT: Number(process.env.DB_PORT || 3306),
    // Les bases hébergées (Aiven, TiDB…) exigent une connexion chiffrée
    DB_SSL: bool(process.env.DB_SSL),
    DB_SSL_CA: process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined,

    // Compte administrateur créé au premier démarrage
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',

    // Données de démonstration (produits, clients, ventes…) si la base est vide
    SEED_DEMO: bool(process.env.SEED_DEMO, !isProduction),

    // Logging
    LOG_LEVEL: (process.env.LOG_LEVEL || 'info').toUpperCase(),

    // Rate Limiting (toutes les requêtes API)
    RATE_LIMIT: {
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10)
    },
    // Limite stricte sur les tentatives de connexion
    LOGIN_RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000,
        MAX_REQUESTS: 10
    },

    // CORS : l'interface est servie par le même serveur, donc aucune origine externe par défaut
    CORS_ORIGIN: process.env.CORS_ORIGIN || false,

    // Validation
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,

    // Métier
    EXPIRY_WARNING_DAYS: 60
};
