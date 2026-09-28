/**
 * Rate limiting personnalisé
 */

class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 900000; // 15 minutes
        this.maxRequests = options.maxRequests || 100;
        this.requests = new Map();
    }

    /**
     * Nettoie les anciennes données
     */
    cleanUpOldData() {
        const now = Date.now();
        for (const [key, data] of this.requests.entries()) {
            if (now - data.resetTime > this.windowMs) {
                this.requests.delete(key);
            }
        }
    }

    /**
     * Middleware de rate limiting
     */
    middleware() {
        return (req, res, next) => {
            const key = req.ip || req.connection.remoteAddress;
            const now = Date.now();

            this.cleanUpOldData();

            if (!this.requests.has(key)) {
                this.requests.set(key, {
                    count: 0,
                    resetTime: now
                });
            }

            const data = this.requests.get(key);

            // Réinitialiser si la fenêtre est expirée
            if (now - data.resetTime > this.windowMs) {
                data.count = 0;
                data.resetTime = now;
            }

            data.count++;

            // Définir les headers
            res.setHeader('X-RateLimit-Limit', this.maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - data.count));
            res.setHeader('X-RateLimit-Reset', new Date(data.resetTime + this.windowMs).toISOString());

            if (data.count > this.maxRequests) {
                return res.status(429).json({
                    error: 'Trop de requêtes - limite de débit atteinte',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil((data.resetTime + this.windowMs - now) / 1000)
                });
            }

            next();
        };
    }
}

module.exports = RateLimiter;
