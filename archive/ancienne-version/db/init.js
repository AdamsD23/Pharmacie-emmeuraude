/**
 * Initialisation de la base de données
 */

const bcrypt = require('bcryptjs');
const config = require('../config');
const Logger = require('../utils/logger');
const { getDatabase } = require('./database');

const logger = new Logger({ level: config.LOG_LEVEL });

async function initDatabase() {
    const db = getDatabase();

    try {
        logger.info('Initialisation de la base de données...');

        // Table utilisateurs
        await db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'user',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table produits
        await db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            category TEXT,
            expiry_date DATE,
            supplier TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table ventes
        await db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            quantity INTEGER NOT NULL,
            total_price REAL NOT NULL,
            sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            customer_name TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )`);

        // Table fournisseurs
        await db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table clients
        await db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table commandes
        await db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            items TEXT,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
        )`);

        // Table pharmacies de garde
        await db.run(`CREATE TABLE IF NOT EXISTS pharmacies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            phone TEXT NOT NULL,
            schedule TEXT,
            is_24h INTEGER DEFAULT 0,
            emergency_contact TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Créer utilisateur admin par défaut
        const hashedPassword = bcrypt.hashSync(config.DEMO_ADMIN_PASSWORD, 10);
        await db.run(
            `INSERT OR IGNORE INTO users (username, password, email, role) 
             VALUES (?, ?, ?, ?)`,
            ['admin', hashedPassword, 'admin@pharmacie-emeraude.com', 'admin']
        );

        logger.info('Tables créées avec succès');

        // Insérer données de démonstration
        if (config.ENABLE_DEMO_DATA) {
            await insertDemoData(db);
        }

        logger.info('Initialisation BD terminée');
    } catch (error) {
        logger.error('Erreur initialisation BD', error);
        throw error;
    }
}

async function insertDemoData(db) {
    try {
        logger.info('Insertion données de démonstration...');

        // Vérifier si données existent déjà
        const count = await db.get('SELECT COUNT(*) as count FROM products');
        if (count && count.count > 0) {
            logger.info('Produits déjà existants, vérification des nouvelles tables...');
        } else {
            // Insérer produits
            const products = [
                ['Paracétamol 500mg', 'Antalgique et antipyrétique', 2500, 42, 'Antalgique', '2025-12-01', 'PharmaPlus'],
                ['Amoxicilline 1g', 'Antibiotique large spectre', 4500, 5, 'Antibiotique', '2025-08-15', 'MediSupply'],
                ['Insuline Lantus', 'Insuline à action prolongée', 15000, 12, 'Diabète', '2025-10-20', 'DiabCare'],
                ['Ibuprofène 400mg', 'Anti-inflammatoire', 1800, 30, 'Anti-inflammatoire', '2026-01-10', 'PharmaPlus'],
                ['Vitamine C 1000mg', 'Complément alimentaire', 3500, 50, 'Vitamines', '2026-03-15', 'NutriHealth']
            ];

            for (const product of products) {
                await db.run(
                    `INSERT OR IGNORE INTO products (name, description, price, stock, category, expiry_date, supplier) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    product
                );
            }
        }

        // Fournisseurs
        const suppliersCount = await db.get('SELECT COUNT(*) as count FROM suppliers');
        if (!suppliersCount || suppliersCount.count === 0) {
            const suppliers = [
                ['PharmaPlus', 'Jean Dupont', 'contact@pharmaplus.com', '0102030405', '123 Rue de la Santé, Paris'],
                ['MediSupply', 'Marie Martin', 'info@medisupply.fr', '0607080910', '456 Avenue des Médicaments, Lyon'],
                ['DiabCare', 'Pierre Bernard', 'support@diabcare.com', '0203040506', '789 Boulevard du Diabète, Marseille']
            ];

            for (const supplier of suppliers) {
                await db.run(
                    `INSERT INTO suppliers (name, contact, email, phone, address) 
                     VALUES (?, ?, ?, ?, ?)`,
                    supplier
                );
            }
        }

        // Clients
        const clientsCount = await db.get('SELECT COUNT(*) as count FROM clients');
        if (!clientsCount || clientsCount.count === 0) {
            const clients = [
                ['Jean Dupont', 'jean.dupont@email.com', '0612345678', '12 Rue des Fleurs, Paris'],
                ['Marie Martin', 'marie.martin@email.com', '0698765432', '34 Avenue des Arbres, Lyon'],
                ['Pierre Bernard', 'pierre.bernard@email.com', '0712345678', '56 Boulevard des Oiseaux, Marseille']
            ];

            for (const client of clients) {
                await db.run(
                    `INSERT INTO clients (name, email, phone, address) 
                     VALUES (?, ?, ?, ?)`,
                    client
                );
            }
        }

        // Commandes
        const ordersCount = await db.get('SELECT COUNT(*) as count FROM orders');
        if (!ordersCount || ordersCount.count === 0) {
            const orders = [
                [1, '[{"product_id":1,"quantity":10},{"product_id":2,"quantity":5}]', 47500, 'pending'],
                [2, '[{"product_id":3,"quantity":2}]', 30000, 'received'],
                [3, '[{"product_id":1,"quantity":20},{"product_id":4,"quantity":15}]', 77000, 'pending']
            ];

            for (const order of orders) {
                await db.run(
                    `INSERT INTO orders (supplier_id, items, total_amount, status) 
                     VALUES (?, ?, ?, ?)`,
                    order
                );
            }
        }

        // Pharmacies de garde
        const pharmaciesCount = await db.get('SELECT COUNT(*) as count FROM pharmacies');
        if (!pharmaciesCount || pharmaciesCount.count === 0) {
            const pharmacies = [
                ['Pharmacie Centrale', '12 Rue de la République, Abidjan', '0102030405', 'Lun-Sam: 8h-20h', 0, '0102030406'],
                ['Pharmacie de la Paix', '45 Avenue des Héros, Abidjan', '0607080910', '24h/24', 1, '0607080911'],
                ['Pharmacie Santé Plus', '78 Boulevard du Commerce, Abidjan', '0203040506', 'Lun-Sam: 9h-19h', 0, '0203040507']
            ];

            for (const pharmacy of pharmacies) {
                await db.run(
                    `INSERT INTO pharmacies (name, address, phone, schedule, is_24h, emergency_contact) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    pharmacy
                );
            }
        }

        logger.info('Données de démonstration insérées');
    } catch (error) {
        logger.error('Erreur insertion données démo', error);
    }
}

module.exports = { initDatabase };
