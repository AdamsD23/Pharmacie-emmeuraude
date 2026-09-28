/**
 * Socle commun de l'interface Pharmacie Émeraude :
 * session, appels API, menu, notifications, fenêtres de formulaire, formatage, reçu et export CSV.
 */
(function () {
    'use strict';

    const TOKEN_KEY = 'pharmacie_token';
    const USER_KEY = 'pharmacie_user';

    const ROLE_LABELS = { admin: 'Administrateur', pharmacien: 'Pharmacien', vendeur: 'Vendeur' };
    const PAYMENT_LABELS = {
        especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money',
        mtn_money: 'MTN Money', moov_money: 'Moov Money', carte: 'Carte bancaire'
    };

    const NAV = [
        { href: 'tableau-de-bord.html', icon: 'dashboard', label: 'Tableau de bord' },
        { href: 'caisse.html', icon: 'point_of_sale', label: 'Caisse' },
        { href: 'ventes.html', icon: 'receipt_long', label: 'Ventes' },
        { href: 'stock.html', icon: 'inventory_2', label: 'Stock' },
        { href: 'clients.html', icon: 'group', label: 'Clients' },
        { href: 'fournisseurs.html', icon: 'local_shipping', label: 'Fournisseurs', roles: ['pharmacien'] },
        { href: 'commandes.html', icon: 'shopping_cart', label: 'Commandes', roles: ['pharmacien'] },
        { href: 'parametres.html', icon: 'settings', label: 'Paramètres', roles: ['admin'] }
    ];

    // ---------- Stockage (peut être indisponible en navigation privée) ----------
    const store = {
        get(key) { try { return localStorage.getItem(key); } catch { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignoré */ } },
        remove(key) { try { localStorage.removeItem(key); } catch { /* ignoré */ } }
    };

    // ---------- Formatage ----------
    const nf = new Intl.NumberFormat('fr-FR');
    function fcfa(value) { return `${nf.format(Math.round(Number(value) || 0)).replace(/ /g, ' ')} FCFA`; }
    function number(value) { return nf.format(Number(value) || 0).replace(/ /g, ' '); }

    // Les dates arrivent du serveur au format "AAAA-MM-JJ HH:MM:SS" (heure d'Abidjan = UTC)
    function parseDate(str) {
        if (!str) return null;
        const d = new Date(String(str).replace(' ', 'T') + (String(str).length > 10 ? 'Z' : 'T00:00:00Z'));
        return Number.isNaN(d.getTime()) ? null : d;
    }
    function date(str) {
        const d = parseDate(str);
        return d ? d.toLocaleDateString('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
    }
    function datetime(str) {
        const d = parseDate(str);
        return d ? d.toLocaleString('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    }
    function today(offsetDays = 0) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + offsetDays);
        return d.toISOString().slice(0, 10);
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function debounce(fn, wait = 250) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
    }

    // ---------- Session ----------
    function getToken() { return store.get(TOKEN_KEY); }
    function getUser() { try { return JSON.parse(store.get(USER_KEY)); } catch { return null; } }
    function saveSession(token, user) { store.set(TOKEN_KEY, token); store.set(USER_KEY, JSON.stringify(user)); }
    function logout(message) {
        store.remove(TOKEN_KEY);
        store.remove(USER_KEY);
        const target = message ? `index.html?message=${encodeURIComponent(message)}` : 'index.html';
        window.location.href = target;
    }

    function can(...roles) {
        const user = App.user || getUser();
        return !!user && (user.role === 'admin' || roles.includes(user.role));
    }

    // ---------- API ----------
    async function api(path, { method = 'GET', body } = {}) {
        let response;
        try {
            response = await fetch(`/api${path}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(getToken() && { Authorization: `Bearer ${getToken()}` })
                },
                body: body !== undefined ? JSON.stringify(body) : undefined
            });
        } catch {
            throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion.');
        }

        const data = await response.json().catch(() => ({}));
        if (response.status === 401 && !path.startsWith('/auth/login')) {
            logout(data.error || 'Session expirée, reconnectez-vous.');
            throw new Error(data.error || 'Session expirée');
        }
        if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
        return data;
    }

    let settingsPromise;
    function settings() {
        if (!settingsPromise) settingsPromise = api('/settings').catch(() => ({}));
        return settingsPromise;
    }

    // ---------- Notifications ----------
    function toast(message, type = 'success') {
        let container = document.getElementById('toasts');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toasts';
            container.className = 'fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 items-end pointer-events-none';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        const styles = {
            success: ['bg-emerald-600', 'check_circle'],
            error: ['bg-red-600', 'error'],
            info: ['bg-slate-800', 'info']
        }[type] || ['bg-slate-800', 'info'];
        const el = document.createElement('div');
        el.className = `toast pointer-events-auto ${styles[0]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-sm text-sm font-medium`;
        el.innerHTML = `<span class="material-symbols-outlined icon-fill">${styles[1]}</span><span>${esc(message)}</span>`;
        container.appendChild(el);
        setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 5000 : 3000);
    }

    // ---------- Fenêtres ----------
    function modal({ title, content, size = 'max-w-lg', onClose }) {
        const previousFocus = document.activeElement;
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-backdrop fixed inset-0 z-[90] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4';
        wrapper.innerHTML = `
            <div class="modal-panel bg-white w-full ${size} rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col" role="dialog" aria-modal="true" aria-label="${esc(title)}">
                <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 class="text-lg font-semibold text-slate-900">${esc(title)}</h2>
                    <button type="button" data-close class="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Fermer">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body overflow-y-auto p-5"></div>
            </div>`;
        const body = wrapper.querySelector('.modal-body');
        if (typeof content === 'string') body.innerHTML = content; else if (content) body.appendChild(content);

        function close() {
            wrapper.remove();
            document.removeEventListener('keydown', onKey);
            previousFocus?.focus?.();
            onClose?.();
        }
        function onKey(e) { if (e.key === 'Escape') close(); }

        wrapper.addEventListener('mousedown', e => { if (e.target === wrapper) close(); });
        wrapper.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(wrapper);
        setTimeout(() => (wrapper.querySelector('[autofocus]') || wrapper.querySelector('input, select, textarea, button:not([data-close])'))?.focus(), 30);
        return { el: wrapper, body, close };
    }

    function confirmDialog(message, { title = 'Confirmation', confirmLabel = 'Confirmer', danger = false } = {}) {
        return new Promise(resolve => {
            let answered = false;
            const m = modal({
                title,
                size: 'max-w-md',
                content: `
                    <p class="text-slate-600 mb-6">${esc(message)}</p>
                    <div class="flex justify-end gap-2">
                        <button type="button" data-close class="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">Annuler</button>
                        <button type="button" data-ok class="px-4 py-2 rounded-lg text-white font-medium ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-700 hover:bg-brand-800'}">${esc(confirmLabel)}</button>
                    </div>`,
                onClose: () => { if (!answered) resolve(false); }
            });
            m.el.querySelector('[data-ok]').addEventListener('click', () => { answered = true; m.close(); resolve(true); });
        });
    }

    /**
     * Construit les champs d'un formulaire.
     * fields : [{ name, label, type: text|number|email|tel|date|select|textarea|password, required, options: [[valeur, texte]], step, min, placeholder, full, help }]
     */
    function formFields(fields, values = {}) {
        return fields.map(f => {
            const value = values[f.name] ?? f.value ?? '';
            const id = `f-${f.name}`;
            const base = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-100 outline-none';
            const attrs = `id="${id}" name="${esc(f.name)}" ${f.required ? 'required' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${f.autofocus ? 'autofocus' : ''}`;
            let input;
            if (f.type === 'select') {
                input = `<select ${attrs} class="${base}">${(f.options || []).map(([v, t]) =>
                    `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
            } else if (f.type === 'textarea') {
                input = `<textarea ${attrs} rows="3" class="${base} resize-none">${esc(value)}</textarea>`;
            } else {
                const extra = [
                    f.step !== undefined ? `step="${f.step}"` : '',
                    f.min !== undefined ? `min="${f.min}"` : '',
                    f.max !== undefined ? `max="${f.max}"` : '',
                    f.minlength ? `minlength="${f.minlength}"` : '',
                    f.autocomplete ? `autocomplete="${f.autocomplete}"` : ''
                ].join(' ');
                input = `<input ${attrs} type="${f.type || 'text'}" value="${esc(String(value).slice(0, f.type === 'date' ? 10 : undefined))}" ${extra} class="${base}">`;
            }
            return `<div class="${f.full ? 'sm:col-span-2' : ''}">
                <label for="${id}" class="block text-sm font-medium text-slate-700 mb-1">${esc(f.label)}${f.required ? ' <span class="text-red-500">*</span>' : ''}</label>
                ${input}
                ${f.help ? `<p class="text-xs text-slate-500 mt-1">${esc(f.help)}</p>` : ''}
            </div>`;
        }).join('');
    }

    /**
     * Fenêtre de formulaire complète. onSubmit(data) doit renvoyer une promesse ; la fenêtre se ferme si elle réussit.
     */
    function formModal({ title, fields, values, submitLabel = 'Enregistrer', onSubmit, size }) {
        const form = document.createElement('form');
        form.noValidate = false;
        form.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${formFields(fields, values)}</div>
            <p data-error class="hidden mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"></p>
            <div class="flex justify-end gap-2 mt-6">
                <button type="button" data-close class="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">Annuler</button>
                <button type="submit" class="px-5 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-semibold disabled:opacity-60">${esc(submitLabel)}</button>
            </div>`;
        const m = modal({ title, content: form, size });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const data = {};
            for (const f of fields) {
                const raw = form.elements[f.name]?.value ?? '';
                data[f.name] = f.type === 'number' ? (raw === '' ? null : Number(raw)) : (raw.trim?.() ?? raw);
                if (data[f.name] === '') data[f.name] = null;
            }
            const button = form.querySelector('button[type="submit"]');
            const errorBox = form.querySelector('[data-error]');
            button.disabled = true;
            errorBox.classList.add('hidden');
            try {
                await onSubmit(data);
                m.close();
            } catch (error) {
                errorBox.textContent = error.message;
                errorBox.classList.remove('hidden');
            } finally {
                button.disabled = false;
            }
        });
        return m;
    }

    // ---------- Export CSV (ouvre correctement dans Excel) ----------
    function csv(filename, rows, columns) {
        const cell = v => {
            const s = String(v ?? '');
            return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [columns.map(c => cell(c.label)).join(';')];
        for (const row of rows) lines.push(columns.map(c => cell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(';'));
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ---------- Reçu ----------
    async function printReceipt(sale, settingsOverride) {
        const s = settingsOverride || await settings();
        let area = document.getElementById('print-area');
        if (!area) {
            area = document.createElement('div');
            area.id = 'print-area';
            document.body.appendChild(area);
        }
        const rendu = sale.mode_paiement === 'especes' && sale.montant_recu ? sale.montant_recu - sale.total : null;
        area.innerHTML = `
            <div style="font-family: 'Courier New', monospace; font-size: 12px; color: #000;">
                <div style="text-align:center; margin-bottom:8px;">
                    <div style="font-size:15px; font-weight:bold;">${esc(s.nom_pharmacie || 'Pharmacie')}</div>
                    <div>${esc(s.adresse || '')}</div>
                    <div>${esc(s.telephone || '')}</div>
                </div>
                <div>Reçu n° ${sale.id} — ${esc(datetime(sale.date))}</div>
                ${sale.client_nom ? `<div>Client : ${esc(sale.client_nom)}</div>` : ''}
                <div>Vendeur : ${esc(sale.vendeur_nom || '')}</div>
                ${sale.statut === 'annulee' ? '<div style="font-weight:bold;">*** VENTE ANNULÉE ***</div>' : ''}
                <hr style="border:0; border-top:1px dashed #000; margin:6px 0;">
                ${sale.lignes.map(l => `
                    <div>${esc(l.produit_nom)}</div>
                    <div style="display:flex; justify-content:space-between;"><span>${l.quantite} x ${esc(number(l.prix_unitaire))}</span><span>${esc(number(l.sous_total))}</span></div>`).join('')}
                <hr style="border:0; border-top:1px dashed #000; margin:6px 0;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px;"><span>TOTAL</span><span>${esc(fcfa(sale.total))}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Paiement</span><span>${esc(PAYMENT_LABELS[sale.mode_paiement] || sale.mode_paiement)}</span></div>
                ${sale.montant_recu ? `<div style="display:flex; justify-content:space-between;"><span>Reçu</span><span>${esc(fcfa(sale.montant_recu))}</span></div>` : ''}
                ${rendu !== null ? `<div style="display:flex; justify-content:space-between;"><span>Rendu</span><span>${esc(fcfa(rendu))}</span></div>` : ''}
                <div style="text-align:center; margin-top:10px;">${esc(s.message_recu || 'Merci de votre visite')}</div>
            </div>`;
        window.print();
    }

    // ---------- Mise en page (menu) ----------
    function buildLayout() {
        const page = location.pathname.split('/').pop() || 'tableau-de-bord.html';
        const user = App.user;
        const links = NAV.filter(item => !item.roles || can(...item.roles)).map(item => {
            const active = page === item.href;
            return `<a href="${item.href}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}" ${active ? 'aria-current="page"' : ''}>
                <span class="material-symbols-outlined ${active ? 'icon-fill' : ''}">${item.icon}</span>${item.label}</a>`;
        }).join('');

        const initials = (user.nom_complet || user.username).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

        const sidebar = document.createElement('aside');
        sidebar.id = 'sidebar';
        sidebar.className = 'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col';
        sidebar.innerHTML = `
            <div class="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
                <img src="assets/favicon.svg" alt="" class="w-9 h-9">
                <div class="min-w-0">
                    <p data-pharmacy-name class="font-bold text-slate-900 leading-tight truncate">Pharmacie Émeraude</p>
                    <p class="text-xs text-slate-500">Gestion de pharmacie</p>
                </div>
            </div>
            <nav class="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Menu principal">${links}</nav>
            <div class="p-3 border-t border-slate-100 space-y-1">
                <a href="profil.html" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 ${page === 'profil.html' ? 'bg-brand-50' : ''}">
                    <span class="w-8 h-8 rounded-full bg-brand-700 text-white text-xs font-bold flex items-center justify-center">${esc(initials)}</span>
                    <span class="min-w-0">
                        <span class="block text-sm font-semibold text-slate-800 truncate">${esc(user.nom_complet || user.username)}</span>
                        <span class="block text-xs text-slate-500">${esc(ROLE_LABELS[user.role] || user.role)}</span>
                    </span>
                </a>
                <button type="button" data-logout class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                    <span class="material-symbols-outlined">logout</span>Déconnexion
                </button>
            </div>`;

        const topbar = document.createElement('header');
        topbar.className = 'lg:hidden sticky top-0 z-40 h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4';
        topbar.innerHTML = `
            <button type="button" data-menu class="w-10 h-10 -ml-2 rounded-lg hover:bg-slate-100 flex items-center justify-center" aria-label="Ouvrir le menu" aria-controls="sidebar" aria-expanded="false">
                <span class="material-symbols-outlined">menu</span>
            </button>
            <img src="assets/favicon.svg" alt="" class="w-7 h-7">
            <span data-pharmacy-name class="font-bold text-slate-900 truncate">Pharmacie Émeraude</span>`;

        const overlay = document.createElement('div');
        overlay.className = 'hidden fixed inset-0 z-40 bg-slate-900/40 lg:hidden';

        const main = document.getElementById('app-main');
        main.classList.add('lg:pl-64');
        document.body.prepend(sidebar, overlay, topbar);

        const menuButton = topbar.querySelector('[data-menu]');
        const setMenu = open => {
            sidebar.classList.toggle('open', open);
            overlay.classList.toggle('hidden', !open);
            menuButton.setAttribute('aria-expanded', open);
        };
        menuButton.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
        overlay.addEventListener('click', () => setMenu(false));
        sidebar.querySelector('[data-logout]').addEventListener('click', async () => {
            if (await confirmDialog('Voulez-vous vous déconnecter ?', { confirmLabel: 'Se déconnecter' })) logout();
        });

        settings().then(s => {
            if (s.nom_pharmacie) document.querySelectorAll('[data-pharmacy-name]').forEach(el => { el.textContent = s.nom_pharmacie; });
        });
    }

    function renderForbidden() {
        document.getElementById('app-main').innerHTML = `
            <div class="max-w-md mx-auto mt-24 text-center p-6">
                <span class="material-symbols-outlined text-slate-400" style="font-size:48px">lock</span>
                <h1 class="text-xl font-semibold mt-3">Accès réservé</h1>
                <p class="text-slate-500 mt-2">Votre rôle ne permet pas d'ouvrir cette page.</p>
                <a href="tableau-de-bord.html" class="inline-block mt-6 px-4 py-2 rounded-lg bg-brand-700 text-white font-medium">Retour au tableau de bord</a>
            </div>`;
    }

    /**
     * Point d'entrée de chaque page protégée : vérifie la session, construit le menu, puis lance la page.
     * <body data-roles="pharmacien"> limite l'accès (l'admin a toujours accès).
     */
    async function ready(pageInit) {
        if (!getToken()) return logout();
        try {
            App.user = await api('/auth/me');
            store.set(USER_KEY, JSON.stringify(App.user));
        } catch {
            return;
        }
        buildLayout();
        document.body.classList.add('app-ready');

        const roles = document.body.dataset.roles;
        if (roles && !can(...roles.split(','))) return renderForbidden();

        try {
            await pageInit?.();
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    // Petits composants réutilisables
    function badge(text, color = 'slate') {
        const colors = {
            slate: 'bg-slate-100 text-slate-700',
            green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
            red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
            amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
            blue: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
        };
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${colors[color] || colors.slate}">${esc(text)}</span>`;
    }

    function emptyRow(colspan, message) {
        return `<tr><td colspan="${colspan}" class="px-4 py-10 text-center text-slate-500">${esc(message)}</td></tr>`;
    }

    function skeletonRows(colspan, rows = 5) {
        return Array.from({ length: rows }, () => `<tr><td colspan="${colspan}" class="px-4 py-3"><div class="skeleton h-5"></div></td></tr>`).join('');
    }

    window.App = {
        user: null,
        api, ready, can, logout, saveSession, getToken,
        toast, modal, confirm: confirmDialog, formModal, formFields,
        csv, printReceipt, settings,
        fcfa, number, date, datetime, today, esc, debounce,
        badge, emptyRow, skeletonRows,
        ROLE_LABELS, PAYMENT_LABELS
    };
})();
