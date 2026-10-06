/**
 * System Management, Metadata, and Utility Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const telegramBot = require('../services/telegramBot');

// 1. Categories
router.get('/categories', (req, res) => {
    try {
        const categories = db.find('categories');
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/categories', (req, res) => {
    try {
        const { name, slug, description, icon } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const created = db.insert('categories', {
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            description: description || '',
            icon: icon || 'stethoscope'
        });
        res.status(201).json({ success: true, data: created });
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

// 5. System Status
const handleStatus = (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                system_name: 'TeleHealth Medical Chatbot & Knowledge Base',
                version: '1.0.0',
                uptime_seconds: process.uptime(),
                database: {
                    type: db.isPg ? 'PostgreSQL' : 'Persistent Storage Engine',
                    connected: true
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
