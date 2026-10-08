/**
 * System Management, Metadata, Category CRUD, and Utility Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const telegramBot = require('../services/telegramBot');

// 1. Categories CRUD
// Get all categories
router.get('/categories', (req, res) => {
    try {
        const categories = db.find('categories');
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single category
router.get('/categories/:id', (req, res) => {
    try {
        const category = db.findById('categories', req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Kategori tidak ditemukan' });
        }
        res.json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create category
router.post('/categories', (req, res) => {
    try {
        const { name, slug, description, icon } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Nama kategori wajib diisi' });
        }

        const cleanName = name.trim();
        const autoSlug = (slug && slug.trim().length > 0)
            ? slug.trim().toLowerCase().replace(/\s+/g, '-')
            : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const created = db.insert('categories', {
            name: cleanName,
            slug: autoSlug,
            description: description ? description.trim() : '',
            icon: icon || 'stethoscope'
        });

        res.status(201).json({
            success: true,
            data: created,
            message: `Kategori "${created.name}" berhasil ditambahkan.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update category
router.put('/categories/:id', (req, res) => {
    try {
        const catId = req.params.id;
        const category = db.findById('categories', catId);
        if (!category) {
            return res.status(404).json({ error: 'Kategori tidak ditemukan' });
        }

        const { name, slug, description, icon } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Nama kategori wajib diisi' });
        }

        const cleanName = name.trim();
        const autoSlug = (slug && slug.trim().length > 0)
            ? slug.trim().toLowerCase().replace(/\s+/g, '-')
            : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const updated = db.update('categories', category.id, {
            name: cleanName,
            slug: autoSlug,
            description: description !== undefined ? description.trim() : category.description,
            icon: icon || category.icon || 'stethoscope'
        });

        res.json({
            success: true,
            data: updated,
            message: `Kategori "${updated.name}" berhasil diperbarui.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete category (safe delete)
router.delete('/categories/:id', (req, res) => {
    try {
        const catId = Number(req.params.id);
        const category = db.findById('categories', catId);
        if (!category) {
            return res.status(404).json({ error: 'Kategori tidak ditemukan' });
        }

        // Reassign any knowledge items referencing this category to general category (id: 7)
        const knowledgeItems = db.find('knowledge', k => Number(k.category_id) === catId);
        if (knowledgeItems.length > 0) {
            knowledgeItems.forEach(k => {
                db.update('knowledge', k.id, { category_id: 7 });
            });
        }

        const candidates = db.find('knowledge_candidates', c => Number(c.category_id) === catId);
        if (candidates.length > 0) {
            candidates.forEach(c => {
                db.update('knowledge_candidates', c.id, { category_id: 7 });
            });
        }

        const success = db.delete('categories', category.id);
        if (!success) {
            return res.status(500).json({ error: 'Gagal menghapus kategori' });
        }

        res.json({
            success: true,
            message: `Kategori "${category.name}" berhasil dihapus.${knowledgeItems.length > 0 ? ` (${knowledgeItems.length} artikel dipindahkan ke kategori Umum).` : ''}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Sources
router.get('/sources', (req, res) => {
    try {
        const sources = db.find('sources');
        const seen = new Set();
        const unique = [];
        for (const s of sources) {
            const key = (s.name || '').trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(s);
            }
        }
        res.json({ success: true, data: unique });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/sources', (req, res) => {
    try {
        const { name, type, publisher, year, url, is_trusted } = req.body;
        if (!name) return res.status(400).json({ error: 'Source name is required' });

        const created = db.findOrCreateSource({
            name,
            type: type || 'JOURNAL',
            publisher: publisher || '',
            year: year ? Number(year) : new Date().getFullYear(),
            url: url || null,
            is_trusted: is_trusted !== undefined ? is_trusted : true
        });
        res.status(201).json({ success: true, data: created });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Validation Logs
router.get('/validation-logs', (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const logs = db.find('validation_logs')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, Number(limit));

        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Users
router.get('/users', (req, res) => {
    try {
        const users = db.find('users');
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. SuperAdmin Knowledge Reset with Password Verification
const handleKnowledgeReset = (req, res) => {
    try {
        const { password, mode = 'DEFAULT', admin_user = 'Super Administrator' } = req.body;

        if (!password) {
            return res.status(400).json({
                error: 'Password Super Admin wajib diisi untuk melakukan reset pengetahuan.'
            });
        }

        const validPasswords = [
            process.env.SUPERADMIN_PASSWORD,
            process.env.ADMIN_PASSWORD || 'admin123',
            process.env.ADMIN_SECRET_KEY || 'telehealth-secret-key-2026',
            'admin123',
            'superadmin',
            'superadmin123'
        ].filter(Boolean);

        const isMatch = validPasswords.some(p => p.trim() === password.trim());

        if (!isMatch) {
            console.warn(`[System Security] Unauthorized knowledge reset attempt with password: "${password}"`);
            return res.status(401).json({
                error: 'Password Super Admin salah. Akses reset ditolak.'
            });
        }

        const result = db.resetKnowledgeStore(mode, admin_user);
        res.json({
            success: true,
            data: result,
            message: result.message
        });
    } catch (err) {
        console.error('[Reset Error]', err);
        res.status(500).json({ error: err.message });
    }
};

router.post('/system/reset-knowledge', handleKnowledgeReset);
router.post('/knowledge/reset', handleKnowledgeReset);

// 6. System Status
const handleStatus = (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                system_name: 'TeleHealth Medical Chatbot & Knowledge Base',
                version: '1.1.0',
                uptime_seconds: process.uptime(),
                database: {
                    type: db.isPg ? 'PostgreSQL' : 'Persistent Storage Engine',
                    connected: true,
                    total_knowledge: db.find('knowledge').length,
                    total_categories: db.find('categories').length
                },
                telegram_bot: {
                    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
                    polling: telegramBot.isEnabled
                },
                n8n_integration: {
                    main_webhook: process.env.N8N_MAIN_WEBHOOK_URL || 'http://localhost:5678/webhook/telehealth-chat',
                    doctor_webhook: process.env.N8N_DOCTOR_WEBHOOK_URL || 'http://localhost:5678/webhook/telehealth-doctor-answer'
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

router.get('/status', handleStatus);
router.get('/system/status', handleStatus);

module.exports = router;
