/**
 * Connexion MySQL pour Pharmacie Émeraude
 * Crée la base, les tables, applique les migrations et le compte admin.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../config');

let pool;

function connectionOptions(withDatabase = true) {
    return {
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        port: config.DB_PORT,
        ...(withDatabase && { database: config.DB_NAME }),
        ...(config.DB_SSL && {
            ssl: config.DB_SSL_CA ? { ca: config.DB_SSL_CA } : { rejectUnauthorized: true }
        }),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        // Dates renvoyées en texte ("2026-09-28 14:03:56") et DECIMAL en nombres
        dateStrings: true,
        decimalNumbers: true,
        timezone: 'Z'
    };
}

/**
 * Initialise la connexion (et crée la base si le compte en a le droit)
 */
async function initDB() {
    try {
        const connection = await mysql.createConnection(connectionOptions(false));
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await connection.end();
    } catch (error) {
        // Sur un hébergeur, la base existe souvent déjà et le compte ne peut pas en créer : on continue.
        console.warn(`⚠️  Création de la base ignorée : ${error.message}`);
    }

    pool = mysql.createPool(connectionOptions(true));
    await pool.query('SELECT 1');
    console.log(`✅ Connecté à MySQL (${config.DB_HOST}/${config.DB_NAME})`);
    return pool;
}

async function getPool() {
    if (!pool) await initDB();
    return pool;
}

/**
 * Exécute une requête SQL paramétrée et renvoie les lignes
 */
async function query(sql, params = []) {
    const p = await getPool();
    const [results] = await p.execute(sql, params);
    return results;
}

/**
 * Exécute une fonction dans une transaction
 */
async function transaction(fn) {
    const p = await getPool();
    const connection = await p.getConnection();
    try {
        await connection.beginTransaction();
        const result = await fn(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function addColumnIfMissing(connection, table, column, definition) {
    const [rows] = await connection.execute(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    if (rows.length === 0) {
        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    }
}

/**
 * Crée les tables et applique les migrations (sans perte de données)
 */
async function initTables() {
    const p = await getPool();
    const connection = await p.getConnection();

    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'pharmacien', 'vendeur') DEFAULT 'vendeur',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100),
                telephone VARCHAR(20),
                email VARCHAR(100),
                adresse TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS fournisseurs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                telephone VARCHAR(20),
                email VARCHAR(100),
                adresse TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS produits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(200) NOT NULL,
                description TEXT,
                prix DECIMAL(10, 2) NOT NULL,
                stock INT DEFAULT 0,
                stock_min INT DEFAULT 10,
                categorie VARCHAR(100),
                fournisseur_id INT,
                date_expiration DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ventes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT,
                vendeur_id INT,
                total DECIMAL(10, 2) NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                statut ENUM('en_cours', 'terminee', 'annulee') DEFAULT 'terminee',
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
                FOREIGN KEY (vendeur_id) REFERENCES users(id) ON DELETE SET NULL
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS details_vente (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vente_id INT NOT NULL,
                produit_id INT,
                quantite INT NOT NULL,
                prix_unitaire DECIMAL(10, 2) NOT NULL,
                sous_total DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS commandes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fournisseur_id INT NOT NULL,
                statut ENUM('en_attente', 'en_cours', 'livree', 'annulee') DEFAULT 'en_attente',
                total DECIMAL(10, 2),
                date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                date_livraison DATE,
                notes TEXT,
                FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE CASCADE
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS details_commande (
                id INT AUTO_INCREMENT PRIMARY KEY,
                commande_id INT NOT NULL,
                produit_id INT NOT NULL,
                quantite INT NOT NULL,
                prix_unitaire DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
                FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
            )`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS parametres (
                cle VARCHAR(50) PRIMARY KEY,
                valeur TEXT
            )`);

        // --- Migrations : colonnes ajoutées en v3 ---
        await addColumnIfMissing(connection, 'users', 'nom_complet', 'VARCHAR(150) NULL');
        await addColumnIfMissing(connection, 'users', 'email', 'VARCHAR(100) NULL');
        await addColumnIfMissing(connection, 'users', 'actif', 'BOOLEAN NOT NULL DEFAULT TRUE');
        await addColumnIfMissing(connection, 'users', 'derniere_connexion', 'DATETIME NULL');
        await addColumnIfMissing(connection, 'ventes', 'mode_paiement', "VARCHAR(30) NOT NULL DEFAULT 'especes'");
        await addColumnIfMissing(connection, 'ventes', 'montant_recu', 'DECIMAL(10, 2) NULL');
        await addColumnIfMissing(connection, 'ventes', 'annulee_le', 'DATETIME NULL');
        await addColumnIfMissing(connection, 'ventes', 'annulee_par', 'INT NULL');
        await addColumnIfMissing(connection, 'details_vente', 'produit_nom', 'VARCHAR(200) NULL');
        await addColumnIfMissing(connection, 'commandes', 'stock_ajoute', 'BOOLEAN NOT NULL DEFAULT FALSE');
        await addColumnIfMissing(connection, 'commandes', 'cree_par', 'INT NULL');

        console.log('✅ Tables MySQL prêtes');
    } finally {
        connection.release();
    }
}

/**
 * Crée l'utilisateur admin et les paramètres par défaut
 */
async function seedAdmin() {
    const existing = await query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (existing.length === 0) {
        const hashedPassword = await bcrypt.hash(config.ADMIN_PASSWORD, 10);
        await query(
            'INSERT INTO users (username, password, role, nom_complet) VALUES (?, ?, ?, ?)',
            ['admin', hashedPassword, 'admin', 'Administrateur']
        );
        console.log('✅ Utilisateur admin créé');
    }

    const defaults = {
        nom_pharmacie: 'Pharmacie Émeraude',
        adresse: 'Abidjan, Plateau',
        telephone: '+225 07 00 00 00 00',
        message_recu: 'Merci pour votre confiance. Prompt rétablissement !'
    };
    for (const [cle, valeur] of Object.entries(defaults)) {
        await query('INSERT IGNORE INTO parametres (cle, valeur) VALUES (?, ?)', [cle, valeur]);
    }
}

async function closePool() {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
}

module.exports = {
    initDB,
    getPool,
    query,
    transaction,
    initTables,
    seedAdmin,
    closePool
};
