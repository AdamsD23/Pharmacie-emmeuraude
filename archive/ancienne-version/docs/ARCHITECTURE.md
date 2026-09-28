# Architecture - Pharmacie Émeraude v2.0

## Vue d'ensemble

Pharmacie Émeraude est une application de gestion de pharmacie refactorisée avec une architecture modulaire, sécurisée et professionnelle.

### Stack Technique

```
Frontend                Backend               Database
- HTML5              - Node.js/Express      - SQLite3
- JavaScript         - JWT Auth             - Prisma (future)
- TailwindCSS        - Rate Limiting        
                     - Validation           
                     - Logging              
```

## Structure du Projet

```
pharmacie-emeraude/
├── config.js                 # Configuration centralisée
├── server.js                 # Serveur principal
├── package.json              # Dépendances
├── .env.example              # Variables d'environnement template
├── .gitignore                # Fichiers ignorés
│
├── db/
│   ├── database.js           # Couche d'accès aux données
│   └── init.js               # Initialisation de la BD
│
├── middleware/
│   ├── auth.js               # Authentification JWT
│   ├── errorHandler.js       # Gestion centralisée d'erreurs
│   ├── rateLimit.js          # Limitation des requêtes
│   └── validation.js         # Validation des données
│
├── routes/
│   ├── auth.js               # Endpoints authentification
│   ├── products.js           # Endpoints produits
│   ├── sales.js              # Endpoints ventes
│   ├── suppliers.js          # Endpoints fournisseurs
│   ├── clients.js            # Endpoints clients
│   └── stats.js              # Endpoints statistiques
│
├── utils/
│   ├── logger.js             # Système de logging
│   └── validators.js         # Validateurs métier
│
├── logs/                     # Fichiers de logs
│   ├── error.log
│   ├── warn.log
│   └── info.log
│
├── public/
│   ├── js/                   # JavaScript modules (futur)
│   └── css/                  # Stylesheets (futur)
│
└── [fichiers HTML]           # Interfaces web
```

## Flux Requête/Réponse

### 1. Authentification

```
POST /api/auth/login
├── Body: { username, password }
├── Response: { token, user }
└── Logs: action + userId
```

### 2. Opération Protégée

```
GET /api/products
├── Header: Authorization: Bearer {token}
├── Middleware: authenticateToken
│   ├── Extrait token
│   ├── Vérifie JWT
│   └── Ajoute req.user
├── Route Handler
│   ├── Récupère données BD
│   └── Retourne JSON
└── Middleware: errorHandler (si erreur)
```

## Couches d'Application

### 1. Route Layer (`routes/`)

Point d'entrée HTTP. Responsabilités:
- Parser les paramètres
- Appeler les validations
- Orchestrer la logique métier
- Formater les réponses

```javascript
// routes/products.js
router.post('/', authenticateToken, sanitizeBody, validateRequired('name'), async (req, res) => {
    // Validation métier
    // Appel DB
    // Réponse
});
```

### 2. Middleware Layer (`middleware/`)

Intercept et traite les requêtes:

| Middleware | Rôle |
|-----------|------|
| `auth.js` | Vérifie JWT, autorise rôles |
| `validation.js` | Valide les champs requis, sanitize |
| `errorHandler.js` | Capture erreurs, format réponses |
| `rateLimit.js` | Limite requêtes par IP |

### 3. Database Layer (`db/`)

Abstraction données:

```javascript
// db/database.js
const db = getDatabase();
await db.get(sql, params);      // Un résultat
await db.all(sql, params);      // Tous les résultats
await db.run(sql, params);      // INSERT/UPDATE/DELETE
await db.transaction(callback); // Atomicité
```

### 4. Utils Layer (`utils/`)

Services transversaux:

- **Logger**: Logging structuré JSON avec niveaux
- **Validators**: Validation métier par domaine

## Sécurité

### 1. Authentification
- ✅ Mots de passe hashés (bcryptjs)
- ✅ Tokens JWT avec expiration 24h
- ✅ Refresh token endpoint
- ✅ Validation des credentials

### 2. Validation
- ✅ Sanitization des inputs (supprime `<>`)
- ✅ Validation types (email, phone, nombres)
- ✅ Validation métier (stock > 0, etc)

### 3. Rate Limiting
- ✅ 100 requêtes par IP / 15 min
- ✅ Headers `X-RateLimit-*`
- ✅ Réponse 429 avec `retryAfter`

### 4. Erreurs
- ✅ Pas d'exposition internal errors
- ✅ Codes d'erreur standardisés
- ✅ Logging de tous les events
- ✅ Timestamps sur les erreurs

## Variables d'Environnement

```bash
# Serveur
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=votre-secret-complexe-ici

# Base de données
DB_PATH=./pharmacie.db

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Logging

Quatre fichiers de logs dans `logs/`:

```json
// logs/error.log
{"timestamp":"2026-07-20T10:30:45.123Z","level":"ERROR","message":"Erreur login","userId":1,"error":"...stack..."}

// logs/info.log
{"timestamp":"2026-07-20T10:30:45.123Z","level":"INFO","message":"Produit créé","productId":42,"name":"Paracétamol"}
```

## Modèle de Données

### Utilisateurs
```sql
id, username, password, email, role, is_active, created_at, updated_at
```

### Produits
```sql
id, name, description, price, stock, category, expiry_date, supplier, created_at, updated_at
```

### Ventes
```sql
id, product_id, quantity, total_price, sale_date, customer_name
```

### Clients
```sql
id, name, email, phone, address, created_at, updated_at
```

### Fournisseurs
```sql
id, name, contact, email, phone, address, created_at, updated_at
```

## Prochaines Améliorations

- [ ] Migrations DB automatiques
- [ ] Tests unitaires (Jest)
- [ ] Tests d'intégration
- [ ] Swagger API documentation
- [ ] Pagination et filtrage avancé
- [ ] Caching Redis
- [ ] CI/CD (GitHub Actions)
- [ ] Docker containerization
- [ ] Monitoring (Sentry)
- [ ] Export PDF/Excel
- [ ] Multi-langue
