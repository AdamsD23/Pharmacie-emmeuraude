// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Token storage
const TOKEN_KEY = 'pharmacie_token';
const USER_KEY = 'pharmacie_user';

// Helper functions
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
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

// API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: getAuthHeaders()
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur API');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication API
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
        window.location.href = '/tableaudebordpharmacy.html';
    },
    
    isAuthenticated() {
        return !!getToken();
    },
    
    getCurrentUser() {
        return getUser();
    }
};

// Products API
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
    }
};

// Sales API
const salesAPI = {
    async getAll() {
        return await apiCall('/sales');
    },
    
    async create(saleData) {
        return await apiCall('/sales', 'POST', saleData);
    }
};

// Suppliers API
const suppliersAPI = {
    async getAll() {
        return await apiCall('/suppliers');
    },
    
    async create(supplierData) {
        return await apiCall('/suppliers', 'POST', supplierData);
    }
};

// Clients API
const clientsAPI = {
    async getAll() {
        return await apiCall('/clients');
    },
    
    async create(clientData) {
        return await apiCall('/clients', 'POST', clientData);
    }
};

// Stats API
const statsAPI = {
    async get() {
        return await apiCall('/stats');
    }
};

// Initialize app
function initApp() {
    // Check authentication on page load
    if (!authAPI.isAuthenticated()) {
        // Redirect to login or show login modal
        console.log('Non authentifié');
    }
    
    // Load dashboard data
    loadDashboardData();
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const stats = await statsAPI.get();
        updateDashboardUI(stats);
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

// Update dashboard UI with stats
function updateDashboardUI(stats) {
    // Update revenue
    const revenueElement = document.querySelector('.font-display-lg');
    if (revenueElement && stats.total_revenue) {
        revenueElement.innerHTML = `${stats.total_revenue.toLocaleString()} <span class="text-headline-sm">FCFA</span>`;
    }
    
    // Update other stats as needed
    console.log('Stats:', stats);
}

// Export for use in HTML files
window.pharmacieAPI = {
    auth: authAPI,
    products: productsAPI,
    sales: salesAPI,
    suppliers: suppliersAPI,
    clients: clientsAPI,
    stats: statsAPI,
    init: initApp
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
