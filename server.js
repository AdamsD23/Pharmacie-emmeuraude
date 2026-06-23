const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret-key-pour-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Base de données SQLite
const db = new sqlite3.Database('./pharmacie.db', (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.message);
    } else {
        console.log('Connecté à la base de données SQLite');
        initDatabase();
    }
});

// Initialisation de la base de données
function initDatabase() {
    db.serialize(() => {
        // Table utilisateurs
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table produits
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            category TEXT,
            expiry_date DATE,
            supplier TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table ventes
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            quantity INTEGER NOT NULL,
            total_price REAL NOT NULL,
            sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            customer_name TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // Table fournisseurs
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table clients
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Créer utilisateur admin par défaut
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, email, role) 
                VALUES (?, ?, ?, ?)`, 
                ['admin', hashedPassword, 'admin@pharmacie.com', 'admin']);

        // Insérer des données de démonstration
        setTimeout(insertDemoData, 1000);
    });
}

function insertDemoData() {
    db.serialize(() => {
        // Produits de démonstration
        const demoProducts = [
            ['Paracétamol 500mg', 'Antalgique et antipyrétique', 2500, 42, 'Antalgique', '2025-12-01', 'PharmaPlus'],
            ['Amoxicilline 1g', 'Antibiotique large spectre', 4500, 5, 'Antibiotique', '2025-08-15', 'MediSupply'],
            ['Insuline Lantus', 'Insuline à action prolongée', 15000, 12, 'Diabète', '2025-10-20', 'DiabCare'],
            ['Ibuprofène 400mg', 'Anti-inflammatoire', 1800, 30, 'Anti-inflammatoire', '2026-01-10', 'PharmaPlus'],
            ['Vitamine C 1000mg', 'Complément alimentaire', 3500, 50, 'Vitamines', '2026-03-15', 'NutriHealth']
        ];

        demoProducts.forEach(product => {
            db.run(`INSERT OR IGNORE INTO products (name, description, price, stock, category, expiry_date, supplier) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`, product);
        });

        // Fournisseurs de démonstration
        const demoSuppliers = [
            ['PharmaPlus', 'Jean Dupont', 'contact@pharmaplus.com', '0102030405', '123 Rue de la Santé, Paris'],
            ['MediSupply', 'Marie Martin', 'info@medisupply.fr', '0607080910', '456 Avenue des Médicaments, Lyon'],
            ['DiabCare', 'Pierre Bernard', 'support@diabcare.com', '0203040506', '789 Boulevard du Diabète, Marseille']
        ];

        demoSuppliers.forEach(supplier => {
            db.run(`INSERT OR IGNORE INTO suppliers (name, contact, email, phone, address) 
                    VALUES (?, ?, ?, ?, ?)`, supplier);
        });

        // Clients de démonstration
        const demoClients = [
            ['Jean Dupont', 'jean.dupont@email.com', '0612345678', '12 Rue des Fleurs, Paris'],
            ['Marie Martin', 'marie.martin@email.com', '0698765432', '34 Avenue des Arbres, Lyon'],
            ['Pierre Bernard', 'pierre.bernard@email.com', '0712345678', '56 Boulevard des Oiseaux, Marseille']
        ];

        demoClients.forEach(client => {
            db.run(`INSERT OR IGNORE INTO clients (name, email, phone, address) 
                    VALUES (?, ?, ?, ?)`, client);
        });
    });
}

// Routes d'authentification
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
});

app.post('/api/register', (req, res) => {
    const { username, password, email, role = 'user' } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ error: 'Champs requis manquants' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', 
           [username, hashedPassword, email, role], 
           function(err) {
               if (err) {
                   return res.status(400).json({ error: 'Utilisateur déjà existant' });
               }
               res.json({ message: 'Utilisateur créé avec succès', id: this.lastID });
           });
});

// Middleware d'authentification
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
}

// Routes API Produits
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/products/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json(row);
    });
});

app.post('/api/products', authenticateToken, (req, res) => {
    const { name, description, price, stock, category, expiry_date, supplier } = req.body;
    
    db.run(`INSERT INTO products (name, description, price, stock, category, expiry_date, supplier) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
           [name, description, price, stock, category, expiry_date, supplier],
           function(err) {
               if (err) {
                   return res.status(500).json({ error: err.message });
               }
               res.json({ message: 'Produit créé', id: this.lastID });
           });
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
    const { name, description, price, stock, category, expiry_date, supplier } = req.body;
    
    db.run(`UPDATE products SET name = ?, description = ?, price = ?, stock = ?, 
            category = ?, expiry_date = ?, supplier = ? WHERE id = ?`,
           [name, description, price, stock, category, expiry_date, supplier, req.params.id],
           function(err) {
               if (err) {
                   return res.status(500).json({ error: err.message });
               }
               res.json({ message: 'Produit mis à jour' });
           });
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Produit supprimé' });
    });
});

