document.addEventListener('DOMContentLoaded', function () {

    document.querySelector('[data-action="export-report"]')?.addEventListener('click', async function () {
        try {
            const stats = await window.pharmacieAPI.stats.get();
            exportReport(stats);
        } catch (error) {
            alert('Erreur lors de la génération du rapport: ' + error.message);
        }
    });

    document.querySelector('[data-action="new-sale"]')?.addEventListener('click', function () {
        window.location.href = 'caissesetvente.html';
    });

    document.querySelectorAll('.bg-surface-container-low.p-md.rounded-xl').forEach(btn => {
        btn.addEventListener('click', function () {
            const text = this.querySelector('span.font-label-md')?.textContent?.trim();
            const routes = {
                'Scanner Ordonnance': null,
                'Fiches Clients': 'clients.html',
                'Livraisons': 'historiquedeslivraison.html',
                'Configuration': 'profile.html'
            };
            if (routes[text]) {
                window.location.href = routes[text];
            } else if (text === 'Scanner Ordonnance') {
                alert('Fonctionnalité de scan d\'ordonnance — bientôt disponible.');
            }
        });
    });

    document.querySelector('button[data-icon="menu"]')?.addEventListener('click', function () {
        const sidebar = document.querySelector('nav.fixed');
        if (sidebar) sidebar.classList.toggle('hidden');
    });

    document.querySelector('button[data-icon="notifications"]')?.addEventListener('click', async function () {
        try {
            const [stats, lowStock] = await Promise.all([
                window.pharmacieAPI.stats.get(),
                window.pharmacieAPI.products.getLowStock()
            ]);
            const alerts = lowStock.slice(0, 3).map(p => `- ${p.name}: ${p.stock} unités`).join('\n');
            alert(`Notifications:\n- ${stats.low_stock} produits en stock faible\n- ${stats.total_sales} ventes enregistrées\n\nAlertes:\n${alerts || 'Aucune'}`);
        } catch (error) {
            alert('Impossible de charger les notifications.');
        }
    });
});

function exportReport(stats) {
    const reportContent = `Rapport Pharmacie Émeraude
===========================
Date: ${new Date().toLocaleDateString('fr-FR')}

STATISTIQUES
------------
Produits: ${stats.total_products}
Clients: ${stats.total_clients}
Ventes: ${stats.total_sales}
Chiffre d'affaires total: ${stats.total_revenue} FCFA
Chiffre d'affaires du jour: ${stats.today_revenue} FCFA
Alertes stock: ${stats.low_stock}
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-pharmacie-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}
