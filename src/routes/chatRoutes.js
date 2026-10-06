/**
 * Chat & Query API Routes
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
