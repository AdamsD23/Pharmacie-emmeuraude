const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

const TOKEN_KEY = 'pharmacie_token';
const USER_KEY = 'pharmacie_user';
const PUBLIC_PAGES = ['dashboard.html', '/dashboard.html', '', '/'];

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
}

function formatFCFA(amount) {
    return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}

function isPublicPage() {
    const page = window.location.pathname.split('/').pop() || '';
    return PUBLIC_PAGES.includes(page) || page === 'dashboard.html';
}

function requireAuth() {
    if (!isPublicPage() && !getToken()) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: getAuthHeaders()
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            clearAuth();
            if (!isPublicPage()) {
                window.location.href = 'dashboard.html';
            }
        }
        throw new Error(result.error || 'Erreur API');
    }

    return result;
}

const authAPI = {
    async login(username, password) {
        const result = await apiCall('/login', 'POST', { username, password });
        setToken(result.token);
        setUser(result.user);
        return result;
    },

    async register(username, password, email, role = 'user') {
        return await apiCall('/register', 'POST', { username, password, email, role });
    },

    logout() {
        clearAuth();
        try {
            sessionStorage.setItem('pharmacie_toast', 'Vous êtes déconnecté');
        } catch (e) { /* ignore */ }
        window.location.href = 'dashboard.html';
    },
};

const ordersAPI = {
    async getAll() {
        return await apiCall('/orders');
    },

    async getById(id) {
        return await apiCall(`/orders/${id}`);
    },

    async create(orderData) {
        return await apiCall('/orders', 'POST', orderData);
    },

    async update(id, orderData) {
        return await apiCall(`/orders/${id}`, 'PUT', orderData);
    },

    async delete(id) {
        return await apiCall(`/orders/${id}`, 'DELETE');
    },

    async getPending() {
        return await apiCall('/orders/pending');
    },
};

const pharmaciesAPI = {
    async getAll() {
        return await apiCall('/pharmacies');
    },

    async getById(id) {
        return await apiCall(`/pharmacies/${id}`);
    },

    async create(pharmacyData) {
        return await apiCall('/pharmacies', 'POST', pharmacyData);
    },

    async update(id, pharmacyData) {
        return await apiCall(`/pharmacies/${id}`, 'PUT', pharmacyData);
    },

    async delete(id) {
        return await apiCall(`/pharmacies/${id}`, 'DELETE');
    },

    async getEmergency() {
        return await apiCall('/pharmacies/emergency');
    },
};

const authHelpers = {
    isAuthenticated() {
        return !!getToken();
    },

    getCurrentUser() {
        return getUser();
    }
};

const productsAPI = {
    async getAll() {
        return await apiCall('/products');
    },
    async getById(id) {
        return await apiCall(`/products/${id}`);
    },
    async create(productData) {
        return await apiCall('/products', 'POST', productData);
    },
    async update(id, productData) {
        return await apiCall(`/products/${id}`, 'PUT', productData);
    },
    async delete(id) {
        return await apiCall(`/products/${id}`, 'DELETE');
    },
    async getLowStock() {
        return await apiCall('/products/alerts/low-stock');
    }
};

const salesAPI = {
    async getAll() {
        return await apiCall('/sales');
    },
    async create(saleData) {
        return await apiCall('/sales', 'POST', saleData);
    },
    async delete(id) {
        return await apiCall(`/sales/${id}`, 'DELETE');
    }
};

const suppliersAPI = {
    async getAll() {
        return await apiCall('/suppliers');
    },
    async create(supplierData) {
        return await apiCall('/suppliers', 'POST', supplierData);
    },
    async update(id, supplierData) {
        return await apiCall(`/suppliers/${id}`, 'PUT', supplierData);
    },
    async delete(id) {
        return await apiCall(`/suppliers/${id}`, 'DELETE');
    }
};

const clientsAPI = {
    async getAll() {
        return await apiCall('/clients');
    },
    async create(clientData) {
        return await apiCall('/clients', 'POST', clientData);
    },
    async update(id, clientData) {
        return await apiCall(`/clients/${id}`, 'PUT', clientData);
    },
    async delete(id) {
        return await apiCall(`/clients/${id}`, 'DELETE');
    }
};

