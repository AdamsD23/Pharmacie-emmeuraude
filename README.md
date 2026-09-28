# Pharmacie Émeraude — Gestion de pharmacie (v3)

Application web complète de gestion d'officine : **stock, caisse, clients, fournisseurs, commandes et statistiques**.
Projet réalisé dans le cadre de Simplon Côte d'Ivoire.

**Stack** : Node.js · Express · MySQL · JWT · Tailwind CSS · JavaScript (sans framework)

## Fonctionnalités

| Module | Ce qu'on peut faire |
|---|---|
| **Tableau de bord** | CA du jour et du mois, graphique 7/30 jours, alertes de rupture et de péremption, dernières ventes, top produits |
| **Caisse** | Recherche instantanée (Entrée = ajouter), panier multi-produits, client, paiement Espèces / Wave / Orange / MTN / Moov / Carte, calcul de la monnaie, reçu imprimable |
| **Ventes** | Historique filtrable par période, détail, réimpression du reçu, annulation (le stock est restauré), export CSV |
| **Stock** | Ajout / modification, ajustement rapide ±1, filtres (catégorie, stock faible, péremption), valeur du stock, export CSV |
| **Clients** | Fiche avec historique d'achats et total dépensé, lien WhatsApp direct, export CSV |
| **Fournisseurs** | Coordonnées, nombre de produits et de commandes |
| **Commandes** | Commande multi-produits, suggestion automatique des produits en stock faible, réception qui **ajoute le stock** |
| **Comptes** | 3 rôles (admin, pharmacien, vendeur), désactivation immédiate d'un compte, changement de mot de passe |
| **Paramètres** | Nom, adresse, téléphone et message affichés sur les reçus |

### Droits par rôle

| | Vendeur | Pharmacien | Admin |
|---|:-:|:-:|:-:|
| Caisse, clients, consulter le stock et les ventes | ✅ | ✅ | ✅ |
| Gérer le stock, fournisseurs, commandes, annuler une vente | | ✅ | ✅ |
| Comptes utilisateurs, paramètres | | | ✅ |

### Sécurité
- Toutes les routes de l'API exigent une connexion ; les droits sont vérifiés côté serveur.
- Mots de passe hachés (bcrypt), sessions JWT de 12 h, compte désactivé = accès coupé immédiatement.
- Limitation des tentatives de connexion (10 / 15 min), requêtes SQL paramétrées.
- Seul le dossier `public/` est servi : `.env` et le code serveur ne sont jamais accessibles.
- Les ventes et commandes utilisent des transactions (le stock ne peut pas devenir négatif, même avec deux caisses).

## Lancer en local

Prérequis : **Node.js 18+** et **MySQL** (par exemple celui de XAMPP).

```bash
npm install
cp .env.example .env      # puis adaptez la connexion MySQL si besoin
npm start
```

Ouvrez http://localhost:3000 — compte `admin` / `admin123` (modifiable avec `ADMIN_PASSWORD`).
Au premier démarrage, la base et les tables sont créées automatiquement. Avec `SEED_DEMO=true`, des données
d'exemple et deux comptes de démonstration sont ajoutés : `pharmacien` et `vendeur` (mot de passe `demo12345`).

> **XAMPP qui ne démarre pas MySQL ?** Si MySQL reste bloqué au démarrage, ajoutez `skip-name-resolve`
> sous `[mysqld]` dans `C:\xampp\mysql\bin\my.ini`, puis relancez-le depuis le panneau XAMPP.

## Tests

Les tests d'intégration vérifient la sécurité, les rôles, les ventes, le stock, les commandes et les statistiques
sur une vraie base MySQL. Ils utilisent une base dédiée (son nom doit contenir « test ») qui est **vidée** à chaque lancement :

```bash
DB_NAME=pharmacie_tests npm test
```

## Mise en ligne (gratuite) : Aiven + Render

1. **Base de données — [Aiven](https://aiven.io)** : créez un service *MySQL* gratuit. Dans *Connection information*,
   notez Host, Port, User, Password et téléchargez le *CA certificate*.
2. **Serveur — [Render](https://render.com)** : *New → Blueprint*, choisissez ce dépôt GitHub. Le fichier
   `render.yaml` configure tout ; renseignez `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `ADMIN_PASSWORD`
   et collez le contenu du certificat dans `DB_SSL_CA`.
3. Render fournit une adresse du type `https://pharmacie-emeraude.onrender.com`.

> Sur l'offre gratuite de Render, le serveur se met en veille après 15 min sans visite : la première ouverture prend ~30 s.

## Structure

```
server.js            Point d'entrée (Express)
config.js            Configuration (variables d'environnement)
db/mysql.js          Connexion, création des tables et migrations
db/seed-demo.js      Données de démonstration (npm run seed)
middleware/          Authentification, rôles, erreurs, limitation de débit
routes/              API : auth, users, products, sales, clients, suppliers, orders, stats, settings
utils/validate.js    Validation des données reçues
public/              Interface web (une page HTML par module + assets/app.js partagé)
tests/api.test.js    Tests d'intégration
archive/             Ancienne version (maquettes v2), non utilisée
```

## API (résumé)

Toutes les routes (sauf `POST /api/auth/login` et `GET /api/health`) attendent l'en-tête `Authorization: Bearer <token>`.

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/login` | — |
| GET / PUT | `/api/auth/me` · PUT `/api/auth/password` | tous |
| GET | `/api/products` (`?q=&categorie=&alerte=stock\|expiration`) · `/api/products/categories` | tous |
| POST / PUT / DELETE · PATCH `/:id/stock` | `/api/products` | pharmacien |
| GET · POST | `/api/sales` (`?du=&au=&statut=`) — POST `{ client_id, mode_paiement, montant_recu, lignes: [{ produit_id, quantite }] }` | tous |
| POST | `/api/sales/:id/annuler` | pharmacien |
| GET / POST / PUT | `/api/clients` · DELETE | tous · pharmacien |
| CRUD | `/api/suppliers`, `/api/orders` (+ PUT `/:id/statut`) | pharmacien |
| GET | `/api/stats`, `/api/stats/daily`, `/api/stats/top-products`, `/api/stats/payments` | tous |
| GET · PUT | `/api/settings` | tous · admin |
| CRUD | `/api/users` | admin |

## Licence

MIT — Adams Diarra
