EY# Cahier des Charges - Pharmacie Émeraude

## 📋 Présentation du Projet

### Titre du Projet
**Système de Gestion de Pharmacie - Pharmacie Émeraude**

### Commanditaire
- **Organisation**: Simplon Côte d'Ivoire
- **Contexte**: Projet de formation en développement web

### Date de Réalisation
- **Début**: [Date à définir]
- **Fin**: [Date à définir]

---

## 🎯 Objectifs du Projet

### Objectif Principal
Développer une application web complète de gestion de pharmacie permettant la gestion automatisée des stocks, des ventes, des clients et des fournisseurs avec une interface moderne et intuitive.

### Objectifs Spécifiques
- Automatiser la gestion des stocks de médicaments
- Faciliter l'enregistrement et le suivi des ventes
- Centraliser la gestion des clients et fournisseurs
- Fournir des statistiques en temps réel pour la prise de décision
- Assurer la sécurité des données et des transactions
- Offrir une interface utilisateur moderne et responsive

---

## 📐 Description Fonctionnelle

### Module 1: Authentification et Sécurité

#### Fonctionnalités
- **Connexion utilisateur**
  - Formulaire de connexion sécurisé
  - Validation des identifiants
  - Gestion des sessions avec JWT
  - Option "Rester connecté"

- **Gestion des utilisateurs**
  - Création de comptes utilisateurs
  - Rôles et permissions (admin, utilisateur)
  - Hashage des mots de passe avec bcrypt
  - Protection contre les attaques CSRF

#### Spécifications
- Identifiants par défaut: admin / admin123
- Session valide pendant 24 heures
- Possibilité de réinitialisation du mot de passe

### Module 2: Dashboard Principal

#### Fonctionnalités
- **Statistiques en temps réel**
  - Nombre total de produits en stock
  - Chiffre d'affaires du jour
  - Nombre de ventes effectuées
  - Alertes de stock faible

- **Vue d'ensemble**
  - Accès rapide aux modules principaux
  - Notifications et alertes
  - Graphiques et indicateurs de performance

#### Spécifications
- Mise à jour automatique des statistiques
- Interface intuitive avec icônes Material Design
- Responsive design pour mobile et desktop

### Module 3: Gestion des Stocks

#### Fonctionnalités
- **CRUD Produits**
  - Ajout de nouveaux produits
  - Modification des informations produits
  - Suppression de produits
  - Consultation de la liste des produits

- **Informations produits**
  - Nom et description
  - Prix unitaire
  - Quantité en stock
  - Catégorie (antalgique, antibiotique, etc.)
  - Date d'expiration
  - Fournisseur associé

- **Alertes et notifications**
  - Alerte automatique pour stock < 10 unités
  - Indication des produits expirés ou proches de l'expiration
  - Rapports d'inventaire

#### Spécifications
- Recherche et filtrage des produits
- Tri par catégorie, prix, stock
- Export des données en CSV/PDF
- Historique des modifications

### Module 4: Gestion des Ventes (Point de Vente)

#### Fonctionnalités
- **Enregistrement des ventes**
  - Sélection du produit
  - Saisie de la quantité
  - Calcul automatique du total
  - Identification du client (optionnel)

- **Gestion du panier**
  - Ajout de plusieurs produits
  - Modification des quantités
  - Suppression d'articles
  - Calcul du total en temps réel

- **Historique des ventes**
  - Liste de toutes les transactions
  - Détails de chaque vente
  - Filtrage par date/période
  - Export des rapports

#### Spécifications
- Mise à jour automatique du stock après vente
- Génération de reçus/tickets
- Validation du stock disponible avant vente
- Historique des ventes par client

### Module 5: Gestion des Clients

#### Fonctionnalités
- **CRUD Clients**
  - Ajout de nouveaux clients
  - Modification des informations
  - Suppression de clients
  - Consultation de la liste

- **Informations clients**
  - Nom complet
  - Adresse email
  - Numéro de téléphone
  - Adresse physique

- **Historique d'achat**
  - Vue des achats par client
  - Statistiques de consommation
  - Préférences et habitudes

#### Spécifications
- Recherche de clients par nom/email/téléphone
- Export de la base clients
- Intégration avec le module de ventes

### Module 6: Gestion des Fournisseurs

