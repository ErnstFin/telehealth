/**
 * Chat & Query API Routes (supports Web Simulator, Telegram Webhook, and REST clients)
 */

const express = require('express');
const router = express.Router();
const telegramBot = require('../services/telegramBot');
const db = require('../db');

// Main Chat Ask Endpoint (Used by Web Simulator, n8n Webhook, or external clients)
router.post('/ask', async (req, res) => {
    try {
        const { text, telegramChatId, telegramUserId, username, firstName, lastName, messageId } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Field "text" is required.' });
        }

        const result = await telegramBot.handleIncomingMessage({
            telegramChatId: telegramChatId || 'web-sim-001',
            telegramUserId: telegramUserId || 'sim_user',
            username: username || 'simulated_user',
            firstName: firstName || 'User Simulator',
            lastName: lastName || '',
            messageId: messageId || Date.now().toString(),
            text
        });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('[Chat API] Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// Telegram Official Webhook Receiver Endpoint (alternative to Polling)
const handleWebhook = async (req, res) => {
    try {
        if (req.body) {
            await telegramBot.processWebhookUpdate(req.body);
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error('[Telegram Webhook Error]', err);
        res.status(200).send('OK'); // Always return 200 to Telegram so it does not keep retrying errored packets
    }
};

router.post('/telegram-webhook', handleWebhook);
router.post('/webhook', handleWebhook);

const anamnesisService = require('../services/anamnesisService');

// Anamnesis Sacred Seven Endpoints
router.post('/anamnesis/start', (req, res) => {
    try {
        const { chatId = 'web-user', complaint = '', lang = 'id' } = req.body;
        const result = anamnesisService.startSession(chatId, complaint, lang);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/anamnesis/answer', async (req, res) => {
    try {
        const { chatId = 'web-user', answer = '' } = req.body;
        const result = await anamnesisService.processAnswer(chatId, answer);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/anamnesis/early-accept', async (req, res) => {
    try {
        const { chatId = 'web-user' } = req.body;
        const result = await anamnesisService.acceptEarlyExit(chatId);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/anamnesis/early-continue', (req, res) => {
    try {
        const { chatId = 'web-user' } = req.body;
        const result = anamnesisService.continueAnamnesis(chatId);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/anamnesis/cancel', (req, res) => {
    try {
        const { chatId = 'web-user' } = req.body;
        anamnesisService.cancelSession(chatId);
        res.json({ success: true, message: 'Anamnesis session cancelled.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/anamnesis/session/:chatId', (req, res) => {
    try {
        const session = anamnesisService.getSession(req.params.chatId);
        res.json({ success: true, active: Boolean(session), session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Chat History
router.get('/history', (req, res) => {
    try {
        const { limit = 50, status } = req.query;
        let questions = db.find('questions');
        if (status) {
            questions = questions.filter(q => q.status === status);
        }
        questions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({
            success: true,
            data: questions.slice(0, Number(limit))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
