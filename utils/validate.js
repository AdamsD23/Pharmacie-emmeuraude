/**
 * Validation des données reçues par l'API à partir d'un schéma simple.
 *
 * Exemple :
 *   const { data, errors } = validate(req.body, {
 *       nom: { type: 'string', required: true, max: 200 },
 *       prix: { type: 'number', required: true, min: 0 }
 *   });
 */

const { AppError } = require('../middleware/errorHandler');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[\d\s\-+().]{7,20}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isEmpty(value) {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * @param {object} body - données reçues
 * @param {object} schema - règles par champ
 * @param {object} [options] - { partial: true } pour une mise à jour (champs absents ignorés)
 */
function validate(body = {}, schema, options = {}) {
    const data = {};
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
        const label = rule.label || field;
        const raw = body[field];

        if (isEmpty(raw)) {
            if (rule.required && !(options.partial && !(field in body))) {
                errors.push(`${label} est obligatoire`);
            } else if (field in body || !options.partial) {
                data[field] = rule.default !== undefined ? rule.default : null;
            }
            continue;
        }

        let value = raw;
        switch (rule.type) {
            case 'string':
            case 'email':
            case 'phone': {
                value = String(raw).trim();
                if (rule.max && value.length > rule.max) errors.push(`${label} : ${rule.max} caractères maximum`);
                if (rule.min && value.length < rule.min) errors.push(`${label} : ${rule.min} caractères minimum`);
                if (rule.type === 'email' && !EMAIL.test(value)) errors.push(`${label} invalide`);
                if (rule.type === 'phone' && !PHONE.test(value)) errors.push(`${label} invalide`);
                if (rule.pattern && !rule.pattern.test(value)) errors.push(`${label} invalide`);
                break;
            }
            case 'int':
            case 'number': {
                value = Number(raw);
                if (!Number.isFinite(value) || (rule.type === 'int' && !Number.isInteger(value))) {
                    errors.push(`${label} doit être un nombre${rule.type === 'int' ? ' entier' : ''}`);
                    break;
                }
                if (rule.min !== undefined && value < rule.min) errors.push(`${label} doit être au moins ${rule.min}`);
                if (rule.max !== undefined && value > rule.max) errors.push(`${label} doit être au plus ${rule.max}`);
                break;
            }
            case 'date': {
                value = String(raw).slice(0, 10);
                if (!DATE.test(value) || Number.isNaN(Date.parse(value))) errors.push(`${label} : date invalide`);
                break;
            }
            case 'enum': {
                if (!rule.values.includes(raw)) errors.push(`${label} : valeur non autorisée`);
                break;
            }
            case 'boolean': {
                value = raw === true || raw === 'true' || raw === 1 || raw === '1';
                break;
            }
            default:
                break;
        }
        data[field] = value;
    }

    return { data, errors };
}

/**
 * Valide et lève une erreur 400 si les données sont incorrectes
 */
function validateOrThrow(body, schema, options) {
    const { data, errors } = validate(body, schema, options);
    if (errors.length) {
        const error = new AppError(errors.join(' • '), 400, 'INVALID_DATA');
        error.details = errors;
        throw error;
    }
    return data;
}

/**
 * Convertit un paramètre d'URL en identifiant entier positif
 */
function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Identifiant invalide', 400, 'INVALID_ID');
    return id;
}

module.exports = { validate, validateOrThrow, parseId };
