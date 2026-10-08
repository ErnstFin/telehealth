/**
 * TeleHealth Web Administrator Application
 * Handles Dashboard Analytics, Knowledge Base Management,
 * External Document Ingestion (PDF, DOCX), Validation Review, and Doctor Queue.
 */

const App = {
    state: {
        currentTab: 'dashboard',
        currentDocSubTab: 'single',
        selectedDestination: 'ACTIVE',
        currentFile: null,
        batchFiles: [],
        stats: null,
        knowledge: [],
        candidates: [],
        doctorQuestions: [],
        categories: [],
        sources: [],
        validationLogs: [],
        charts: {
            categories: null,
            resolution: null
        }
    },

    async init() {
        console.log('[TeleHealth] Initializing Web Administrator with Real-Time Auto-Refresh...');
        this.bindEvents();
        this.bindDropzoneEvents();
        await this.loadInitialData();
        this.renderCurrentTab();
        this.startAutoRefresh();
    },

    bindEvents() {
        // Navigation items
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab) this.switchTab(tab);
            });
        });

        // Refresh button
        document.getElementById('btn-refresh-data')?.addEventListener('click', async () => {
            await this.loadInitialData();
            this.renderCurrentTab();
            this.toast('info', 'Data berhasil dimuat ulang.');
        });

        // Knowledge search and filters
        document.getElementById('kb-search-input')?.addEventListener('input', () => this.renderKnowledgeTable());
        document.getElementById('kb-filter-category')?.addEventListener('change', () => this.renderKnowledgeTable());
        document.getElementById('kb-filter-status')?.addEventListener('change', () => this.renderKnowledgeTable());

        // Validator filter
        document.getElementById('validator-filter-status')?.addEventListener('change', () => this.renderCandidates());

        // Doctor queue filter
        document.getElementById('doctor-filter-status')?.addEventListener('change', () => this.renderDoctorQueue());

        // Global Escape key to close any active modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => {
                    m.classList.remove('active');
                });
            }
        });
    },

    bindDropzoneEvents() {
        const dropzone = document.getElementById('doc-dropzone');
        if (dropzone) {
            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('dragover');
                }, false);
            });

            dropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files.length > 0) {
                    this.processUploadedFile(files[0]);
                }
            }, false);
        }

        const batchDropzone = document.getElementById('batch-dropzone');
        if (batchDropzone) {
            ['dragenter', 'dragover'].forEach(eventName => {
                batchDropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    batchDropzone.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                batchDropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    batchDropzone.classList.remove('dragover');
                }, false);
            });

            batchDropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files && files.length > 0) {
                    this.addBatchFiles(Array.from(files));
                }
            }, false);
        }

        const modalDropzone = document.getElementById('modal-kb-dropzone');
        if (modalDropzone) {
            ['dragenter', 'dragover'].forEach(eventName => {
                modalDropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    modalDropzone.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                modalDropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    modalDropzone.classList.remove('dragover');
                }, false);
            });

            modalDropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files && files.length > 0) {
                    this.processModalUploadedFile(files[0]);
                }
            }, false);
        }
    },

    startAutoRefresh() {
        if (this._refreshInterval) clearInterval(this._refreshInterval);
        this._refreshInterval = setInterval(async () => {
            try {
                // If any modal is active or an input is focused, only update stats silently to avoid resetting user form selections
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal) {
                    const [statsRes, docRes] = await Promise.all([
                        fetch('/api/dashboard/stats').then(r => r.json()),
                        fetch('/api/doctor/questions').then(r => r.json())
                    ]);
                    if (statsRes.success) this.state.stats = statsRes.data;
                    if (docRes.success) this.state.doctorQuestions = docRes.data;
                    this.updateBadgeCounts();
                    return;
                }

                const prevWaitingCount = (this.state.doctorQuestions || []).filter(d => d.status === 'WAITING').length;
                await this.loadInitialData(true);
                const newWaitingCount = (this.state.doctorQuestions || []).filter(d => d.status === 'WAITING').length;

                if (newWaitingCount > prevWaitingCount) {
                    this.toast('info', '🔔 Ada pertanyaan baru masuk dari Telegram ke Antrian Dokter!');
                }

                if (this.state.currentTab === 'dashboard') {
                    this.renderDashboard();
                } else if (this.state.currentTab === 'doctor-queue') {
                    this.renderDoctorQueue();
                } else if (this.state.currentTab === 'validator') {
                    this.renderCandidates();
                }
            } catch (e) {
                // Ignore silent fetch errors
            }
        }, 3000);
    },

    async switchTab(tabName) {
        this.state.currentTab = tabName;

        // Update nav item active states
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update section active states
        document.querySelectorAll('.page-tab-content').forEach(sec => {
            if (sec.id === `tab-${tabName}`) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // Update topbar title
        const titleMap = {
            'dashboard': 'Dashboard Overview',
            'knowledge': 'Manajemen Knowledge Base',
            'validator': 'Knowledge Validator & Candidate Review',
            'doctor-queue': 'Antrian Pertanyaan Dokter',
            'journal-input': 'Input & Import Dokumen Pengetahuan',
            'validation-logs': 'Validation Logs & Audit Trail',
            'categories-sources': 'Kategori & Sumber Medis',
            'settings': 'Integrasi Bot Telegram & Pengaturan Sistem'
        };
        const titleEl = document.getElementById('page-current-title');
        if (titleEl) titleEl.textContent = titleMap[tabName] || 'TeleHealth Admin';

        await this.loadInitialData(true);
        this.renderCurrentTab();
    },

    async loadInitialData(silent = false) {
        try {
            const [statsRes, kbRes, candRes, docRes, catRes, srcRes, logsRes] = await Promise.all([
                fetch('/api/dashboard/stats').then(r => r.json()),
                fetch('/api/knowledge').then(r => r.json()),
                fetch('/api/candidates').then(r => r.json()),
                fetch('/api/doctor/questions').then(r => r.json()),
                fetch('/api/categories').then(r => r.json()),
                fetch('/api/sources').then(r => r.json()),
                fetch('/api/validation-logs').then(r => r.json())
            ]);

            if (statsRes.success) this.state.stats = statsRes.data;
            if (kbRes.success) this.state.knowledge = kbRes.data;
            if (candRes.success) this.state.candidates = candRes.data;
            if (docRes.success) this.state.doctorQuestions = docRes.data;
            if (catRes.success) this.state.categories = catRes.data;
            if (srcRes.success) this.state.sources = srcRes.data;
            if (logsRes.success) this.state.validationLogs = logsRes.data;

            this.updateBadgeCounts();
            this.populateSelectDropdowns();
        } catch (err) {
            console.error('[App] Failed to fetch data:', err);
            if (!silent) this.toast('error', 'Gagal memuat data dari server.');
        }
    },

    updateBadgeCounts() {
        const pendingCount = this.state.candidates.filter(c => c.status === 'PENDING').length;
        const doctorWaiting = this.state.doctorQuestions.filter(d => d.status === 'WAITING').length;

        const valBadge = document.getElementById('nav-pending-badge');
        if (valBadge) {
            valBadge.textContent = pendingCount;
            valBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }

        const docBadge = document.getElementById('nav-doctor-badge');
        if (docBadge) {
            docBadge.textContent = doctorWaiting;
            docBadge.style.display = doctorWaiting > 0 ? 'inline-block' : 'none';
        }
    },

    populateSelectDropdowns() {
        const catSelects = [
            'kb-filter-category',
            'journal-category',
            'doc-category',
            'kb-form-category',
            'doc-ans-category'
        ];

        catSelects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const currentVal = el.value;
            const isFilter = id.includes('filter');
            el.innerHTML = isFilter ? '<option value="ALL">Semua Kategori</option>' : '';
            this.state.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                el.appendChild(opt);
            });
            if (currentVal && Array.from(el.options).some(o => String(o.value) === String(currentVal))) {
                el.value = currentVal;
            }
        });

        // Sources dropdown for KB Modal
        const srcSelect = document.getElementById('kb-form-source');
        if (srcSelect) {
            const currentSrcVal = srcSelect.value;
            srcSelect.innerHTML = '<option value="">Pilih Sumber Terpercaya</option>';
            
            // Deduplicate sources by name
            const uniqueSources = [];
            const seenNames = new Set();
            (this.state.sources || []).forEach(src => {
                const nameKey = (src.name || '').trim().toLowerCase();
                if (!seenNames.has(nameKey)) {
                    seenNames.add(nameKey);
                    uniqueSources.push(src);
                }
            });

            uniqueSources.forEach(src => {
                const opt = document.createElement('option');
                opt.value = src.id;
                opt.textContent = `${src.name} (${src.type || 'JOURNAL'})`;
                srcSelect.appendChild(opt);
            });

            if (currentSrcVal && Array.from(srcSelect.options).some(o => String(o.value) === String(currentSrcVal))) {
                srcSelect.value = currentSrcVal;
            }
        }
    },

    renderCurrentTab() {
        switch (this.state.currentTab) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'knowledge':
                this.renderKnowledgeTable();
                break;
            case 'validator':
                this.renderCandidates();
                break;
            case 'doctor-queue':
                this.renderDoctorQueue();
                break;
            case 'journal-input':
                // Reset or re-populate categories for document input
                this.populateSelectDropdowns();
                break;
            case 'validation-logs':
                this.renderValidationLogs();
                break;
            case 'categories-sources':
                this.renderCategoriesAndSources();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    },

    // -------------------------------------------------------------
    // TAB 1: DASHBOARD
    // -------------------------------------------------------------
    renderDashboard() {
        if (!this.state.stats) return;
        const counts = this.state.stats.counts || {};

        document.getElementById('stat-total-knowledge').textContent = counts.total_knowledge_valid || 0;
        document.getElementById('stat-pending-val').textContent = counts.pending_validation || 0;
        document.getElementById('stat-doctor-waiting').textContent = counts.doctor_waiting || 0;
        document.getElementById('stat-total-questions').textContent = counts.total_questions || 0;
        document.getElementById('stat-rejected-knowledge').textContent = counts.rejected_knowledge || 0;

        // Render Charts
        this.renderCategoryChart();
        this.renderResolutionChart();

        // Recent Inquiries Table
        const recentQBody = document.getElementById('dashboard-recent-questions-body');
        if (recentQBody) {
            const questions = this.state.stats.recent_questions || [];
            if (questions.length === 0) {
                recentQBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Belum ada pertanyaan masuk.</td></tr>`;
            } else {
                recentQBody.innerHTML = questions.map(q => {
                    let badgeClass = 'badge-success';
                    let statusLabel = 'Terjawab KB';
                    if (q.status === 'FORWARDED_TO_DOCTOR') {
                        badgeClass = 'badge-warning';
                        statusLabel = 'Dokter Queue';
                    } else if (q.status === 'REJECTED_NON_HEALTH') {
                        badgeClass = 'badge-danger';
                        statusLabel = 'Non-Kesehatan';
                    } else if (q.status === 'ANSWERED_BY_DOCTOR') {
                        badgeClass = 'badge-info';
                        statusLabel = 'Dijawab Dokter';
                    }

                    const timeStr = new Date(q.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    return `
                        <tr>
                            <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">
                                ${this.escapeHtml(q.question_text)}
                            </td>
                            <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                            <td><strong>${(q.relevance_score * 100).toFixed(0)}%</strong></td>
                            <td style="font-size: 12px; color: var(--text-muted);">${timeStr}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Recent Validation Logs
        const recentLogsBody = document.getElementById('dashboard-recent-logs-body');
        if (recentLogsBody) {
            const logs = this.state.stats.recent_logs || [];
            if (logs.length === 0) {
                recentLogsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Belum ada riwayat validasi.</td></tr>`;
            } else {
                recentLogsBody.innerHTML = logs.map(l => {
                    let badgeClass = l.action.includes('VALIDATED') ? 'badge-success' : (l.action === 'REJECTED' ? 'badge-danger' : 'badge-info');
                    const timeStr = new Date(l.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                    return `
                        <tr>
                            <td><span class="badge ${badgeClass}">${l.action}</span></td>
                            <td style="font-weight: 600;">${this.escapeHtml(l.admin_user)}</td>
                            <td style="font-size: 12.5px; color: var(--text-muted); max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${this.escapeHtml(l.notes || '-')}
                            </td>
                            <td style="font-size: 12px; color: var(--text-muted);">${timeStr}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    },

    renderCategoryChart() {
        const canvas = document.getElementById('chart-categories');
        if (!canvas || typeof Chart === 'undefined') return;

        try {
            const catStats = (this.state.stats && this.state.stats.category_stats) || [];
            const labels = catStats.map(c => c.name);
            const data = catStats.map(c => c.count);

            if (this.state.charts.categories) {
                this.state.charts.categories.destroy();
                this.state.charts.categories = null;
            }

            this.state.charts.categories = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#0d9488', '#0284c7', '#6366f1', '#f59e0b', '#10b981', '#ec4899'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } } }
                    }
                }
            });
        } catch (err) {
            console.warn('[App] Category Chart error:', err.message);
        }
    },

    renderResolutionChart() {
        const canvas = document.getElementById('chart-resolution');
        if (!canvas || typeof Chart === 'undefined') return;

        try {
            const counts = (this.state.stats && this.state.stats.counts) || {};
            const labels = ['KB Terverifikasi', 'Antrian Dokter', 'Dijawab Dokter', 'Non-Kesehatan Ditolak'];
            const data = [
                counts.answered_by_kb || 0,
                counts.forwarded_to_doctor || 0,
                counts.answered_by_doctor || 0,
                counts.rejected_non_health || 0
            ];

            if (this.state.charts.resolution) {
                this.state.charts.resolution.destroy();
                this.state.charts.resolution = null;
            }

            this.state.charts.resolution = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Jumlah Pertanyaan',
                        data: data,
                        backgroundColor: ['#0d9488', '#f59e0b', '#0284c7', '#ef4444'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });
        } catch (err) {
            console.warn('[App] Resolution Chart error:', err.message);
        }
    },

    // -------------------------------------------------------------
    // TAB 2: KNOWLEDGE BASE
    // -------------------------------------------------------------
    renderKnowledgeTable() {
        const tbody = document.getElementById('kb-table-body');
        if (!tbody) return;

        const search = (document.getElementById('kb-search-input')?.value || '').toLowerCase();
        const catFilter = document.getElementById('kb-filter-category')?.value || 'ALL';
        const statusFilter = document.getElementById('kb-filter-status')?.value || 'ALL';

        let filtered = [...this.state.knowledge];

        if (catFilter !== 'ALL') {
            filtered = filtered.filter(k => String(k.category_id) === String(catFilter));
        }

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(k => k.status === statusFilter);
        }

        if (search.length > 0) {
            filtered = filtered.filter(k =>
                k.title.toLowerCase().includes(search) ||
                (k.topic_keywords && k.topic_keywords.toLowerCase().includes(search)) ||
                (k.short_answer && k.short_answer.toLowerCase().includes(search))
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada knowledge yang sesuai dengan filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(k => {
            const statusBadge = k.status === 'ACTIVE'
                ? `<span class="badge badge-success" style="cursor:pointer;" onclick="App.toggleKnowledgeStatus(${k.id})" title="Klik untuk nonaktifkan"><i class="fa-solid fa-check"></i> ACTIVE</span>`
                : `<span class="badge badge-secondary" style="cursor:pointer;" onclick="App.toggleKnowledgeStatus(${k.id})" title="Klik untuk aktifkan"><i class="fa-solid fa-pause"></i> INACTIVE</span>`;

            return `
                <tr>
                    <td><strong>#${k.id}</strong></td>
                    <td>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${this.escapeHtml(k.title)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
                            <i class="fa-solid fa-key" style="color: var(--primary);"></i> ${this.escapeHtml(k.topic_keywords || '-')}
                        </div>
                    </td>
                    <td><span class="badge badge-primary">${this.escapeHtml(k.category_name || 'Umum')}</span></td>
                    <td style="font-size: 12.5px; max-width: 180px;">${this.escapeHtml(k.source_name || '-')}</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${this.escapeHtml(k.validated_by || 'Admin')}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-sm btn-secondary" onclick="App.viewKnowledgeDetail(${k.id})" title="Lihat Detail"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn btn-sm btn-outline-primary" onclick="App.openEditKnowledgeModal(${k.id})" title="Edit Knowledge"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="App.deleteKnowledge(${k.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    parsePoints(raw) {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.filter(Boolean);
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
            if (typeof parsed === 'string') {
                return parsed.split('\n').map(p => p.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
            }
            return parsed ? [String(parsed)] : [];
        } catch (e) {
            if (typeof raw === 'string') {
                return raw.split('\n').map(p => p.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
            }
            return [String(raw)];
        }
    },

    openAddKnowledgeModal() {
        // Cleanly close any other active modals to prevent overlap
        this.closeModal('modal-view-knowledge');
        this.closeModal('modal-doctor-answer');
        this.closeModal('modal-reject-candidate');

        document.getElementById('modal-knowledge-title').textContent = 'Tambah Knowledge Base Baru';
        document.getElementById('kb-form-id').value = '';
        document.getElementById('kb-form-title').value = '';
        document.getElementById('kb-form-keywords').value = '';
        document.getElementById('kb-form-short-answer').value = '';
        document.getElementById('kb-form-important-points').value = '';
        document.getElementById('kb-form-when-doctor').value = '';
        document.getElementById('kb-form-validator').value = 'Administrator Medis';

        this.populateSelectDropdowns();

        const catEl = document.getElementById('kb-form-category');
        if (catEl && catEl.options.length > 0) {
            catEl.selectedIndex = 0;
        }

        const srcEl = document.getElementById('kb-form-source');
        if (srcEl && srcEl.options.length > 1) {
            srcEl.selectedIndex = 1;
        }

        // Reset quick upload UI
        const dropzone = document.getElementById('modal-kb-dropzone');
        const loading = document.getElementById('modal-kb-loading');
        const success = document.getElementById('modal-kb-extracted-success');
        const fileInput = document.getElementById('modal-kb-file-input');

        if (dropzone) dropzone.style.display = 'block';
        if (loading) loading.style.display = 'none';
        if (success) success.style.display = 'none';
        if (fileInput) fileInput.value = '';

        this.openModal('modal-knowledge');
    },

    openEditKnowledgeModal(id) {
        this.closeModal('modal-view-knowledge');
        this.closeModal('modal-doctor-answer');
        this.closeModal('modal-reject-candidate');

        const item = this.state.knowledge.find(k => k.id === id);
        if (!item) {
            this.toast('error', `Knowledge #${id} tidak ditemukan.`);
            return;
        }

        this.populateSelectDropdowns();

        document.getElementById('modal-knowledge-title').textContent = `Edit Knowledge #${item.id}`;
        document.getElementById('kb-form-id').value = item.id;
        document.getElementById('kb-form-title').value = item.title || '';
        document.getElementById('kb-form-category').value = item.category_id || '';
        document.getElementById('kb-form-source').value = item.source_id || '';
        document.getElementById('kb-form-keywords').value = item.topic_keywords || '';
        document.getElementById('kb-form-short-answer').value = item.short_answer || '';

        // Hide upload dropzone when editing existing knowledge
        const dropzone = document.getElementById('modal-kb-dropzone');
        const loading = document.getElementById('modal-kb-loading');
        const success = document.getElementById('modal-kb-extracted-success');
        if (dropzone) dropzone.style.display = 'none';
        if (loading) loading.style.display = 'none';
        if (success) success.style.display = 'none';

        const points = this.parsePoints(item.important_points);
        document.getElementById('kb-form-important-points').value = points.join('\n');
        document.getElementById('kb-form-when-doctor').value = item.when_to_see_doctor || '';
        document.getElementById('kb-form-validator').value = item.validated_by || 'Administrator Medis';

        this.openModal('modal-knowledge');
    },

    handleModalFileSelect(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.processModalUploadedFile(files[0]);
        }
    },

    async processModalUploadedFile(file) {
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        const validExts = ['pdf', 'docx', 'doc', 'txt', 'md'];

        if (!validExts.includes(ext)) {
            this.toast('error', `Format file (.${ext}) tidak didukung. Harap unggah file PDF (.pdf) atau Word (.docx).`);
            return;
        }

        const dropzone = document.getElementById('modal-kb-dropzone');
        const loading = document.getElementById('modal-kb-loading');
        const success = document.getElementById('modal-kb-extracted-success');
        const successName = document.getElementById('modal-kb-extracted-name');

        if (dropzone) dropzone.style.display = 'none';
        if (loading) loading.style.display = 'block';
        if (success) success.style.display = 'none';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/knowledge/parse-document', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (loading) loading.style.display = 'none';

            if (result.success && result.data) {
                const data = result.data;
                if (success) success.style.display = 'flex';
                if (successName) successName.textContent = file.name;

                // Auto-fill form fields
                document.getElementById('kb-form-title').value = data.title || file.name.replace(/\.[^/.]+$/, '');
                if (data.category_id) {
                    document.getElementById('kb-form-category').value = data.category_id;
                } else {
                    const catEl = document.getElementById('kb-form-category');
                    if (catEl && !catEl.value && catEl.options.length > 0) catEl.selectedIndex = 0;
                }

                document.getElementById('kb-form-keywords').value = data.topic_keywords || '';
                document.getElementById('kb-form-short-answer').value = data.short_answer || '';

                const points = this.parsePoints(data.important_points);
                document.getElementById('kb-form-important-points').value = points.join('\n');
                document.getElementById('kb-form-when-doctor').value = data.when_to_see_doctor || '';

                // Ensure source is selected
                const srcEl = document.getElementById('kb-form-source');
                if (srcEl && (!srcEl.value || srcEl.value === '')) {
                    if (srcEl.options.length > 1) {
                        srcEl.selectedIndex = 1;
                    }
                }

                this.toast('success', `Dokumen "${file.name}" berhasil diekstrak dan mengisi formulir!`);
            } else {
                if (dropzone) dropzone.style.display = 'block';
                this.toast('error', result.error || 'Gagal mengekstrak teks dari dokumen.');
            }
        } catch (err) {
            if (loading) loading.style.display = 'none';
            if (dropzone) dropzone.style.display = 'block';
            console.error('[processModalUploadedFile Error]', err);
            this.toast('error', 'Terjadi kesalahan jaringan saat mengekstrak file.');
        }
    },

    clearModalExtractedFile() {
        const dropzone = document.getElementById('modal-kb-dropzone');
        const success = document.getElementById('modal-kb-extracted-success');
        const fileInput = document.getElementById('modal-kb-file-input');
        if (dropzone) dropzone.style.display = 'block';
        if (success) success.style.display = 'none';
        if (fileInput) fileInput.value = '';
    },

    async handleKnowledgeSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('kb-form-id').value;
        const title = document.getElementById('kb-form-title').value;
        const category_id = document.getElementById('kb-form-category').value;
        const source_id = document.getElementById('kb-form-source').value;
        const topic_keywords = document.getElementById('kb-form-keywords').value;
        const short_answer = document.getElementById('kb-form-short-answer').value;
        const rawPoints = document.getElementById('kb-form-important-points').value;
        const when_to_see_doctor = document.getElementById('kb-form-when-doctor').value;
        const validated_by = document.getElementById('kb-form-validator').value;

        const important_points = rawPoints
            .split('\n')
            .map(p => p.replace(/^[•\-\*]\s*/, '').trim())
            .filter(p => p.length > 0);

        const payload = {
            title,
            category_id: category_id ? Number(category_id) : null,
            source_id: source_id ? Number(source_id) : null,
            topic_keywords,
            short_answer,
            important_points,
            when_to_see_doctor,
            validated_by
        };

        try {
            let res;
            if (id) {
                res = await fetch(`/api/knowledge/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/knowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await res.json();
            if (data.success) {
                this.toast('success', id ? 'Knowledge berhasil diperbarui!' : 'Knowledge baru berhasil ditambahkan!');
                this.closeModal('modal-knowledge');
                await this.loadInitialData();
                this.renderKnowledgeTable();
            } else {
                this.toast('error', data.error || 'Gagal menyimpan knowledge.');
            }
        } catch (err) {
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    async toggleKnowledgeStatus(id) {
        try {
            const res = await fetch(`/api/knowledge/${id}/toggle-status`, { method: 'PATCH' });
            const data = await res.json();
            if (data.success) {
                this.toast('info', `Status knowledge diubah menjadi ${data.data.status}`);
                await this.loadInitialData();
                this.renderKnowledgeTable();
            }
        } catch (err) {
            this.toast('error', 'Gagal mengubah status.');
        }
    },

    async deleteKnowledge(id) {
        if (!confirm(`Apakah Anda yakin ingin menghapus knowledge #${id}?`)) return;
        try {
            const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                this.toast('success', 'Knowledge berhasil dihapus.');
                await this.loadInitialData();
                this.renderKnowledgeTable();
            }
        } catch (err) {
            this.toast('error', 'Gagal menghapus knowledge.');
        }
    },

    viewKnowledgeDetail(id) {
        const item = this.state.knowledge.find(k => k.id === id);
        if (!item) {
            this.toast('error', `Knowledge #${id} tidak ditemukan.`);
            return;
        }

        const points = this.parsePoints(item.important_points);

        const modalContent = document.getElementById('modal-view-knowledge-content');
        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <span class="badge ${item.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}">${item.status}</span>
                        <span class="badge badge-primary" style="margin-left: 6px;">${this.escapeHtml(item.category_name || 'Umum')}</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="App.closeModal('modal-view-knowledge'); App.openEditKnowledgeModal(${item.id});" title="Edit Data Ini">
                            <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button type="button" class="btn btn-sm btn-primary" onclick="App.closeModal('modal-view-knowledge'); App.openAddKnowledgeModal();" title="Tambah Knowledge Baru">
                            <i class="fa-solid fa-plus"></i> Tambah Knowledge
                        </button>
                    </div>
                </div>
                <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main); margin-top: 12px; line-height: 1.4;">${this.escapeHtml(item.title)}</h2>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">
                    <i class="fa-solid fa-calendar"></i> Divalidasi: ${new Date(item.validated_at || item.created_at).toLocaleDateString('id-ID')} oleh <strong>${this.escapeHtml(item.validated_by || 'Admin')}</strong>
                </div>
                ${item.topic_keywords ? `
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
                    <i class="fa-solid fa-key" style="color: var(--primary);"></i> <strong>Kata Kunci:</strong> ${this.escapeHtml(item.topic_keywords)}
                </div>
                ` : ''}
            </div>

            <div style="background-color: #f8fafc; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px; border-left: 4px solid var(--primary);">
                <strong style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Jawaban Singkat / Rangkuman:</strong>
                <p style="font-size: 14px; color: var(--text-main); margin-top: 6px; line-height: 1.6; white-space: pre-line;">${this.escapeHtml(item.short_answer)}</p>
            </div>

            ${points.length > 0 ? `
            <div style="margin-bottom: 16px;">
                <strong style="font-size: 13px; color: var(--text-main);">📌 Hal Penting (Poin Penanganan):</strong>
                <ul style="margin: 8px 0 0 20px; font-size: 13.5px; color: var(--text-main); line-height: 1.6;">
                    ${points.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            ${item.when_to_see_doctor ? `
            <div style="background-color: var(--danger-bg); padding: 14px 18px; border-radius: var(--radius-md); margin-bottom: 16px; color: #991b1b;">
                <strong style="font-size: 13px;"><i class="fa-solid fa-triangle-exclamation"></i> Kapan Perlu ke Dokter:</strong>
                <p style="font-size: 13.5px; margin-top: 4px; line-height: 1.5;">${this.escapeHtml(item.when_to_see_doctor)}</p>
            </div>
            ` : ''}

            <div style="font-size: 12.5px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <span>📚 <strong>Sumber Medis:</strong> ${this.escapeHtml(item.source_name || '-')}</span>
                <span>ID: #${item.id}</span>
            </div>
        `;

        this.openModal('modal-view-knowledge');
    },

    // -------------------------------------------------------------
    // TAB 3: KNOWLEDGE VALIDATOR (Candidate Review)
    // -------------------------------------------------------------
    renderCandidates() {
        const container = document.getElementById('validator-candidates-container');
        if (!container) return;

        const statusFilter = document.getElementById('validator-filter-status')?.value || 'PENDING';
        let candidates = [...this.state.candidates];

        if (statusFilter !== 'ALL') {
            candidates = candidates.filter(c => c.status === statusFilter);
        }

        if (candidates.length === 0) {
            container.innerHTML = `
                <div class="app-card" style="text-align: center; padding: 60px 20px;">
                    <i class="fa-solid fa-circle-check" style="font-size: 48px; color: var(--success); margin-bottom: 14px;"></i>
                    <h3 style="font-size: 18px; font-weight: 700;">Tidak ada kandidat dengan status "${statusFilter}"</h3>
                    <p style="font-size: 13.5px; color: var(--text-muted); margin-top: 4px;">Semua respon dokter dan literatur baru telah ditinjau.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = candidates.map(c => {
            const isDoctor = c.type === 'DOCTOR_RESPONSE';
            const typeBadge = isDoctor
                ? `<span class="badge badge-info"><i class="fa-solid fa-user-doctor"></i> Respon Dokter</span>`
                : `<span class="badge badge-primary"><i class="fa-solid fa-file-medical"></i> Jurnal / Dokumen</span>`;

            let statusBadge = '';
            if (c.status === 'PENDING') statusBadge = `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> PENDING</span>`;
            else if (c.status === 'VALID') statusBadge = `<span class="badge badge-success"><i class="fa-solid fa-check"></i> VALIDATED</span>`;
            else if (c.status === 'REJECTED') statusBadge = `<span class="badge badge-danger"><i class="fa-solid fa-ban"></i> REJECTED</span>`;

            const points = this.parsePoints(c.important_points);

            const actions = c.status === 'PENDING' ? `
                <div class="candidate-actions">
                    <button class="btn btn-sm btn-danger" onclick="App.openRejectModal(${c.id})">
                        <i class="fa-solid fa-xmark"></i> REJECT
                    </button>
                    <button class="btn btn-sm btn-success" onclick="App.validateCandidateDirect(${c.id})">
                        <i class="fa-solid fa-check"></i> VALIDATE & PUBLISH
                    </button>
                </div>
            ` : `
                <div class="candidate-actions" style="justify-content: flex-start; font-size: 12.5px; color: var(--text-muted);">
                    <i class="fa-solid fa-info-circle"></i> Diproses pada ${new Date(c.processed_at || c.submitted_at).toLocaleString('id-ID')} oleh <strong>${this.escapeHtml(c.processed_by || 'Administrator')}</strong>
                    ${c.rejection_reason ? `<div style="color: var(--danger); margin-top: 4px;"><strong>Alasan Penolakan:</strong> ${this.escapeHtml(c.rejection_reason)}</div>` : ''}
                </div>
            `;

            return `
                <div class="candidate-card">
                    <div class="candidate-header">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                ${typeBadge}
                                ${statusBadge}
                                <span class="badge badge-secondary">${this.escapeHtml(c.category_name || 'Umum')}</span>
                            </div>
                            <div class="candidate-title">${this.escapeHtml(c.title)}</div>
                            <div class="candidate-meta">
                                <span><i class="fa-solid fa-user"></i> Sumber: <strong>${this.escapeHtml(c.doctor_name || c.source_name || 'Panel Medis')}</strong></span>
                                <span><i class="fa-solid fa-calendar"></i> Masuk: ${new Date(c.submitted_at).toLocaleDateString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    ${c.question_text ? `
                        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">
                            <strong>Pertanyaan Pengguna:</strong> <em>"${this.escapeHtml(c.question_text)}"</em>
                        </div>
                    ` : ''}

                    <div class="candidate-content-box">
                        <strong>Usulan Jawaban Klinis:</strong>
                        ${this.escapeHtml(c.proposed_answer)}
                    </div>

                    ${points.length > 0 ? `
                        <div style="font-size: 13px; margin: 10px 0;">
                            <strong>Poin Penanganan:</strong>
                            <ul style="margin: 4px 0 0 20px; line-height: 1.5;">
                                ${points.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${actions}
                </div>
            `;
        }).join('');
    },

    async validateCandidateDirect(candidateId) {
        if (!confirm('Validasi dan promosikan kandidat ini ke Knowledge Base aktif? Chatbot Telegram akan langsung dapat menggunakannya.')) return;

        try {
            const res = await fetch(`/api/candidates/${candidateId}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_user: 'Administrator Medis' })
            });
            const data = await res.json();
            if (data.success) {
                this.toast('success', 'Kandidat BERHASIL divalidasi & aktif di Knowledge Base!');
                await this.loadInitialData();
                this.renderCandidates();
            } else {
                this.toast('error', data.error || 'Gagal memvalidasi.');
            }
        } catch (err) {
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    openRejectModal(candidateId) {
        document.getElementById('reject-candidate-id').value = candidateId;
        document.getElementById('reject-candidate-reason').value = '';
        this.openModal('modal-reject-candidate');
    },

    async handleCandidateRejectSubmit(event) {
        event.preventDefault();
        const candidateId = document.getElementById('reject-candidate-id').value;
        const reason = document.getElementById('reject-candidate-reason').value;

        if (!reason || reason.trim().length === 0) {
            this.toast('error', 'Alasan penolakan wajib diisi.');
            return;
        }

        try {
            const res = await fetch(`/api/candidates/${candidateId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, admin_user: 'Administrator Medis' })
            });
            const data = await res.json();
            if (data.success) {
                this.toast('info', 'Kandidat telah DITOLAK dan tidak akan digunakan oleh chatbot.');
                this.closeModal('modal-reject-candidate');
                await this.loadInitialData();
                this.renderCandidates();
            } else {
                this.toast('error', data.error || 'Gagal menolak kandidat.');
            }
        } catch (err) {
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    // -------------------------------------------------------------
    // TAB 4: DOCTOR QUEUE
    // -------------------------------------------------------------
    renderDoctorQueue() {
        const tbody = document.getElementById('doctor-queue-table-body');
        if (!tbody) return;

        const statusFilter = document.getElementById('doctor-filter-status')?.value || 'ALL';
        let list = [...this.state.doctorQuestions];

        if (statusFilter !== 'ALL') {
            list = list.filter(q => q.status === statusFilter);
        }

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada pertanyaan dalam antrian dokter.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(q => {
            let statusBadge = '';
            if (q.status === 'WAITING') statusBadge = `<span class="badge badge-danger"><i class="fa-solid fa-hourglass-start"></i> WAITING</span>`;
            else if (q.status === 'ASSIGNED') statusBadge = `<span class="badge badge-warning"><i class="fa-solid fa-user-check"></i> ASSIGNED</span>`;
            else if (q.status === 'ANSWERED') statusBadge = `<span class="badge badge-success"><i class="fa-solid fa-check-double"></i> ANSWERED</span>`;
            else statusBadge = `<span class="badge badge-secondary">${q.status}</span>`;

            const actionBtn = q.status !== 'ANSWERED'
                ? `<button class="btn btn-sm btn-primary" onclick="App.openDoctorAnswerModal(${q.id})"><i class="fa-solid fa-stethoscope"></i> Jawab</button>`
                : `<button class="btn btn-sm btn-secondary" onclick="App.viewDoctorAnswer(${q.id})"><i class="fa-solid fa-eye"></i> Respon</button>`;

            return `
                <tr>
                    <td><strong>#${q.id}</strong></td>
                    <td style="font-weight: 600; max-width: 280px;">${this.escapeHtml(q.question_text)}</td>
                    <td style="font-size: 12px; color: var(--text-muted);"><i class="fa-brands fa-telegram" style="color:#0088cc;"></i> Chat ID: ${this.escapeHtml(q.telegram_chat_id || '-')}</td>
                    <td>${statusBadge}</td>
                    <td style="font-size: 12.5px;">${this.escapeHtml(q.assigned_doctor_name || '-')}</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${new Date(q.created_at).toLocaleString('id-ID')}</td>
                    <td style="text-align: right;">${actionBtn}</td>
                </tr>
            `;
        }).join('');
    },

    openDoctorAnswerModal(doctorQuestionId) {
        const q = this.state.doctorQuestions.find(item => item.id === doctorQuestionId);
        if (!q) return;

        document.getElementById('doc-ans-question-id').value = q.id;
        document.getElementById('doc-ans-question-text').textContent = q.question_text;
        document.getElementById('doc-ans-doctor-name').value = 'Dr. Siti Rahmawati, Sp.PD';
        document.getElementById('doc-ans-response').value = '';
        document.getElementById('doc-ans-advice').value = '';

        this.openModal('modal-doctor-answer');
    },

    async handleDoctorAnswerSubmit(event) {
        event.preventDefault();
        const questionId = document.getElementById('doc-ans-question-id').value;
        const doctor_name = document.getElementById('doc-ans-doctor-name').value;
        const category_id = document.getElementById('doc-ans-category').value;
        const response_text = document.getElementById('doc-ans-response').value;
        const medical_advice = document.getElementById('doc-ans-advice').value;

        try {
            const res = await fetch(`/api/doctor/questions/${questionId}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doctor_name,
                    category_id: Number(category_id),
                    response_text,
                    medical_advice
                })
            });

            const data = await res.json();
            if (data.success) {
                this.toast('success', 'Jawaban dokter terkirim ke Telegram pengguna & masuk ke antrian Knowledge Candidates!');
                this.closeModal('modal-doctor-answer');
                await this.loadInitialData();
                this.renderDoctorQueue();
            } else {
                this.toast('error', data.error || 'Gagal mengirim jawaban.');
            }
        } catch (err) {
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    viewDoctorAnswer(doctorQuestionId) {
        const q = this.state.doctorQuestions.find(item => item.id === doctorQuestionId);
        if (!q || !q.response) return;

        alert(`Jawaban dari ${q.response.doctor_name}:\n\n${q.response.response_text}\n\nSaran: ${q.response.medical_advice || '-'}`);
    },

    // -------------------------------------------------------------
    // TAB 5: DOCUMENT IMPORT (PDF / DOCX / MANUAL)
    // -------------------------------------------------------------
    switchDocSubTab(subTab) {
        this.state.currentDocSubTab = subTab;

        // Button states
        ['single', 'batch', 'manual'].forEach(t => {
            const btn = document.getElementById(`btn-subtab-${t}`);
            const view = document.getElementById(`view-doc-${t}`);
            if (btn) btn.classList.toggle('active', t === subTab);
            if (view) view.style.display = t === subTab ? 'block' : 'none';
        });
    },

    selectDestination(dest) {
        this.state.selectedDestination = dest;
        const cardActive = document.getElementById('card-dest-active');
        const cardPending = document.getElementById('card-dest-pending');
        const badge = document.getElementById('doc-form-mode-badge');
        const submitBtn = document.getElementById('btn-submit-doc-import');

        if (dest === 'ACTIVE') {
            cardActive?.classList.add('selected');
            cardPending?.classList.remove('selected');
            if (badge) {
                badge.className = 'badge badge-success';
                badge.textContent = 'Langsung ke Knowledge Base (ACTIVE)';
            }
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Simpan ke Knowledge Base Tervalidasi';
                submitBtn.className = 'btn btn-primary';
            }
        } else {
            cardPending?.classList.add('selected');
            cardActive?.classList.remove('selected');
            if (badge) {
                badge.className = 'badge badge-warning';
                badge.textContent = 'Antrian Review Candidate (PENDING)';
            }
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim ke Antrian Validasi';
                submitBtn.className = 'btn btn-warning';
            }
        }
    },

    handleFileSelect(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.processUploadedFile(files[0]);
        }
    },

    async processUploadedFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExts = ['pdf', 'docx', 'doc', 'txt', 'md'];

        if (!validExts.includes(ext)) {
            this.toast('error', `Format file tidak didukung (.${ext}). Harap unggah file PDF (.pdf) atau Word (.docx).`);
            return;
        }

        if (file.size > 25 * 1024 * 1024) {
            this.toast('error', 'Ukuran file melebihi batas maksimum 25MB.');
            return;
        }

        this.state.currentFile = file;

        // UI state: loading
        const loadingEl = document.getElementById('doc-extract-loading');
        const dropzoneEl = document.getElementById('doc-dropzone');
        const previewCard = document.getElementById('doc-file-preview-card');

        if (loadingEl) loadingEl.style.display = 'block';
        if (dropzoneEl) dropzoneEl.style.display = 'none';
        if (previewCard) previewCard.style.display = 'none';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/knowledge/parse-document', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (loadingEl) loadingEl.style.display = 'none';

            if (result.success && result.data) {
                const data = result.data;
                this.toast('success', `File "${file.name}" berhasil diekstrak dan dianalisis!`);

                // Update preview card
                if (previewCard) {
                    previewCard.style.display = 'flex';
                    document.getElementById('doc-preview-filename').textContent = file.name;
                    document.getElementById('doc-preview-filesize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
                    document.getElementById('doc-preview-format').textContent = data.format || ext.toUpperCase();

                    const avatar = document.getElementById('doc-preview-avatar');
                    if (avatar) {
                        avatar.className = `file-type-avatar ${ext === 'pdf' ? 'pdf' : (ext.includes('doc') ? 'docx' : 'text')}`;
                        avatar.innerHTML = ext === 'pdf'
                            ? '<i class="fa-solid fa-file-pdf"></i>'
                            : (ext.includes('doc') ? '<i class="fa-solid fa-file-word"></i>' : '<i class="fa-solid fa-file-lines"></i>');
                    }
                }

                // Populate Form Fields
                document.getElementById('doc-title').value = data.title || '';
                document.getElementById('doc-category').value = data.category_id || 1;
                document.getElementById('doc-publisher').value = data.publisher || '';
                document.getElementById('doc-year').value = data.year || new Date().getFullYear();
                document.getElementById('doc-keywords').value = data.topic_keywords || '';
                document.getElementById('doc-target-question').value = data.target_question || '';
                document.getElementById('doc-proposed-answer').value = data.short_answer || '';

                const pointsText = Array.isArray(data.important_points) ? data.important_points.join('\n') : (data.important_points || '');
                document.getElementById('doc-important-points').value = pointsText;
                document.getElementById('doc-when-doctor').value = data.when_to_see_doctor || '';
                document.getElementById('import-doc-raw-text').value = data.content_full || '';
                document.getElementById('import-doc-original-filename').value = file.name;

                // Update Raw Text Accordion
                const rawBody = document.getElementById('doc-raw-text-body');
                if (rawBody) {
                    rawBody.textContent = data.content_full || '(Teks tidak tersedia)';
                }

                // Scroll smoothly to form
                document.getElementById('form-import-document')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                if (dropzoneEl) dropzoneEl.style.display = 'block';
                this.toast('error', result.error || 'Gagal mengekstrak teks dari file.');
            }
        } catch (err) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (dropzoneEl) dropzoneEl.style.display = 'block';
            console.error('[Document Extraction Error]', err);
            this.toast('error', 'Terjadi kesalahan jaringan saat mengunggah file.');
        }
    },

    clearSelectedDocument() {
        this.state.currentFile = null;
        document.getElementById('doc-file-input').value = '';
        document.getElementById('doc-dropzone').style.display = 'block';
        document.getElementById('doc-file-preview-card').style.display = 'none';
        document.getElementById('doc-extract-loading').style.display = 'none';
        document.getElementById('form-import-document').reset();
        document.getElementById('doc-raw-text-body').textContent = '(Belum ada file yang diekstrak)';
        this.selectDestination('ACTIVE');
    },

    toggleRawTextAccordion() {
        const acc = document.getElementById('doc-raw-accordion');
        const chevron = document.getElementById('raw-text-chevron');
        if (acc) {
            acc.classList.toggle('open');
            if (chevron) {
                chevron.className = acc.classList.contains('open') ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
            }
        }
    },

    async handleDocumentImportSubmit(event) {
        event.preventDefault();

        const title = document.getElementById('doc-title').value;
        const category_id = document.getElementById('doc-category').value;
        const publisher = document.getElementById('doc-publisher').value;
        const year = document.getElementById('doc-year').value;
        const url = document.getElementById('doc-url').value;
        const topic_keywords = document.getElementById('doc-keywords').value;
        const target_question = document.getElementById('doc-target-question').value;
        const short_answer = document.getElementById('doc-proposed-answer').value;
        const rawPoints = document.getElementById('doc-important-points').value;
        const when_to_see_doctor = document.getElementById('doc-when-doctor').value;
        const validated_by = document.getElementById('doc-validator-name').value;
        const content_full = document.getElementById('import-doc-raw-text').value;
        const original_filename = document.getElementById('import-doc-original-filename').value;

        const important_points = rawPoints
            .split('\n')
            .map(p => p.replace(/^[•\-\*]\s*/, '').trim())
            .filter(p => p.length > 0);

        const payload = {
            title,
            category_id: Number(category_id),
            source_name: `${publisher} (${year})`,
            publisher,
            year: Number(year),
            url: url || null,
            topic_keywords,
            target_question,
            short_answer,
            important_points,
            when_to_see_doctor,
            content_full,
            original_filename,
            validated_by,
            target_status: this.state.selectedDestination
        };

        try {
            const res = await fetch('/api/knowledge/import-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                if (this.state.selectedDestination === 'ACTIVE') {
                    this.toast('success', `Dokumen "${title}" BERHASIL diimpor langsung ke Knowledge Base aktif!`);
                    this.clearSelectedDocument();
                    await this.loadInitialData();
                    this.switchTab('knowledge');
                } else {
                    this.toast('info', `Dokumen "${title}" berhasil dikirim ke antrian Knowledge Candidates (PENDING).`);
                    this.clearSelectedDocument();
                    await this.loadInitialData();
                    this.switchTab('validator');
                }
            } else {
                this.toast('error', data.error || 'Gagal mengimpor dokumen.');
            }
        } catch (err) {
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    // Batch Import Handler
    handleBatchFilesSelect(event) {
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            this.addBatchFiles(files);
        }
    },

    addBatchFiles(files) {
        const validFiles = files.filter(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            return ['pdf', 'docx', 'doc', 'txt', 'md'].includes(ext);
        });

        if (validFiles.length === 0) {
            this.toast('error', 'Tidak ada file valid yang dipilih (hanya PDF, DOCX, TXT).');
            return;
        }

        this.state.batchFiles = [...this.state.batchFiles, ...validFiles].slice(0, 10);
        this.renderBatchFilesList();
    },

    renderBatchFilesList() {
        const container = document.getElementById('batch-selected-files-container');
        const listEl = document.getElementById('batch-files-list');
        if (!container || !listEl) return;

        if (this.state.batchFiles.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        listEl.innerHTML = this.state.batchFiles.map((f, idx) => {
            const ext = f.name.split('.').pop().toLowerCase();
            const icon = ext === 'pdf' ? 'fa-file-pdf' : (ext.includes('doc') ? 'fa-file-word' : 'fa-file-lines');
            const color = ext === 'pdf' ? '#dc2626' : (ext.includes('doc') ? '#0284c7' : '#64748b');

            return `
                <div class="batch-item">
                    <div class="batch-item-left">
                        <i class="fa-solid ${icon}" style="font-size: 22px; color: ${color};"></i>
                        <div>
                            <strong>${this.escapeHtml(f.name)}</strong>
                            <div style="font-size: 11.5px; color: var(--text-muted);">${(f.size / 1024).toFixed(1)} KB</div>
                        </div>
                    </div>
                    <div class="batch-item-right">
                        <span class="badge badge-secondary">Siap Diimpor</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="App.removeBatchFile(${idx})" title="Hapus"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    removeBatchFile(index) {
        this.state.batchFiles.splice(index, 1);
        this.renderBatchFilesList();
    },

    clearBatchFiles() {
        this.state.batchFiles = [];
        document.getElementById('batch-file-input').value = '';
        this.renderBatchFilesList();
    },

    async runBatchImport() {
        if (this.state.batchFiles.length === 0) return;

        const btn = document.getElementById('btn-run-batch-import');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor dokumen...';
        }

        const formData = new FormData();
        this.state.batchFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('target_status', 'ACTIVE');
        formData.append('validated_by', 'Administrator Medis');

        try {
            const res = await fetch('/api/knowledge/batch-import', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Mulai Batch Import ke Knowledge Base';
            }

            if (data.success) {
                this.toast('success', `Berhasil mengimpor ${data.imported_count} dari ${data.total_uploaded} dokumen ke Knowledge Base!`);
                this.clearBatchFiles();
                await this.loadInitialData();
                this.switchTab('knowledge');
            } else {
                this.toast('error', data.error || 'Gagal memproses batch import.');
            }
        } catch (err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Mulai Batch Import ke Knowledge Base';
            }
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    // Manual Journal Form Submit
    async handleJournalSubmit(event) {
        event.preventDefault();
        const title = document.getElementById('journal-title').value;
        const category_id = document.getElementById('journal-category').value;
        const publisher = document.getElementById('journal-publisher').value;
        const year = document.getElementById('journal-year').value;
        const url = document.getElementById('journal-url').value;
        const target_question = document.getElementById('journal-target-question').value;
        const proposed_answer = document.getElementById('journal-proposed-answer').value;
        const rawPoints = document.getElementById('journal-important-points').value;
        const when_to_see_doctor = document.getElementById('journal-when-doctor').value;

        const important_points = rawPoints
            .split('\n')
            .map(p => p.replace(/^[•\-\*]\s*/, '').trim())
            .filter(p => p.length > 0);

        const payload = {
            title,
            category_id: Number(category_id),
            source_name: title,
            publisher,
            year: Number(year),
            url,
            target_question,
            proposed_answer,
            important_points,
            when_to_see_doctor,
            admin_user: 'Administrator Medis'
        };

        try {
            const res = await fetch('/api/candidates/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                this.toast('success', 'Jurnal berhasil didaftarkan sebagai Knowledge Candidate (PENDING)!');
                document.getElementById('form-add-journal').reset();
                await this.loadInitialData();
                this.switchTab('validator');
            } else {
                this.toast('error', data.error || 'Gagal mendaftarkan jurnal.');
            }
        } catch (err) {
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    // -------------------------------------------------------------
    // TAB 7: VALIDATION LOGS
    // -------------------------------------------------------------
    renderValidationLogs() {
        const tbody = document.getElementById('validation-logs-table-body');
        if (!tbody) return;

        const logs = this.state.validationLogs || [];
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">Belum ada riwayat validasi.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            let badgeClass = l.action.includes('VALIDATED') ? 'badge-success' : (l.action === 'REJECTED' ? 'badge-danger' : 'badge-info');
            return `
                <tr>
                    <td><strong>#${l.id}</strong></td>
                    <td><span class="badge ${badgeClass}">${l.action}</span></td>
                    <td style="font-weight: 600;">${this.escapeHtml(l.admin_user)}</td>
                    <td style="font-size: 12.5px;">Candidate #${l.candidate_id || '-'} ${l.knowledge_id ? `/ KB #${l.knowledge_id}` : ''}</td>
                    <td><span class="badge badge-secondary">${l.previous_status || '-'} &rarr; ${l.new_status}</span></td>
                    <td style="font-size: 13px;">${this.escapeHtml(l.notes || '-')}</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${new Date(l.created_at).toLocaleString('id-ID')}</td>
                </tr>
            `;
        }).join('');
    },

    // -------------------------------------------------------------
    // TAB 8: CATEGORIES & SOURCES (WITH FULL CRUD)
    // -------------------------------------------------------------
    renderCategoriesAndSources() {
        const catBody = document.getElementById('categories-table-body');
        if (catBody) {
            const categories = this.state.categories || [];
            if (categories.length === 0) {
                catBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">Belum ada kategori terdaftar.</td></tr>`;
            } else {
                catBody.innerHTML = categories.map(c => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                                <i class="fa-solid fa-${c.icon || 'stethoscope'}" style="color: var(--primary); font-size: 15px; width: 18px; text-align: center;"></i>
                                <span>${this.escapeHtml(c.name)}</span>
                            </div>
                        </td>
                        <td><code style="font-size: 11.5px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${this.escapeHtml(c.slug)}</code></td>
                        <td style="font-size: 12.5px; color: var(--text-muted); max-width: 240px;">${this.escapeHtml(c.description || '-')}</td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button class="btn btn-xs btn-outline-primary" onclick="App.openCategoryModal(${c.id})" title="Edit Kategori" style="padding: 4px 8px; margin-right: 4px;">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-xs btn-outline-danger" onclick="App.deleteCategory(${c.id}, '${this.escapeHtml(c.name)}')" title="Hapus Kategori" style="padding: 4px 8px;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        const srcBody = document.getElementById('sources-table-body');
        if (srcBody) {
            const seen = new Set();
            const unique = [];
            (this.state.sources || []).forEach(s => {
                const key = (s.name || '').trim().toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(s);
                }
            });

            srcBody.innerHTML = unique.map(s => `
                <tr>
                    <td><strong>${this.escapeHtml(s.name)}</strong></td>
                    <td><span class="badge badge-primary">${s.type}</span></td>
                    <td style="font-size: 12.5px;">${this.escapeHtml(s.publisher || '-')} (${s.year || '-'})</td>
                </tr>
            `).join('');
        }
    },

    openCategoryModal(catId = null) {
        const form = document.getElementById('form-category');
        const titleEl = document.getElementById('modal-category-title');
        const idInput = document.getElementById('cat-form-id');
        const nameInput = document.getElementById('cat-form-name');
        const slugInput = document.getElementById('cat-form-slug');
        const iconInput = document.getElementById('cat-form-icon');
        const descInput = document.getElementById('cat-form-desc');

        if (catId) {
            const category = this.state.categories.find(c => Number(c.id) === Number(catId));
            if (category) {
                if (titleEl) titleEl.textContent = 'Edit Kategori Medis';
                if (idInput) idInput.value = category.id;
                if (nameInput) nameInput.value = category.name;
                if (slugInput) slugInput.value = category.slug;
                if (iconInput) iconInput.value = category.icon || 'stethoscope';
                if (descInput) descInput.value = category.description || '';
            }
        } else {
            if (form) form.reset();
            if (titleEl) titleEl.textContent = 'Tambah Kategori Medis';
            if (idInput) idInput.value = '';
            if (iconInput) iconInput.value = 'stethoscope';
        }

        this.openModal('modal-category');
    },

    async handleCategorySubmit(event) {
        event.preventDefault();
        const id = document.getElementById('cat-form-id').value;
        const name = document.getElementById('cat-form-name').value.trim();
        const slug = document.getElementById('cat-form-slug').value.trim();
        const icon = document.getElementById('cat-form-icon').value;
        const description = document.getElementById('cat-form-desc').value.trim();

        if (!name) {
            this.toast('error', 'Nama kategori wajib diisi.');
            return;
        }

        const payload = { name, slug, icon, description };
        const url = id ? `/api/categories/${id}` : '/api/categories';
        const method = id ? 'PUT' : 'POST';

        const btn = document.getElementById('btn-submit-category');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Simpan Kategori';
            }

            if (data.success) {
                this.toast('success', data.message || 'Kategori berhasil disimpan.');
                this.closeModal('modal-category');
                await this.loadInitialData();
                this.renderCategoriesAndSources();
            } else {
                this.toast('error', data.error || 'Gagal menyimpan kategori.');
            }
        } catch (err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Simpan Kategori';
            }
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    async deleteCategory(catId, catName) {
        if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${catName}"?\n\nPengetahuan yang terhubung dengan kategori ini akan otomatis dipindahkan ke kategori Umum.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/categories/${catId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.success) {
                this.toast('success', data.message || 'Kategori berhasil dihapus.');
                await this.loadInitialData();
                this.renderCategoriesAndSources();
            } else {
                this.toast('error', data.error || 'Gagal menghapus kategori.');
            }
        } catch (err) {
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    // -------------------------------------------------------------
    // SUPERADMIN: RESET KNOWLEDGE BASE
    // -------------------------------------------------------------
    openResetModal() {
        const form = document.getElementById('form-reset-knowledge');
        if (form) form.reset();
        this.openModal('modal-reset-knowledge');
    },

    async handleResetKnowledgeSubmit(event) {
        event.preventDefault();
        const mode = document.getElementById('reset-mode').value;
        const password = document.getElementById('reset-superadmin-password').value;

        if (!password) {
            this.toast('error', 'Password Super Admin wajib diisi.');
            return;
        }

        const btn = document.getElementById('btn-submit-reset-kb');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mereset Data...';
        }

        try {
            const res = await fetch('/api/system/reset-knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    password,
                    admin_user: 'Super Administrator'
                })
            });

            const data = await res.json();
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Konfirmasi Reset';
            }

            if (data.success) {
                this.toast('success', data.message || 'Knowledge Base berhasil direset!');
                this.closeModal('modal-reset-knowledge');
                await this.loadInitialData();
                this.switchTab('knowledge');
            } else {
                this.toast('error', data.error || 'Password salah atau gagal mereset database.');
            }
        } catch (err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Konfirmasi Reset';
            }
            this.toast('error', 'Terjadi kesalahan jaringan.');
        }
    },

    // -------------------------------------------------------------
    // MULTILINGUAL & LANGUAGE SWITCHER
    // -------------------------------------------------------------
    setLanguage(lang = 'id') {
        localStorage.setItem('telehealth_admin_lang', lang);
        document.getElementById('btn-lang-id')?.classList.toggle('active', lang === 'id');
        document.getElementById('btn-lang-en')?.classList.toggle('active', lang === 'en');

        const isEn = lang === 'en';
        const titleEl = document.getElementById('page-current-title');
        const refreshBtn = document.getElementById('btn-refresh-data');
        const tgText = document.getElementById('topbar-tg-text');

        if (refreshBtn) {
            refreshBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> ${isEn ? 'Refresh' : 'Refresh'}`;
        }
        if (tgText) {
            tgText.innerHTML = `<i class="fa-brands fa-telegram"></i> ${isEn ? 'Telegram Bot Connected' : 'Bot Telegram Terhubung'}`;
        }

        this.toast('info', isEn ? 'Language switched to English 🇬🇧' : 'Bahasa diubah ke Bahasa Indonesia 🇮🇩');
    },

    // -------------------------------------------------------------
    // TAB 9: SETTINGS & BOT TELEGRAM
    // -------------------------------------------------------------
    async renderSettings() {
        const diagEl = document.getElementById('system-diagnostic-info');
        if (!diagEl) return;

        try {
            const res = await fetch('/api/system/status');
            const data = await res.json();
            if (data.success) {
                const s = data.data;
                diagEl.innerHTML = `
                    <div style="font-size: 13.5px; line-height: 1.8;">
                        <div><strong>Sistem:</strong> ${s.system_name} (v${s.version})</div>
                        <div><strong>Database Engine:</strong> <span class="badge badge-success">${s.database.type}</span></div>
                        <div><strong>Knowledge Items:</strong> <strong>${s.database.total_knowledge || 0}</strong> aktif</div>
                        <div><strong>Kategori Medis:</strong> <strong>${s.database.total_categories || 0}</strong> kategori</div>
                        <div><strong>Telegram Bot:</strong> ${s.telegram_bot.polling ? '<span class="badge badge-success">ACTIVE POLLING</span>' : '<span class="badge badge-secondary">READY / WEBHOOK</span>'}</div>
                        <div><strong>Uptime Server:</strong> ${(s.uptime_seconds / 60).toFixed(1)} menit</div>
                        <div style="margin-top: 10px;">
                            <a href="/api/system/status" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fa-solid fa-code"></i> Periksa Diagnostic JSON
                            </a>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            diagEl.innerHTML = '<p style="color: var(--danger);">Gagal memuat status sistem.</p>';
        }
    },

    // -------------------------------------------------------------
    // MODAL & UTILITY HELPERS
    // -------------------------------------------------------------
    openModal(modalId) {
        const m = document.getElementById(modalId);
        if (m) {
            m.classList.add('active');
            if (!m.dataset.backdropBound) {
                m.dataset.backdropBound = 'true';
                m.addEventListener('click', (e) => {
                    if (e.target === m) {
                        this.closeModal(modalId);
                    }
                });
            }
        }
    },

    closeModal(modalId) {
        const m = document.getElementById(modalId);
        if (m) m.classList.remove('active');
    },

    toast(type, message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle');
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${this.escapeHtml(message)}</span>`;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
};

// Auto boot on DOM load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

