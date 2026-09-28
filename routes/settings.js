/**
 * Paramètres de la pharmacie (affichés sur les reçus)
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db/mysql');
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeRole } = require('../middleware/auth');
const { validateOrThrow } = require('../utils/validate');

const SCHEMA = {
    nom_pharmacie: { type: 'string', required: true, max: 150, label: 'Nom de la pharmacie' },
    adresse: { type: 'string', max: 300, label: 'Adresse' },
    telephone: { type: 'string', max: 50, label: 'Téléphone' },
    message_recu: { type: 'string', max: 300, label: 'Message sur le reçu' }
};

async function readSettings() {
    const rows = await query('SELECT cle, valeur FROM parametres');
    return Object.fromEntries(rows.map(r => [r.cle, r.valeur]));
}

router.get('/', asyncHandler(async (req, res) => {
    res.json(await readSettings());
}));

router.put('/', authorizeRole('admin'), asyncHandler(async (req, res) => {
    const data = validateOrThrow(req.body, SCHEMA);
    for (const [cle, valeur] of Object.entries(data)) {
        await query(
            'INSERT INTO parametres (cle, valeur) VALUES (?, ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)',
            [cle, valeur]
        );
    }
    res.json(await readSettings());
}));

module.exports = router;
