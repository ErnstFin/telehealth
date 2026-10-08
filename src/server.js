/**
 * TeleHealth Core Server
 * REST API + Web Administrator Backend + Telegram Bot Integration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const chatRoutes = require('./routes/chatRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const systemRoutes = require('./routes/systemRoutes');
const telegramBot = require('./services/telegramBot');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Request Logger
app.use((req, res, next) => {
    if (!req.path.startsWith('/css') && !req.path.startsWith('/js') && !req.path.startsWith('/favicon')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', systemRoutes);

// SPA fallback to index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start Server only if executed directly
if (require.main === module) {
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
        console.log(`=======================================================`);
        console.log(`🏥 TeleHealth Medical Chatbot & Knowledge Server Active`);
        console.log(`🌐 Web Administrator: http://localhost:${PORT} (Host: ${HOST})`);
        console.log(`🤖 Telegram Bot: ${telegramBot.isEnabled ? 'Active (Polling)' : 'Simulator Mode Ready'}`);
        console.log(`=======================================================`);
    });
}

module.exports = app;

