(() => {
    const HISTORY_CONFIG = {
        getToken: () => sessionStorage.getItem('token') || localStorage.getItem('token'),
        getUser:  () => JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null'),
        apiBase:  () => (typeof API_BASE !== 'undefined' ? API_BASE : ''),
        headerId: 'sessionInfo',
        loginUrl: '/Account/Login'
    };

    const token = HISTORY_CONFIG.getToken();
    const user = HISTORY_CONFIG.getUser();

    if (!token || !user) {
        window.location.href = HISTORY_CONFIG.loginUrl;
        return;
    }

    const rupiah = typeof formatRupiah === 'function'
        ? { format: formatRupiah }
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

    const safeHtml = typeof escapeHtml === 'function'
        ? escapeHtml
        : s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function notify(message, type = 'error') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }

    function formatDateTime(iso) {
        if (!iso) return '-';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const p = n => String(n).padStart(2, '0');
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }

    function initHeader() {
        // Header halaman: Role: <role user> | Login: <username user>
        const el = document.getElementById(HISTORY_CONFIG.headerId) || document.getElementById('sessionInfo');
        if (el && user) {
            el.textContent = `Role: ${user.role} | Login: ${user.username}`;
        }

        const scopeEl = document.getElementById('scopeLabel');
        if (scopeEl && user) {
            scopeEl.textContent = user.role === 'Admin'
                ? '(Menampilkan Semua Kasir)'
                : `(Hanya Kasir: ${user.fullName || user.username})`;
        }
    }

    let currentSearchDate = '';

    async function loadHistory(page = 1) {
        const dateInput = document.getElementById('filterDate');
        const date = dateInput ? dateInput.value.trim() : '';

        if (!date) {
            notify('Tanggal transaksi wajib dipilih.', 'error');
            return;
        }

        currentSearchDate = date;

        const body = document.getElementById('historyBody');
        if (body) {
            body.innerHTML = '<tr><td colspan="6" class="empty">Memuat data transaksi...</td></tr>';
        }

        try {
            const rawBase = HISTORY_CONFIG.apiBase();
            const base = rawBase.replace(/\/api\/v1\/?$/, '');
            const url = `${base}/api/v1/transactions/history?date=${encodeURIComponent(currentSearchDate)}&page=${page}`;

            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.status === 401) {
                notify('Sesi berakhir, silakan login kembali.', 'error');
                if (typeof logout === 'function') {
                    logout();
                } else {
                    window.location.href = HISTORY_CONFIG.loginUrl;
                }
                return;
            }

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                notify(data.message || 'Gagal memuat data transaksi.', 'error');
                if (body) body.innerHTML = `<tr><td colspan="6" class="empty" style="color:#f44336;">${safeHtml(data.message || 'Gagal memuat data.')}</td></tr>`;
                return;
            }

            if (!body) return;

            if (!data.items || data.items.length === 0) {
                body.innerHTML = '<tr><td colspan="6" class="empty">Tidak ada data transaksi pada tanggal ini.</td></tr>';
            } else {
                body.innerHTML = data.items.map(x => `
                    <tr>
                        <td class="mono">${safeHtml(x.invoiceNo)}</td>
                        <td>${formatDateTime(x.transactionDate)}</td>
                        <td>${safeHtml(x.kasir)}</td>
                        <td class="text-center">${x.totalItem}</td>
                        <td>${safeHtml(x.payment)}</td>
                        <td class="text-right">${rupiah.format(x.totalPrice)}</td>
                    </tr>`).join('');
            }

            renderPagination(data.page, data.totalPages, data.totalCount);
        } catch (err) {
            notify('Tidak dapat terhubung ke server.', 'error');
            if (body) body.innerHTML = '<tr><td colspan="6" class="empty" style="color:#f44336;">Tidak dapat terhubung ke server.</td></tr>';
        }
    }

    function renderPagination(current, totalPages, totalCount) {
        const box = document.getElementById('pagination');
        if (!box) return;
        box.innerHTML = '';

        if (!totalPages || totalPages <= 0) return;

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.innerHTML = '&laquo;';
        prevBtn.title = 'Halaman Sebelumnya';
        if (current <= 1) {
            prevBtn.disabled = true;
        } else {
            prevBtn.addEventListener('click', () => loadHistory(current - 1));
        }
        box.appendChild(prevBtn);

        const maxVisible = 5;
        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = start + maxVisible - 1;

        if (end > totalPages) {
            end = totalPages;
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.type = 'button';
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => loadHistory(1));
            box.appendChild(firstBtn);

            if (start > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 4px';
                dots.style.color = '#777';
                box.appendChild(dots);
            }
        }

        for (let i = start; i <= end; i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = i;
            if (i === current) {
                b.classList.add('active');
                b.disabled = true;
            } else {
                b.addEventListener('click', () => loadHistory(i));
            }
            box.appendChild(b);
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 4px';
                dots.style.color = '#777';
                box.appendChild(dots);
            }

            const lastBtn = document.createElement('button');
            lastBtn.type = 'button';
            lastBtn.textContent = totalPages;
            lastBtn.addEventListener('click', () => loadHistory(totalPages));
            box.appendChild(lastBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.innerHTML = '&raquo;';
        nextBtn.title = 'Halaman Selanjutnya';
        if (current >= totalPages) {
            nextBtn.disabled = true;
        } else {
            nextBtn.addEventListener('click', () => loadHistory(current + 1));
        }
        box.appendChild(nextBtn);
    }

    const btnSearch = document.getElementById('btnSearch');
    if (btnSearch) {
        btnSearch.addEventListener('click', () => loadHistory(1));
    }

    const filterDateEl = document.getElementById('filterDate');
    if (filterDateEl) {
        filterDateEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') loadHistory(1);
        });
    }

    initHeader();
})();