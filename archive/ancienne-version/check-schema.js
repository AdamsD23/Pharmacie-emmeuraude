const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./pharmacie.db');

console.log('Vérification du schéma...\n');

db.all("PRAGMA table_info(users);", [], (err, rows) => {
    if (err) {
        console.error('Erreur:', err.message);
    } else {
        console.log('Colonnes de la table users:');
        rows.forEach(r => console.log(`  ${r.name}: ${r.type}`));
    }
    db.close();
});
