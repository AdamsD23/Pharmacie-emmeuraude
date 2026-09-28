/**
 * Routes Pharmacies de Garde
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db/mysql');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequired, sanitizeBody } = require('../middleware/validation');
const Logger = require('../utils/logger');
const config = require('../config');

const logger = new Logger({ level: config.LOG_LEVEL });

/**
 * GET /api/pharmacies
 * Récupère toutes les pharmacies de garde
 */
router.get('/', asyncHandler(async (req, res) => {
    const pharmacies = await query(
        'SELECT * FROM pharmacies ORDER BY nom ASC'
    );
    res.json(pharmacies);
}));

/**
 * GET /api/pharmacies/:id
 * Récupère une pharmacie spécifique
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const pharmacies = await query(
        'SELECT * FROM pharmacies WHERE id = ?',
        [req.params.id]
    );
    const pharmacy = pharmacies[0];

    if (!pharmacy) {
        return res.status(404).json({
            error: 'Pharmacie non trouvée',
            code: 'PHARMACY_NOT_FOUND'
        });
    }

    res.json(pharmacy);
}));

/**
 * POST /api/pharmacies
 * Crée une nouvelle pharmacie de garde
 */
router.post('/', 
    authenticateToken,
    sanitizeBody,
    validateRequired('name', 'address', 'phone', 'schedule'),
    asyncHandler(async (req, res) => {
        const { name, address, phone, schedule, is_24h = false, emergency_contact } = req.body;

        const result = await query(
            `INSERT INTO pharmacies (nom, adresse, telephone, horaires, est_24h, contact_urgence)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, address, phone, schedule, is_24h, emergency_contact]
        );

        logger.info('Nouvelle pharmacie créée', { pharmacyId: result.insertId });

        const newPharmacies = await query('SELECT * FROM pharmacies WHERE id = ?', [result.insertId]);
        res.status(201).json(newPharmacies[0]);
    })
);

/**
 * PUT /api/pharmacies/:id
 * Met à jour une pharmacie
 */
router.put('/:id', 
    authenticateToken,
    sanitizeBody,
    asyncHandler(async (req, res) => {
        const { name, address, phone, schedule, is_24h, emergency_contact } = req.body;

        const existingPharmacies = await query('SELECT * FROM pharmacies WHERE id = ?', [req.params.id]);
        if (existingPharmacies.length === 0) {
            return res.status(404).json({
                error: 'Pharmacie non trouvée',
                code: 'PHARMACY_NOT_FOUND'
            });
        }

        await query(
            `UPDATE pharmacies 
             SET nom = COALESCE(?, nom),
                 adresse = COALESCE(?, adresse),
                 telephone = COALESCE(?, telephone),
                 horaires = COALESCE(?, horaires),
                 est_24h = COALESCE(?, est_24h),
                 contact_urgence = COALESCE(?, contact_urgence)
             WHERE id = ?`,
            [name, address, phone, schedule, is_24h, emergency_contact, req.params.id]
        );

        logger.info('Pharmacie mise à jour', { pharmacyId: req.params.id });

        const updatedPharmacies = await query('SELECT * FROM pharmacies WHERE id = ?', [req.params.id]);
        res.json(updatedPharmacies[0]);
    })
);

/**
 * DELETE /api/pharmacies/:id
 * Supprime une pharmacie
 */
router.delete('/:id', 
    authenticateToken,
    asyncHandler(async (req, res) => {
        const existingPharmacies = await query('SELECT * FROM pharmacies WHERE id = ?', [req.params.id]);
        if (existingPharmacies.length === 0) {
            return res.status(404).json({
                error: 'Pharmacie non trouvée',
                code: 'PHARMACY_NOT_FOUND'
            });
        }

        await query('DELETE FROM pharmacies WHERE id = ?', [req.params.id]);

        logger.info('Pharmacie supprimée', { pharmacyId: req.params.id });

        res.json({ message: 'Pharmacie supprimée avec succès' });
    })
);

/**
 * GET /api/pharmacies/emergency
 * Récupère les pharmacies d'urgence (24h)
 */
router.get('/emergency', asyncHandler(async (req, res) => {
    const pharmacies = await query(
        `SELECT * FROM pharmacies 
         WHERE est_24h = 1 
         ORDER BY nom ASC`
    );
    res.json(pharmacies);
}));

module.exports = router;
