/**
 * Gestion de la base de données SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config');
const Logger = require('../utils/logger');

const logger = new Logger({ level: config.LOG_LEVEL });

class Database {
    constructor(dbPath = config.DB_PATH) {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * Établit la connexion
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    logger.error('Erreur de connexion à la BD', err);
                    reject(err);
                } else {
                    logger.info('Connecté à la base de données SQLite');
                    // Activer les foreign keys
                    this.db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) logger.warn('Impossible d\'activer les clés étrangères');
                    });
                    resolve();
                }
            });
        });
    }

    /**
     * Exécute une requête et retourne un seul résultat
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    logger.error('Erreur requête GET', err, { sql });
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Exécute une requête et retourne tous les résultats
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    logger.error('Erreur requête ALL', err, { sql });
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Exécute une requête (INSERT, UPDATE, DELETE)
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    logger.error('Erreur requête RUN', err, { sql });
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Transaction
     */
    transaction(callback) {
        return new Promise(async (resolve, reject) => {
            try {
                this.db.run('BEGIN TRANSACTION', async (err) => {
                    if (err) throw err;

                    try {
                        await callback();
                        this.db.run('COMMIT', (err) => {
                            if (err) throw err;
                            resolve();
                        });
                    } catch (innerErr) {
                        this.db.run('ROLLBACK', () => {
                            reject(innerErr);
                        });
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Ferme la connexion
     */
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        logger.error('Erreur fermeture BD', err);
                        reject(err);
                    } else {
                        logger.info('Connexion à la BD fermée');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// Singleton global
let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new Database();
    }
    return dbInstance;
}

module.exports = {
    Database,
    getDatabase
};
