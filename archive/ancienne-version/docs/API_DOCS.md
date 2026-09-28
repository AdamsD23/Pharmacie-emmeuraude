# Documentation API - Pharmacie Émeraude

## Base URL

```
http://localhost:3000/api
```

## Authentification

Tous les endpoints protégés nécessitent un header:

```
Authorization: Bearer {JWT_TOKEN}
```

## Codes de Réponse

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Créé |
| 400 | Erreur requête |
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Non trouvé |
| 429 | Limite débit atteinte |
| 500 | Erreur serveur |

## Endpoints

### Authentification

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@pharmacie-emeraude.com",
    "role": "admin"
  }
}
```

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "username": "vendeur",
  "password": "password123",
  "email": "vendeur@pharmacie.com",
  "role": "user"
}

Response 201:
{
  "message": "Utilisateur créé avec succès",
  "id": 2
}
```

#### Refresh Token
```
POST /auth/refresh
Authorization: Bearer {expired_token}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Produits

#### Lister tous les produits
```
GET /products
Authorization: Bearer {token}

Response 200:
[
  {
    "id": 1,
    "name": "Paracétamol 500mg",
    "description": "Antalgique et antipyrétique",
    "price": 2500,
    "stock": 42,
    "category": "Antalgique",
    "expiry_date": "2025-12-01",
    "supplier": "PharmaPlus",
    "created_at": "2026-07-20T10:30:45Z"
  }
]
```

#### Lister produits en stock faible
```
GET /products/alerts/low-stock
Authorization: Bearer {token}

Response 200: [products avec stock < 10]
```

#### Récupérer un produit
```
GET /products/{id}
Authorization: Bearer {token}

Response 200: {product}
```

#### Créer un produit
```
POST /products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Aspirine 500mg",
  "description": "Anti-inflammatoire",
  "price": 1500,
  "stock": 100,
  "category": "Anti-inflammatoire",
  "expiry_date": "2026-12-31",
  "supplier": "PharmaPlus"
}

Response 201:
{
  "message": "Produit créé avec succès",
  "id": 6
}
```

#### Mettre à jour un produit
```
PUT /products/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "stock": 50
}

Response 200:
{
  "message": "Produit mis à jour avec succès"
}
```

#### Supprimer un produit
```
DELETE /products/{id}
Authorization: Bearer {token}

Response 200:
{
  "message": "Produit supprimé avec succès"
}
```

---

### Ventes

#### Lister toutes les ventes
```
GET /sales
Authorization: Bearer {token}

Response 200:
[
  {
    "id": 1,
    "product_id": 1,
    "product_name": "Paracétamol 500mg",
    "quantity": 3,
    "total_price": 7500,
    "sale_date": "2026-07-20T10:30:45Z",
    "customer_name": "Jean Dupont"
  }
]
```

#### Récupérer une vente
```
GET /sales/{id}
Authorization: Bearer {token}

Response 200: {sale}
```

#### Créer une vente
```
POST /sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 3,
  "customer_name": "Jean Dupont"
}

Response 201:
{
  "message": "Vente enregistrée avec succès",
  "totalPrice": 7500
}
```

#### Annuler une vente (remboursement)
```
DELETE /sales/{id}
Authorization: Bearer {token}

Response 200:
{
  "message": "Vente annulée et stock restauré"
}
```

---

### Clients

#### Lister tous les clients
```
GET /clients
Authorization: Bearer {token}

Response 200:
[
  {
    "id": 1,
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "phone": "0612345678",
    "address": "12 Rue des Fleurs, Paris",
    "created_at": "2026-07-20T10:30:45Z"
  }
]
```

#### Créer un client
```
POST /clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Marie Martin",
  "email": "marie@example.com",
  "phone": "0761234567",
  "address": "34 Avenue des Arbres, Lyon"
}

Response 201:
{
  "message": "Client créé avec succès",
  "id": 4
}
```

#### Mettre à jour un client
```
PUT /clients/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "0761234567"
}

Response 200:
{
  "message": "Client mis à jour avec succès"
}
```

#### Supprimer un client
```
DELETE /clients/{id}
Authorization: Bearer {token}

Response 200:
{
  "message": "Client supprimé avec succès"
}
```

---

### Fournisseurs

Même pattern que Clients:

```
GET    /suppliers           # Lister
GET    /suppliers/{id}      # Récupérer
POST   /suppliers           # Créer
PUT    /suppliers/{id}      # Mettre à jour
DELETE /suppliers/{id}      # Supprimer
```

---

### Statistiques

#### Statistiques globales
```
GET /stats
Authorization: Bearer {token}

Response 200:
{
  "total_products": 5,
  "total_clients": 10,
  "total_sales": 45,
  "total_revenue": 125000,
  "today_revenue": 12500,
  "low_stock": 2,
  "out_of_stock": 0,
  "expired_products": 0,
  "today_sales": 5
}
```

#### Statistiques mensuelles
```
GET /stats/monthly
Authorization: Bearer {token}

Response 200:
[
  {
    "date": "2026-07-20",
    "sales_count": 5,
    "daily_revenue": 12500
  }
]
```

#### Statistiques par produit
```
GET /stats/products
Authorization: Bearer {token}

Response 200:
[
  {
    "id": 1,
    "name": "Paracétamol 500mg",
    "stock": 42,
    "price": 2500,
    "sales_count": 10,
    "total_quantity_sold": 30,
    "total_revenue": 75000
  }
]
```

---

## Format d'Erreur

### Erreur Validation
```json
{
  "error": "Données invalides",
  "code": "INVALID_DATA",
  "details": [
    "Le nom du produit est requis",
    "Le prix doit être un nombre positif"
  ]
}
```

### Erreur Authentification
```json
{
  "error": "Identifiants invalides",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2026-07-20T10:30:45.123Z"
}
```

### Erreur Rate Limit
```json
{
  "error": "Trop de requêtes - limite de débit atteinte",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 850
}
```

---

## Rate Limiting

**Limite**: 100 requêtes par IP sur 15 minutes

**Headers de réponse**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-07-20T10:45:00.000Z
```

---

## Exemples cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Créer produit
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aspirine",
    "price": 1500,
    "stock": 100,
    "category": "Anti-inflammatoire"
  }'
```

### Lister produits
```bash
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```
