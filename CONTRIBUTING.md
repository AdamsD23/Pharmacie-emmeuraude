# Guide de Contribution - Pharmacie Émeraude

## Principes de Développement

### 1. Architecture
- **Modulaire**: Chaque route son dossier
- **Séparation des responsabilités**: DB ≠ Routes ≠ Middleware
- **DRY**: Pas de duplication de code
- **KISS**: Simple et lisible avant tout

### 2. Sécurité
- ✅ Toujours valider les inputs
- ✅ Sanitizer les chaînes
- ✅ Utiliser async/await pour les erreurs
- ✅ Logger les actions sensibles
- ❌ Jamais exposer les détails d'erreur

### 3. Code Style

#### Nommage
```javascript
// Variables/constantes
const MAX_ITEMS = 100;
const userData = {};
let isValid = true;

// Fonctions
async function validateProduct(product) {}
function isValidEmail(email) {}

// Classes
class Logger {}
class Database {}
```

#### Formatage
```javascript
// Utiliser async/await, PAS callbacks
async function fetchProduct(id) {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) throw new Error('Not found');
        return product;
    } catch (error) {
        logger.error('Fetch failed', error);
        throw error;
    }
}
```

#### Commentaires
```javascript
/**
 * Récupère un produit par ID
 * @param {number} id - ID du produit
 * @returns {Promise<Object>} Le produit
 * @throws {Error} Si non trouvé
 */
async function getProduct(id) {
    // Logique
}
```

### 4. Nouvelles Routes

Créer dans `routes/domain.js`:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/domain
router.get('/', asyncHandler(async (req, res) => {
    const db = getDatabase();
    const items = await db.all('SELECT * FROM domain');
    res.json(items);
}));

// POST /api/domain
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
    // Validation
    // Insert
    // Response
}));

module.exports = router;
```

Puis enregistrer dans `server.js`:
```javascript
const domainRoutes = require('./routes/domain');
app.use('/api/domain', domainRoutes);
```

### 5. Ajouter une Validation

Dans `utils/validators.js`:

```javascript
static validateDomain(domain) {
    const errors = [];
    
    if (!domain.name || domain.name.trim().length === 0) {
        errors.push('Le nom est requis');
    }
    
    return { isValid: errors.length === 0, errors };
}
```

Puis l'utiliser:
```javascript
const validation = Validators.validateDomain(req.body);
if (!validation.isValid) {
    return res.status(400).json({
        error: 'Données invalides',
        code: 'INVALID_DATA',
        details: validation.errors
    });
}
```

### 6. Logging

```javascript
const Logger = require('../utils/logger');
const logger = new Logger({ level: config.LOG_LEVEL });

logger.info('Action créée', { userId: req.user.id, itemId: 42 });
logger.error('Erreur critique', error, { context: 'value' });
logger.warn('Attention', { reason: 'Stock faible' });
logger.debug('Debug info', { details: 'value' });
```

### 7. Transaction BD

Pour les opérations multi-tables atomiques:

```javascript
await db.transaction(async () => {
    // Créer vente
    const result = await db.run(INSERT_SALE_SQL, params);
    
    // Mettre à jour produit
    await db.run(UPDATE_PRODUCT_SQL, params);
    
    // Tout ou rien!
});
```

### 8. Tests

#### Test mental : questions à se poser
- ✅ L'input est-il validé?
- ✅ Les erreurs sont-elles catchées?
- ✅ Le débit est-il limité?
- ✅ L'auth est-elle vérifiée?
- ✅ Les logs sont-ils assez détaillés?
- ✅ La réponse est-elle formatée?

#### Ajouter des tests (à implémenter)
```javascript
// __tests__/routes/products.test.js
describe('Products API', () => {
    test('GET /products returns array', async () => {
        const response = await request(app)
            .get('/api/products')
            .set('Authorization', `Bearer ${token}`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

## Workflow de Développement

### 1. Feature Branch
```bash
git checkout -b feature/ma-feature
```

### 2. Développer & Tester
```bash
npm run dev
# Tester localement
```

### 3. Commit & Push
```bash
git add .
git commit -m "feat: description courte"
git push origin feature/ma-feature
```

### 4. Pull Request
- Description claire
- Tests inclus
- Documentation à jour

### 5. Merge
- Code review
- Tous les tests passent
- Pas de dépendances circulaires

## Amélioration Continue

### Amélioration de Sécurité
- [ ] HTTPS enforcé
- [ ] CSRF protection
- [ ] SQL injection protection complète
- [ ] XSS protection
- [ ] Secrets vault
- [ ] 2FA

### Amélioration Performance
- [ ] Pagination BD
- [ ] Caching Redis
- [ ] Compression responses
- [ ] Database indexing
- [ ] Connection pooling

### Amélioration Qualité
- [ ] Jest + Supertest
- [ ] ESLint
- [ ] Coverage 80%+
- [ ] SonarQube
- [ ] Pre-commit hooks

### Amélioration DevOps
- [ ] Docker
- [ ] Kubernetes
- [ ] GitHub Actions
- [ ] Monitoring (Sentry)
- [ ] Log aggregation (ELK)

## Checklist avant Push

- [ ] Code formaté (indentation 4 espaces)
- [ ] Pas de `console.log()` en production
- [ ] Toutes les routes loggées
- [ ] Validation présente
- [ ] Gestion d'erreurs complète
- [ ] Tests passants
- [ ] Documentation à jour
- [ ] Pas de `any` TypeScript (futur)
- [ ] Commentaires sur code complexe

## Questions Fréquentes

**Q: Comment ajouter un nouveau champ?**
A: 
1. Modifier le schéma dans `db/init.js`
2. Ajouter la validation dans `utils/validators.js`
3. Mettre à jour la route
4. Tester

**Q: Où logger?**
A: 
- Actions: `logger.info()`
- Erreurs: `logger.error()`
- Problèmes: `logger.warn()`
- Debug: `logger.debug()` (dev seulement)

**Q: Comment gérer les transactions?**
A:
```javascript
await db.transaction(async () => {
    // Opérations atomiques
});
```

**Q: Rate limiting: pourquoi important?**
A: Évite les abus, protège serveur, fair use pour tous

## Ressources

- [Express.js](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [SQLite](https://www.sqlite.org/)
- [12 Factor App](https://12factor.net/)
- [REST API Best Practices](https://restfulapi.net/)

---

Merci de contribuer à Pharmacie Émeraude! 🎉