// Routes API Ventes
app.get('/api/sales', (req, res) => {
    db.all(`SELECT s.*, p.name as product_name FROM sales s 
            LEFT JOIN products p ON s.product_id = p.id 
            ORDER BY s.sale_date DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/sales', authenticateToken, (req, res) => {
    const { product_id, quantity, customer_name } = req.body;
    
    // Récupérer le prix du produit
    db.get('SELECT price, stock FROM products WHERE id = ?', [product_id], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        
        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Stock insuffisant' });
        }
        
        const total_price = product.price * quantity;
        
        db.run(`INSERT INTO sales (product_id, quantity, total_price, customer_name) 
                VALUES (?, ?, ?, ?)`,
               [product_id, quantity, total_price, customer_name],
               function(err) {
                   if (err) {
                       return res.status(500).json({ error: err.message });
                   }
                   
                   // Mettre à jour le stock
                   db.run('UPDATE products SET stock = stock - ? WHERE id = ?', 
                          [quantity, product_id]);
                   
                   res.json({ message: 'Vente enregistrée', id: this.lastID });
               });
    });
});

// Routes API Fournisseurs
app.get('/api/suppliers', (req, res) => {
    db.all('SELECT * FROM suppliers ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/suppliers', authenticateToken, (req, res) => {
    const { name, contact, email, phone, address } = req.body;
    
    db.run(`INSERT INTO suppliers (name, contact, email, phone, address) 
            VALUES (?, ?, ?, ?, ?)`,
           [name, contact, email, phone, address],
           function(err) {
               if (err) {
                   return res.status(500).json({ error: err.message });
               }
               res.json({ message: 'Fournisseur créé', id: this.lastID });
           });
});

// Routes API Clients
app.get('/api/clients', (req, res) => {
    db.all('SELECT * FROM clients ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/clients', authenticateToken, (req, res) => {
    const { name, email, phone, address } = req.body;
    
    db.run(`INSERT INTO clients (name, email, phone, address) 
            VALUES (?, ?, ?, ?)`,
           [name, email, phone, address],
           function(err) {
               if (err) {
                   return res.status(500).json({ error: err.message });
               }
               res.json({ message: 'Client créé', id: this.lastID });
           });
});

// Route pour les statistiques du dashboard
app.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as total_products FROM products', [], (err, productCount) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT COUNT(*) as total_sales FROM sales', [], (err, salesCount) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.get('SELECT SUM(total_price) as total_revenue FROM sales', [], (err, revenue) => {
                if (err) return res.status(500).json({ error: err.message });
                
                db.get('SELECT COUNT(*) as low_stock FROM products WHERE stock < 10', [], (err, lowStock) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    res.json({
                        total_products: productCount.total_products,
                        total_sales: salesCount.total_sales,
                        total_revenue: revenue.total_revenue || 0,
                        low_stock: lowStock.low_stock
                    });
                });
            });
        });
    });
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'tableaudebordpharmacy.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Accédez à l'application: http://localhost:${PORT}`);
});