#### Fonctionnalités
- **CRUD Fournisseurs**
  - Ajout de nouveaux fournisseurs
  - Modification des informations
  - Suppression de fournisseurs
  - Consultation de la liste

- **Informations fournisseurs**
  - Nom de l'entreprise
  - Contact principal
  - Adresse email
  - Numéro de téléphone
  - Adresse physique

- **Suivi des commandes**
  - Historique des commandes
  - Délais de livraison
  - Évaluation des fournisseurs

#### Spécifications
- Recherche et filtrage des fournisseurs
- Association fournisseurs-produits
- Export des données

### Module 7: Rapports et Statistiques

#### Fonctionnalités
- **Rapports de ventes**
  - Rapport journalier
  - Rapport mensuel
  - Rapport annuel
  - Rapport par catégorie

- **Rapports de stock**
  - État des stocks
  - Produits à commander
  - Produits expirés
  - Valorisation du stock

- **Export**
  - Export PDF
  - Export CSV
  - Impression des rapports

#### Spécifications
- Graphiques et visualisations
- Filtres personnalisés
- Comparaison périodes

### Module 8: Profil Utilisateur

#### Fonctionnalités
- **Gestion du compte**
  - Modification du mot de passe
  - Mise à jour des informations personnelles
  - Préférences d'affichage

- **Historique d'activité**
  - Dernières connexions
  - Actions effectuées
  - Journal des modifications

---

## 🛠️ Description Technique

### Architecture Générale

#### Architecture Client-Serveur
- **Pattern**: Architecture RESTful
- **Séparation**: Frontend et Backend distincts
- **Communication**: API REST avec JSON

#### Stack Technologique

**Frontend**
- **HTML5**: Structure sémantique des pages
- **TailwindCSS**: Framework CSS utilitaire pour le styling
- **JavaScript Vanilla**: Logique côté client
- **Material Design 3**: Design system et composants UI
- **Material Symbols**: Icônes Google

**Backend**
- **Node.js**: Runtime JavaScript côté serveur
- **Express**: Framework web pour Node.js
- **SQLite**: Base de données relationnelle légère
- **JWT**: Authentification via JSON Web Tokens
- **bcrypt**: Hashage des mots de passe
- **CORS**: Gestion des requêtes cross-origin

**Outils de Développement**
- **Nodemon**: Redémarrage automatique du serveur
- **Git**: Version control
- **Vercel/Netlify**: Hébergement cloud

### Base de Données

#### Structure des Tables

**Table: users**
```sql
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- username (TEXT UNIQUE NOT NULL)
- password (TEXT NOT NULL)
- email (TEXT UNIQUE NOT NULL)
- role (TEXT DEFAULT 'user')
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

**Table: products**
```sql
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- name (TEXT NOT NULL)
- description (TEXT)
- price (REAL NOT NULL)
- stock (INTEGER DEFAULT 0)
- category (TEXT)
- expiry_date (DATE)
- supplier (TEXT)
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

**Table: sales**
```sql
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- product_id (INTEGER)
- quantity (INTEGER NOT NULL)
- total_price (REAL NOT NULL)
- sale_date (DATETIME DEFAULT CURRENT_TIMESTAMP)
- customer_name (TEXT)
- FOREIGN KEY (product_id) REFERENCES products(id)
```

**Table: suppliers**
```sql
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- name (TEXT NOT NULL)
- contact (TEXT)
- email (TEXT)
- phone (TEXT)
- address (TEXT)
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

**Table: clients**
```sql
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- name (TEXT NOT NULL)
- email (TEXT)
- phone (TEXT)
- address (TEXT)
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

### API Endpoints

#### Authentification
- `POST /api/login` - Connexion utilisateur
- `POST /api/register` - Inscription utilisateur

#### Produits
- `GET /api/products` - Liste tous les produits
- `GET /api/products/:id` - Récupère un produit
- `POST /api/products` - Crée un produit (authentifié)
- `PUT /api/products/:id` - Met à jour un produit (authentifié)
- `DELETE /api/products/:id` - Supprime un produit (authentifié)

#### Ventes
- `GET /api/sales` - Liste toutes les ventes
- `POST /api/sales` - Crée une vente (authentifié)

#### Fournisseurs
- `GET /api/suppliers` - Liste tous les fournisseurs
- `POST /api/suppliers` - Crée un fournisseur (authentifié)

