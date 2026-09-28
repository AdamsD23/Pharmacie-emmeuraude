/**
 * Validateurs pour les données de l'application
 */

const config = require('../config');

class Validators {
    /**
     * Valide un email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Valide un nom d'utilisateur
     */
    static isValidUsername(username) {
        return username && username.length >= config.USERNAME_MIN_LENGTH && /^[a-zA-Z0-9_-]+$/.test(username);
    }

    /**
     * Valide un mot de passe
     */
    static isValidPassword(password) {
        return password && password.length >= config.PASSWORD_MIN_LENGTH;
    }

    /**
     * Valide un téléphone
     */
    static isValidPhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Valide un numéro
     */
    static isValidNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Valide une date
     */
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Sanitize input - supprime les caractères dangereux
     */
    static sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str
            .trim()
            .replace(/[<>]/g, '')
            .slice(0, 500);
    }

    /**
     * Valide les données de produit
     */
    static validateProduct(product) {
        const errors = [];

        if (!product.name || product.name.trim().length === 0) {
            errors.push('Le nom du produit est requis');
        }

        if (!this.isValidNumber(product.price) || product.price <= 0) {
            errors.push('Le prix doit être un nombre positif');
        }

        if (!this.isValidNumber(product.stock) || product.stock < 0) {
            errors.push('Le stock doit être un nombre positif ou zéro');
        }

        if (product.expiry_date && !this.isValidDate(product.expiry_date)) {
            errors.push('La date d\'expiration est invalide');
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Valide les données de vente
     */
    static validateSale(sale) {
        const errors = [];

        if (!this.isValidNumber(sale.product_id) || sale.product_id <= 0) {
            errors.push('L\'ID du produit est invalide');
        }

        if (!this.isValidNumber(sale.quantity) || sale.quantity <= 0) {
            errors.push('La quantité doit être positive');
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Valide les données de client
     */
    static validateClient(client) {
        const errors = [];

        if (!client.name || client.name.trim().length === 0) {
            errors.push('Le nom est requis');
        }

        if (client.email && !this.isValidEmail(client.email)) {
            errors.push('Email invalide');
        }

        if (client.phone && !this.isValidPhone(client.phone)) {
            errors.push('Numéro de téléphone invalide');
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Valide les données de fournisseur
     */
    static validateSupplier(supplier) {
        const errors = [];

        if (!supplier.name || supplier.name.trim().length === 0) {
            errors.push('Le nom du fournisseur est requis');
        }

        if (supplier.email && !this.isValidEmail(supplier.email)) {
            errors.push('Email invalide');
        }

        if (supplier.phone && !this.isValidPhone(supplier.phone)) {
            errors.push('Numéro de téléphone invalide');
        }

        return { isValid: errors.length === 0, errors };
    }
}

module.exports = Validators;
