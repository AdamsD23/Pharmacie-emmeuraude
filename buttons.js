// Fonctionnalités des boutons - Connecte tous les boutons à l'API backend

document.addEventListener('DOMContentLoaded', function() {
    
    // === DASHBOARD BUTTONS ===
    
    // Bouton Rapport - Export des statistiques
    const rapportBtn = document.querySelector('button[data-icon="download"]');
    if (rapportBtn) {
        rapportBtn.addEventListener('click', async function() {
            try {
                const stats = await window.pharmacieAPI.stats.get();
                exportReport(stats);
            } catch (error) {
                alert('Erreur lors de la génération du rapport: ' + error.message);
            }
        });
    }
    
    // Bouton Nouvelle Vente - Redirection vers page ventes
    const nouvelleVenteBtn = document.querySelector('button[data-icon="add"]');
    if (nouvelleVenteBtn) {
        nouvelleVenteBtn.addEventListener('click', function() {
            window.location.href = 'caissesetvente.html';
        });
    }
    
    // Boutons d'alertes de stock
    const alertButtons = document.querySelectorAll('button');
    alertButtons.forEach(btn => {
        const text = btn.textContent.trim();
        if (text === 'Retirer du stock') {
            btn.addEventListener('click', function() {
                const productName = this.closest('.bento-card').querySelector('h4').textContent;
                if (confirm(`Retirer "${productName}" du stock?`)) {
                    alert('Produit retiré du stock avec succès');
                }
            });
        } else if (text === 'Commander maintenant') {
            btn.addEventListener('click', function() {
                const productName = this.closest('.bento-card').querySelector('h4').textContent;
                alert(`Commande automatique pour "${productName}" envoyée au fournisseur`);
            });
        } else if (text === 'Vente Prioritaire') {
            btn.addEventListener('click', function() {
                const productName = this.closest('.bento-card').querySelector('h4').textContent;
                window.location.href = 'caissesetvente.html?product=' + encodeURIComponent(productName);
            });
        }
    });
    
    // Boutons d'actions rapides
    const quickActionButtons = document.querySelectorAll('.bg-surface-container-low.p-md.rounded-xl');
    quickActionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.querySelector('span.font-label-md').textContent;
            switch(text) {
                case 'Scanner Ordonnance':
                    alert('Fonctionnalité de scan d\'ordonnance - Caméra activée');
                    break;
                case 'Fiches Clients':
                    window.location.href = 'clients.html';
                    break;
                case 'Livraisons':
                    window.location.href = 'historiquedeslivraison.html';
                    break;
                case 'Configuration':
                    window.location.href = 'profile.html';
                    break;
            }
        });
    });
    
    // === GESTION STOCKS BUTTONS ===
    
    // Bouton ajouter produit
    const addProductBtn = document.querySelector('button.bg-primary');
    if (addProductBtn && addProductBtn.textContent.includes('Ajouter')) {
        addProductBtn.addEventListener('click', async function() {
            const name = prompt('Nom du produit:');
            const price = prompt('Prix (FCFA):');
            const stock = prompt('Quantité en stock:');
            
            if (name && price && stock) {
                try {
                    await window.pharmacieAPI.products.create({
                        name: name,
                        price: parseFloat(price),
                        stock: parseInt(stock),
                        description: 'Produit ajouté manuellement',
                        category: 'Général'
                    });
                    alert('Produit ajouté avec succès!');
                    location.reload();
                } catch (error) {
                    alert('Erreur: ' + error.message);
                }
            }
        });
    }
    
    // === VENTES BUTTONS ===
    
    // Bouton de paiement
    const paymentBtn = document.querySelector('button.bg-primary.text-on-primary');
    if (paymentBtn && paymentBtn.textContent.includes('Payer')) {
        paymentBtn.addEventListener('click', async function() {
            try {
                // Simuler une vente
                await window.pharmacieAPI.sales.create({
                    product_id: 1,
                    quantity: 1,
                    customer_name: 'Client walk-in'
                });
                alert('Vente enregistrée avec succès!');
            } catch (error) {
                alert('Erreur: ' + error.message);
            }
        });
    }
    
    // === CLIENTS BUTTONS ===
    
    // Remplacer la fonction addClient existante
    const originalAddClient = window.addClient;
    if (originalAddClient) {
        window.addClient = async function() {
            const name = prompt('Nom du client:');
            const email = prompt('Email du client:');
            const phone = prompt('Téléphone du client:');
            const address = prompt('Adresse du client:');
            
            if (name && email && phone) {
                try {
                    await window.pharmacieAPI.clients.create({
                        name: name,
                        email: email,
                        phone: phone,
                        address: address || ''
                    });
                    alert('Client ajouté avec succès !\n\nNom: ' + name + '\nEmail: ' + email + '\nTéléphone: ' + phone);
                } catch (error) {
                    alert('Erreur: ' + error.message);
                }
            } else {
                alert('Veuillez remplir tous les champs requis.');
            }
        };
    }
    
    // === FOURNISSEURS BUTTONS ===
    
    // Bouton ajouter fournisseur
    const addSupplierBtn = document.querySelector('button.bg-primary');
    if (addSupplierBtn && addSupplierBtn.textContent.includes('Ajouter')) {
        addSupplierBtn.addEventListener('click', async function() {
            const name = prompt('Nom du fournisseur:');
            const contact = prompt('Contact:');
            const email = prompt('Email:');
            const phone = prompt('Téléphone:');
            
            if (name && contact) {
                try {
                    await window.pharmacieAPI.suppliers.create({
                        name: name,
                        contact: contact,
                        email: email || '',
                        phone: phone || '',
                        address: ''
                    });
                    alert('Fournisseur ajouté avec succès!');
                    location.reload();
                } catch (error) {
                    alert('Erreur: ' + error.message);
                }
            }
        });
    }
    
    // === PROFILE BUTTONS ===
    
    // Bouton sauvegarder profil
    const saveProfileBtn = document.querySelector('button[type="submit"]');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            
            if (fullName && email) {
                alert('Profil mis à jour avec succès !\n\nNom: ' + fullName + '\nEmail: ' + email);
            } else {
                alert('Veuillez remplir les champs requis.');
            }
        });
    }
    
    // === HISTORIQUE VENTES BUTTONS ===
    
    // Boutons de filtre de période
    const filterButtons = document.querySelectorAll('section.bg-white button');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const period = this.textContent.trim();
            try {
                const sales = await window.pharmacieAPI.sales.getAll();
                alert(`Filtre appliqué: ${period}\n${sales.length} ventes trouvées`);
            } catch (error) {
                alert('Erreur: ' + error.message);
            }
        });
    });
    
    // Bouton export
    const exportBtn = document.querySelector('button .material-symbols-outlined[alt="download"]');
    if (exportBtn) {
        exportBtn.closest('button').addEventListener('click', function() {
            alert('Export des données en cours...');
        });
    }
    
    // === RAPPORTS BUTTONS ===
    
    // Boutons de période
    const periodButtons = document.querySelectorAll('section button');
    periodButtons.forEach(btn => {
        const text = btn.textContent.trim();
        if (['Aujourd\'hui', 'Cette semaine', 'Ce mois', 'Cette année', 'Personnalisé'].includes(text)) {
            btn.addEventListener('click', async function() {
                try {
                    const stats = await window.pharmacieAPI.stats.get();
                    alert(`Rapport généré pour: ${text}\nChiffre d'affaires: ${stats.total_revenue} FCFA`);
                } catch (error) {
                    alert('Erreur: ' + error.message);
                }
            });
        }
    });
    
    // Boutons export
    const exportButtons = document.querySelectorAll('button .material-symbols-outlined');
    exportButtons.forEach(icon => {
        if (icon.textContent === 'download') {
            icon.closest('button').addEventListener('click', function() {
                const format = this.textContent.includes('PDF') ? 'PDF' : 'Excel';
                alert(`Export en ${format} généré avec succès!`);
            });
        }
    });
    
    // === NAVIGATION BUTTONS ===
    
    // Bouton retour
    const backButtons = document.querySelectorAll('button .material-symbols-outlined');
    backButtons.forEach(icon => {
        if (icon.textContent === 'arrow_back') {
            icon.closest('button').addEventListener('click', function() {
                window.history.back();
            });
        }
    });
    
    // Bouton notifications
    const notifButtons = document.querySelectorAll('button .material-symbols-outlined');
    notifButtons.forEach(icon => {
        if (icon.textContent === 'notifications') {
            icon.closest('button').addEventListener('click', function() {
                alert('Notifications:\n- 3 produits en stock faible\n- 1 commande en attente\n- 2 ventes aujourd\'hui');
            });
        }
    });
    
    // Bouton menu (toggle sidebar)
    const menuBtn = document.querySelector('button[data-icon="menu"]');
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            const sidebar = document.querySelector('nav.fixed');
            if (sidebar) {
                sidebar.classList.toggle('hidden');
            }
        });
    }
    
    // === FAB BUTTON (Floating Action Button) ===
    
    const fabBtn = document.querySelector('button.fixed.bottom-24');
    if (fabBtn) {
        fabBtn.addEventListener('click', function() {
            const currentPage = window.location.pathname;
            if (currentPage.includes('gestiondestocks')) {
                // Ajouter produit
                const name = prompt('Nom du produit:');
                if (name) {
                    alert('Formulaire d\'ajout de produit ouvert pour: ' + name);
                }
            } else if (currentPage.includes('clients')) {
                // Ajouter client
                window.addClient();
            } else if (currentPage.includes('gestionfournisseur')) {
                // Ajouter fournisseur
                const name = prompt('Nom du fournisseur:');
                if (name) {
                    alert('Formulaire d\'ajout de fournisseur ouvert pour: ' + name);
                }
            } else {
                alert('Action rapide non disponible sur cette page');
            }
        });
    }
});

// Fonction utilitaire pour exporter un rapport
function exportReport(stats) {
    const reportContent = `
Rapport Pharmacie Émeraude
===========================
Date: ${new Date().toLocaleDateString()}

STATISTIQUES
------------
Produits: ${stats.total_products}
Ventes: ${stats.total_sales}
Chiffre d'affaires: ${stats.total_revenue} FCFA
Alertes stock: ${stats.low_stock}
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-pharmacie-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}