#### Clients
- `GET /api/clients` - Liste tous les clients
- `POST /api/clients` - Crée un client (authentifié)

#### Statistiques
- `GET /api/stats` - Statistiques du dashboard

### Sécurité

#### Mesures de Sécurité
- **Hashage des mots de passe**: bcrypt avec salt rounds = 10
- **Authentification JWT**: Tokens valides 24 heures
- **Protection CORS**: Configuration restreinte
- **Validation des entrées**: Vérification côté serveur
- **SQL Injection**: Utilisation de paramètres préparés

#### Permissions
- **Admin**: Accès complet à toutes les fonctionnalités
- **Utilisateur**: Accès limité (lecture seule pour certaines fonctions)

---

## 🎨 Interface Utilisateur

### Design System

#### Palette de Couleurs
- **Primary**: #006c49 (Vert émeraude)
- **Secondary**: #006591 (Bleu médical)
- **Background**: #f8f9ff (Blanc cassé)
- **Surface**: #f8f9ff
- **Error**: #ba1a1a (Rouge alerte)

#### Typographie
- **Police principale**: Inter (Google Fonts)
- **Police monospace**: JetBrains Mono
- **Tailles**: Display (48px), Headline (32px), Title (18px), Body (16px), Label (12px)

#### Composants
- **Boutons**: Primary, Secondary, Outline
- **Formulaires**: Inputs avec icônes, validation
- **Cards**: Panneaux avec effet glassmorphism
- **Tables**: Données tabulaires avec tri
- **Modals**: Fenêtres modales pour actions
- **Notifications**: Toast messages pour feedback

### Navigation

#### Structure
- **Sidebar**: Navigation principale
- **Header**: Informations utilisateur et notifications
- **Content Zone**: Zone de contenu principale
- **Footer**: Informations légales

#### Pages
1. **Dashboard** (`tableaudebordpharmacy.html`)
2. **Gestion des Stocks** (`gestiondestocks.html`)
3. **Point de Vente** (`caissesetvente.html`)
4. **Clients** (`clients.html`)
5. **Fournisseurs** (`gestionfournisseur.html`)
6. **Historique des Livraisons** (`historiquedeslivraison.html`)
7. **Rapports** (`reports.html`)
8. **Historique des Ventes** (`sales-history.html`)
9. **Profil** (`profile.html`)
10. **Connexion** (`dashboard.html`)

### Responsive Design

#### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

#### Adaptations
- Sidebar rétractable sur mobile
- Tables scrollables horizontalement
- Grilles adaptatives
- Touch-friendly sur mobile

---

## ⚙️ Contraintes et Exigences

### Contraintes Techniques
- **Compatibilité navigateurs**: Chrome, Firefox, Safari, Edge (versions récentes)
- **Performance**: Temps de chargement < 3 secondes
- **Accessibilité**: Conformité WCAG 2.1 AA
- **Responsive**: Support mobile, tablette, desktop

### Contraintes Fonctionnelles
- **Langue**: Interface en français
- **Devise**: Francs CFA (XOF)
- **Fuseau horaire**: UTC+0 (Abidjan)
- **Format de date**: DD/MM/YYYY

### Contraintes de Sécurité
- **HTTPS**: Obligatoire en production
- **Mots de passe**: Minimum 8 caractères
- **Sessions**: Expiration après 24h inactivité
- **Logs**: Journalisation des actions sensibles

### Contraintes Légales
- **RGPD**: Conformité protection des données personnelles
- **Lois pharmaceutiques**: Respect des réglementations locales
- **Facturation**: Conformité aux normes fiscales

---

## 📦 Livrables

### Livrables Techniques
- [x] Code source complet (Frontend + Backend)
- [x] Base de données SQLite avec données de démonstration
- [x] Documentation technique (README.md)
- [x] Guide de soutenance (GUIDE-SOUTENANCE.md)
- [x] Script de conversion PDF (convert-to-pdf.js)

### Livrables Documentation
- [x] README.md avec instructions d'installation
- [x] Cahier des charges (ce document)
- [x] Guide de soutenance
- [x] Commentaires dans le code
- [ ] Guide utilisateur (à créer)

### Livrables Déploiement
- [x] Configuration Vercel (vercel.json)
- [x] Variables d'environnement (.env.example)
- [ ] Configuration production (à finaliser)

---

## 📅 Planning Prévisionnel

