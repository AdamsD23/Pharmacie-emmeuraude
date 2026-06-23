# Pharmacie Émeraude - Système de Gestion de Pharmacie

Système complet de gestion de pharmacie avec interface moderne et backend robuste.

## 🚀 Fonctionnalités

- **Gestion des Stocks**: Suivi en temps réel des médicaments et alertes de stock
- **Gestion des Ventes**: Enregistrement des ventes et suivi du chiffre d'affaires
- **Gestion des Clients**: Base de données clients et historique
- **Gestion des Fournisseurs**: Suivi des fournisseurs et commandes
- **Dashboard**: Tableau de bord avec statistiques en temps réel
- **Authentification**: Système de connexion sécurisé avec JWT
- **Interface Responsive**: Design moderne adapté mobile/desktop

## 🛠️ Technologies

- **Frontend**: HTML5, TailwindCSS, JavaScript
- **Backend**: Node.js, Express
- **Base de données**: SQLite
- **Authentification**: JWT (JSON Web Tokens)
- **Hébergement**: Vercel/Netlify ready

## 📦 Installation

### Prérequis
- Node.js (v14 ou supérieur)
- npm ou yarn

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd pharmacie-emeraude
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. **Démarrer le serveur**
```bash
npm start
```

5. **Accéder à l'application**
Ouvrez votre navigateur sur `http://localhost:3000`

## 🔐 Identifiants par défaut

- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Changez ces identifiants en production!

## 📁 Structure du projet

```
pharmacie-emeraude/
├── server.js                 # Serveur backend Express
├── api.js                    # Fonctions API frontend
├── package.json              # Dépendances du projet
├── .env                      # Variables d'environnement
├── vercel.json               # Configuration Vercel
├── tableaudebordpharmacy.html # Dashboard principal
├── gestiondestocks.html      # Gestion des stocks
├── caissesetvente.html       # Gestion des ventes
├── clients.html              # Gestion des clients
├── gestionfournisseur.html  # Gestion des fournisseurs
├── profile.html              # Profil utilisateur
└── README.md                 # Documentation
```

## 🌐 API Endpoints

### Authentification
- `POST /api/login` - Connexion utilisateur
- `POST /api/register` - Inscription utilisateur

### Produits
- `GET /api/products` - Liste tous les produits
- `GET /api/products/:id` - Récupère un produit
- `POST /api/products` - Crée un produit (authentifié)
- `PUT /api/products/:id` - Met à jour un produit (authentifié)
- `DELETE /api/products/:id` - Supprime un produit (authentifié)

### Ventes
- `GET /api/sales` - Liste toutes les ventes
- `POST /api/sales` - Crée une vente (authentifié)

### Fournisseurs
- `GET /api/suppliers` - Liste tous les fournisseurs
- `POST /api/suppliers` - Crée un fournisseur (authentifié)

### Clients
- `GET /api/clients` - Liste tous les clients
- `POST /api/clients` - Crée un client (authentifié)

### Statistiques
- `GET /api/stats` - Statistiques du dashboard

## 🚀 Déploiement

### Vercel (Recommandé)

1. **Installer Vercel CLI**
```bash
npm install -g vercel
```

2. **Se connecter à Vercel**
```bash
vercel login
```

3. **Déployer**
```bash
vercel
```

4. **Configurer les variables d'environnement**
Dans le dashboard Vercel, ajoutez:
- `JWT_SECRET`: Votre secret key pour JWT

### Netlify

1. **Créer un fichier netlify.toml**
```toml
[build]
  command = "npm install"
  start = "node server.js"

[[redirects]]
  from = "/*"
  to = "/server.js"
  status = 200
```

2. **Déployer avec Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Heroku

1. **Créer un fichier Procfile**
```
web: node server.js
```

2. **Déployer**
```bash
heroku create
git push heroku main
heroku config:set JWT_SECRET=votre-secret
```

## 🧪 Tests

### Lancer les tests
```bash
npm test
```

### Tests API
```bash
# Test de connexion
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📝 Configuration

### Variables d'environnement

- `PORT`: Port du serveur (défaut: 3000)
- `JWT_SECRET`: Secret key pour JWT (obligatoire en production)
- `NODE_ENV`: Environnement (development/production)

## 🔒 Sécurité

- Les mots de passe sont hashés avec bcrypt
- Utilisation de JWT pour l'authentification
- Protection CORS configurée
- Validation des entrées utilisateur

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 👥 Auteurs

- Votre Nom - Développeur principal

## 🙏 Remerciements

- Design inspiré par Material Design 3
- Icônes Material Symbols
- Framework TailwindCSS

## 📞 Support

Pour toute question ou problème, contactez:
- Email: support@pharmacie-emeraude.com
- Issues: [GitHub Issues](https://github.com/votre-repo/pharmacie-emeraude/issues)

---

**Note**: Ce projet est prêt pour la soutenance avec toutes les fonctionnalités backend et frontend opérationnelles.