const statsAPI = {
    async get() {
        return await apiCall('/stats');
    }
};

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderStockAlerts(products) {
    const container = document.getElementById('stock-alerts-container');
    if (!container) return;

    if (!products.length) {
        container.innerHTML = '<p class="font-body-md text-body-md text-on-surface-variant col-span-full">Aucune alerte de stock pour le moment.</p>';
        return;
    }

    container.innerHTML = products.map(product => {
        const isOut = product.stock === 0;
        const borderClass = isOut ? 'border-error-container' : 'border-tertiary-container';
        const badgeClass = isOut ? 'bg-error-container text-on-error-container' : 'bg-tertiary-container text-on-tertiary-container';
        const label = isOut ? 'Rupture de stock' : 'Stock faible';
        const action = isOut ? 'Commander maintenant' : 'Vente prioritaire';

        return `
            <div class="bg-surface-container-lowest border ${borderClass} rounded-xl p-md flex flex-col justify-between bento-card">
                <div class="flex justify-between items-start mb-md">
                    <div class="${badgeClass} px-2 py-1 rounded-full flex items-center gap-xs">
                        <img src="images/${isOut ? 'warning' : 'inventory_2'}.svg" class="icon-img" style="width:16px;height:16px" alt="">
                        <span class="font-label-md text-label-md">${label}</span>
                    </div>
                    <span class="font-bold font-label-md text-label-md ${isOut ? 'text-error' : 'text-tertiary'}">${product.stock} unités</span>
                </div>
                <div>
                    <h4 class="font-title-lg text-title-lg text-on-surface mb-xs">${product.name}</h4>
                    <p class="font-body-md text-body-md text-on-surface-variant">${product.category || 'Général'} — ${product.supplier || 'Sans fournisseur'}</p>
                </div>
                <button onclick="window.location.href='caissesetvente.html?product=${encodeURIComponent(product.name)}'" class="mt-md w-full border ${isOut ? 'border-tertiary text-tertiary hover:bg-tertiary-fixed' : 'border-error text-error hover:bg-error-container'} py-2 rounded-lg font-label-md text-label-md transition-colors">${action}</button>
            </div>
        `;
    }).join('');
}

const dashboardAPI = {
    async load() {
        try {
            const [stats, lowStock] = await Promise.all([
                statsAPI.get(),
                productsAPI.getLowStock()
            ]);

            setText('stat-total-sales', stats.total_sales);
            setText('stat-total-clients', stats.total_clients);
            setText('stat-total-products', stats.total_products);
            setText('stat-total-revenue', formatFCFA(stats.total_revenue));

            const todayEl = document.getElementById('stat-today-revenue');
            if (todayEl) {
                todayEl.innerHTML = `${Number(stats.today_revenue || 0).toLocaleString('fr-FR')} <span class="text-headline-sm">FCFA</span>`;
            }

            setText('stat-low-stock-label', `${stats.low_stock} produit${stats.low_stock > 1 ? 's' : ''} en stock faible`);
            renderStockAlerts(lowStock.slice(0, 3));
        } catch (error) {
            console.error('Erreur dashboard:', error);
        }
    }
};

function setupLoginForm() {
    const form = document.querySelector('form');
    if (!form || !window.location.pathname.includes('dashboard.html')) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;
        const usernameElement = document.getElementById('email') || document.getElementById('username');
        const username = usernameElement ? usernameElement.value.trim() : '';
        const password = document.getElementById('password')?.value || '';

        btn.disabled = true;
        btn.innerHTML = '<span>Connexion...</span>';

        if (!username || !password) {
            alert('Veuillez saisir votre identifiant et votre mot de passe.');
            btn.innerHTML = originalContent;
            btn.disabled = false;
            return;
        }

        try {
            await authAPI.login(username, password);
            window.location.href = 'tableaudebordpharmacy.html';
        } catch (error) {
            alert('Identifiants invalides. Vérifiez vos identifiants et réessayez.');
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    });
}

function initApp() {
    // Do not auto-redirect solely based on a stored token to force manual login.
    // If you want persistent sessions, implement server-side token validation.
    //requireAuth();
    setupLoginForm();

    // Add a global logout button on non-public pages when authenticated
    try {
        if (authAPI.isAuthenticated() && !isPublicPage()) {
            if (!document.getElementById('global-logout-btn')) {
                const btn = document.createElement('button');
                btn.id = 'global-logout-btn';
                btn.className = 'fixed top-4 right-4 z-50 inline-flex items-center gap-2 px-3 py-2 bg-white text-error border border-error rounded-md shadow hover:bg-error-container/10 transition transform hover:scale-105';
                btn.setAttribute('aria-label', 'Se déconnecter');
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"/></svg><span class="font-label-md">Se déconnecter</span>';
                btn.onclick = () => {
                    if (confirm('Voulez-vous vous déconnecter ?')) {
                        authAPI.logout();
                    }
                };
                document.body.appendChild(btn);
            }
        }
    } catch (e) { /* ignore when DOM not ready */ }

    // Show toast if logout occurred on previous page
    try {
        const toastMsg = sessionStorage.getItem('pharmacie_toast');
        if (toastMsg) {
            sessionStorage.removeItem('pharmacie_toast');
            const t = document.createElement('div');
            t.className = 'fixed bottom-4 right-4 z-50 inline-flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-md shadow-lg';
            t.style.backdropFilter = 'blur(6px)';
            t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg><span class="font-body-md text-body-md">${toastMsg}</span>`;
            document.body.appendChild(t);
            // auto-hide after 4s
            setTimeout(() => { t.style.transition = 'opacity 400ms'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 4000);
        }
    } catch (e) { /* ignore sessionStorage errors */ }

    if (document.getElementById('stat-total-products')) {
        dashboardAPI.load();
    }
}

window.pharmacieAPI = {
    auth: authAPI,
    products: productsAPI,
    sales: salesAPI,
    suppliers: suppliersAPI,
    clients: clientsAPI,
    stats: statsAPI,
    orders: ordersAPI,
    pharmacies: pharmaciesAPI,
    dashboard: dashboardAPI,
    helpers: authHelpers,
    init: initApp,
    formatFCFA
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