### Phase 1: Analyse et Conception (1 semaine)
- [x] Analyse des besoins
- [x] Conception de l'architecture
- [x] Modélisation de la base de données
- [x] Maquettage de l'interface

### Phase 2: Développement Backend (2 semaines)
- [x] Mise en place du serveur Express
- [x] Création de la base de données
- [x] Développement des API endpoints
- [x] Implémentation de l'authentification

### Phase 3: Développement Frontend (3 semaines)
- [x] Création des pages HTML
- [x] Intégration TailwindCSS
- [x] Développement de la logique JavaScript
- [x] Intégration avec l'API

### Phase 4: Tests et Corrections (1 semaine)
- [x] Tests fonctionnels
- [x] Tests de sécurité
- [x] Corrections de bugs
- [x] Optimisation des performances

### Phase 5: Documentation et Déploiement (1 semaine)
- [x] Rédaction de la documentation
- [x] Préparation du déploiement
- [x] Tests de recette
- [ ] Déploiement en production

---

## 💰 Budget Estimatif

### Coûts de Développement
- **Temps de développement**: 8 semaines
- **Ressources humaines**: 1 développeur full-stack
- **Coût horaire**: [À définir selon le contexte]

### Coûts d'Infrastructure
- **Hébergement**: Gratuit (Vercel/Netlify) ou ~10€/mois
- **Nom de domaine**: ~12€/an
- **Base de données**: Gratuit (SQLite) ou ~15€/mois (PostgreSQL cloud)

### Coûts Totaux Estimés
- **Développement**: [À définir]
- **Infrastructure**: ~150€/an
- **Maintenance**: ~20% du coût de développement par an

---

## 🎯 Critères de Succès

### Critères Fonctionnels
- ✅ Tous les modules opérationnels
- ✅ Gestion complète des stocks
- ✅ Système de vente fonctionnel
- ✅ Authentification sécurisée
- ✅ Rapports et statistiques générés

### Critères Techniques
- ✅ Application stable sans crashes
- ✅ Temps de réponse < 2 secondes
- ✅ Interface responsive sur tous les devices
- ✅ Code bien structuré et documenté
- ✅ Tests passés avec succès

### Critères Utilisateur
- ✅ Interface intuitive et facile à utiliser
- ✅ Navigation fluide entre les modules
- ✅ Feedback utilisateur clair
- ✅ Design moderne et professionnel

---

## 🚀 Perspectives d'Avenir

### Évolutions à Court Terme (3-6 mois)
- Intégration d'un système de paiement en ligne
- Notifications par email/SMS pour les alertes
- Gestion avancée des inventaires
- Application mobile native (iOS/Android)

### Évolutions à Moyen Terme (6-12 mois)
- Intégration avec des systèmes de facturation
- Gestion des prescriptions médicales
- Module de gestion des employés
- Analytics avancés avec machine learning

### Évolutions à Long Terme (1-2 ans)
- Multi-pharmacies (franchise)
- Intégration avec les systèmes de santé publics
- Marketplace B2B pour les pharmacies
- Intelligence artificielle pour les prévisions

---

## 📞 Contact et Support

### Équipe de Développement
- **Développeur Principal**: [Nom du développeur]
- **Email**: [Email de contact]
- **Téléphone**: [Numéro de téléphone]

### Support Utilisateur
- **Email**: support@pharmacie-emeraude.com
- **Documentation**: Disponible dans le README.md
- **Issues**: Via le repository GitHub

---

## 📝 Annexes

### A. Glossaire
- **API**: Application Programming Interface
- **CRUD**: Create, Read, Update, Delete
- **JWT**: JSON Web Token
- **REST**: Representational State Transfer
- **SQL**: Structured Query Language
- **UI**: User Interface
- **UX**: User Experience

### B. Références
- Material Design 3: https://m3.material.io/
- TailwindCSS: https://tailwindcss.com/
- Express.js: https://expressjs.com/
- SQLite: https://www.sqlite.org/

### C. Normes et Standards
- WCAG 2.1: Web Content Accessibility Guidelines
- RGPD: Règlement Général sur la Protection des Données
- OWASP: Open Web Application Security Project

---

**Version du Document**: 1.0
**Date de Création**: 10 juillet 2026
**Dernière Modification**: 10 juillet 2026
**Statut**: Validé
