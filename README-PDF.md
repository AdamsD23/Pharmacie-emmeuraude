# Conversion HTML vers PDF

Pour convertir toutes les pages HTML de votre projet pharmacie en un seul PDF:

## Étapes:

1. **Installer Node.js** (si ce n'est pas déjà fait)
   - Téléchargez et installez Node.js depuis https://nodejs.org/

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer la conversion**
   ```bash
   npm run convert
   ```

4. **Résultat**
   - Un fichier `pharmacie-emeraude-complet.pdf` sera créé dans le dossier du projet
   - Ce PDF contiendra toutes vos pages HTML converties

## Notes:
- Le script convertit tous les fichiers HTML du projet
- Chaque page HTML devient une page du PDF
- Le processus peut prendre quelques minutes
- Assurez-vous d'avoir une connexion internet pour la première installation des dépendances
