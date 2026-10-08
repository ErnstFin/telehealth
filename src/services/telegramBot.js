/**
 * Telegram Bot & Chatbot Pipeline Service
 * Manages live Telegram bot connection with rich UI/UX (Inline & Reply Keyboards,
 * Status Tickets, Interactive Callbacks) matching TaskFlow standards.
 */

require('dotenv').config();
const TelegramBotApi = require('node-telegram-bot-api');
const db = require('../db');
const HealthValidator = require('./healthValidator');
const KnowledgeRetriever = require('./knowledgeRetriever');
const ResponseGenerator = require('./responseGenerator');
const DoctorService = require('./doctorService');
const LanguageService = require('./languageService');

// Persistent Reply Keyboard at the bottom of the chat
const MAIN_REPLY_KEYBOARD = {
    keyboard: [
        [{ text: '🏠 Menu Utama' }, { text: '🩺 Cek Gejala & Topik' }],
        [{ text: '👨‍⚕️ Tanya Dokter' }, { text: '📋 Status Konsultasi' }],
        [{ text: 'ℹ️ Panduan & Bantuan' }]
    ],
    resize_keyboard: true,
    is_persistent: true
};

// Main interactive inline keyboard
const MAIN_INLINE_KEYBOARD = {
    inline_keyboard: [
        [
            { text: '🤒 Cek Gejala Umum', callback_data: 'menu_gejala' },
            { text: '💊 Info Obat & Terapi', callback_data: 'menu_obat' }
        ],
        [
            { text: '👨‍⚕️ Tanya Dokter Jaga', callback_data: 'menu_dokter' },
            { text: '📋 Status Konsultasi', callback_data: 'menu_status' }
        ],
        [
            { text: '🚨 Panduan Darurat / IGD', callback_data: 'menu_darurat' },
            { text: 'ℹ️ Panduan Bot', callback_data: 'menu_help' }
        ]
    ]
};

// Symptom exploration inline keyboard
const GEJALA_INLINE_KEYBOARD = {
    inline_keyboard: [
        [
            { text: '🤒 Flu, Batuk & Demam', callback_data: 'query_topic:penanganan flu batuk dan demam' },
            { text: '🤢 Sakit Maag & Lambung', callback_data: 'query_topic:gejala sakit maag asam lambung gerd' }
        ],
        [
            { text: '🤕 Sakit Kepala & Migrain', callback_data: 'query_topic:mengatasi sakit kepala migrain' },
            { text: '🤧 Alergi & ISPA', callback_data: 'query_topic:alergi debu dan ispa batuk' }
        ],
        [
            { text: '🩸 Hipertensi & Tensi', callback_data: 'query_topic:hipertensi tekanan darah tinggi' },
            { text: '🦷 Sakit Gigi & Gusi', callback_data: 'query_topic:penanganan sakit gigi nyeri gusi' }
        ],
        [
            { text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }
        ]
    ]
};

// Medication & Therapy exploration inline keyboard
const OBAT_INLINE_KEYBOARD = {
    inline_keyboard: [
        [
            { text: '💊 Paracetamol (Penurun Demam)', callback_data: 'query_topic:aturan minum paracetamol demam' },
            { text: '💊 Antasida (Obat Lambung)', callback_data: 'query_topic:aturan minum antasida sakit maag' }
        ],
        [
            { text: '💊 Vitamin C & Imunitas', callback_data: 'query_topic:konsumsi vitamin c harian' },
            { text: '💊 Panduan Minum Obat', callback_data: 'query_topic:panduan minum obat yang benar' }
        ],
        [
            { text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }
        ]
    ]
};

// Emergency & Red Flags inline keyboard
const EMERGENCY_INLINE_KEYBOARD = {
    inline_keyboard: [
        [
            { text: '👨‍⚕️ Konsultasi Dokter Jaga', callback_data: 'menu_dokter' }
        ],
        [
            { text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }
        ]
    ]
};

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.isEnabled = false;
        this.initLiveBot();
    }

    async initLiveBot() {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
        if (token && token.length > 10 && !token.includes('your_telegram_bot_token')) {
            try {
                this.bot = new TelegramBotApi(token, { polling: false });

                try {
                    await this.bot.deleteWebHook();
                    console.log('[Telegram Bot] Cleaned previous webhooks for seamless polling.');
                } catch (e) {
                    // Ignore webhook deletion error
                }

                if (process.env.TELEGRAM_BOT_POLLING !== 'false') {
                    await this.bot.startPolling({ interval: 300, autoStart: true });
                    this.isEnabled = true;

                    try {
                        const botInfo = await this.bot.getMe();
                        console.log(`[Telegram Bot] 🚀 Live Telegram Bot @${botInfo.username} (${botInfo.first_name}) is ACTIVE and READY!`);
                    } catch (e) {
                        console.log('[Telegram Bot] Live Telegram Bot is ACTIVE and READY!');
                    }

                    this.registerHandlers();
                }
            } catch (err) {
                console.warn('[Telegram Bot] Could not initialize live Telegram bot:', err.message);
            }
        } else {
            console.log('[Telegram Bot] No live TELEGRAM_BOT_TOKEN specified. Interactive Web Simulator is active and ready.');
        }
    }

    registerHandlers() {
        if (!this.bot) return;

        this.bot.on('polling_error', (err) => {
            const msg = err.message || '';
            if (msg.includes('409') || msg.includes('Conflict')) {
                console.warn('[Telegram Polling Warning] 409 Conflict: Sesi polling ganda terdeteksi. Pastikan hanya 1 server instance (misal Railway atau Local) yang aktif dengan token ini.');
            } else {
                console.warn('[Telegram Polling Warning]:', msg);
            }
        });

        // 1. /start and /menu commands
        this.bot.onText(/\/(start|menu)/, async (msg) => {
            await this.sendWelcomeMenu(msg.chat.id, msg.from && msg.from.first_name);
        });

        // 2. /help command
        this.bot.onText(/\/help/, async (msg) => {
            await this.sendHelpMessage(msg.chat.id);
        });

        // 3. /status command
        this.bot.onText(/\/status/, async (msg) => {
            await this.sendStatusMessage(msg.chat.id, msg.from && msg.from.id);
        });

        // 4. /gejala command
        this.bot.onText(/\/gejala/, async (msg) => {
            await this.sendGejalaMenu(msg.chat.id);
        });

        // 5. /dokter command
        this.bot.onText(/\/dokter/, async (msg) => {
            await this.sendDoctorPrompt(msg.chat.id);
        });

        // 6. Interactive Callback Query Handler (Button Clicks)
        this.bot.on('callback_query', async (query) => {
            const data = query.data || '';
            const chatId = query.message ? query.message.chat.id : (query.from ? query.from.id : null);
            const userId = query.from ? query.from.id : null;
            const messageId = query.message ? query.message.message_id : null;

            // Immediately acknowledge callback query with visual feedback
            try {
                let ackText = 'Memproses...';
                if (data === 'menu_status') ackText = '📋 Membuka status antrian...';
                else if (data === 'menu_main') ackText = '🏠 Membuka Menu Utama...';
                else if (data === 'menu_gejala') ackText = '🩺 Membuka daftar gejala...';
                else if (data === 'menu_obat') ackText = '💊 Membuka panduan obat...';
                else if (data === 'menu_darurat') ackText = '🚨 Membuka panduan darurat...';
                else if (data === 'menu_help') ackText = 'ℹ️ Membuka panduan...';
                else if (data === 'menu_dokter') ackText = '👨‍⚕️ Membuka form dokter...';
                else if (data.startsWith('query_topic:')) ackText = '🔍 Mencari info medis...';
                else if (data.startsWith('forward_doctor:')) ackText = '👨‍⚕️ Meneruskan ke dokter...';
                await this.bot.answerCallbackQuery(query.id, { text: ackText, show_alert: false });
            } catch (e) {}

            if (!chatId) return;
            console.log(`[Telegram Bot] 🔘 Button Clicked: "${data}" by @${(query.from && query.from.username) || (query.from && query.from.first_name) || chatId}`);

            try {
                if (data === 'menu_main') {
                    await this.sendWelcomeMenu(chatId, (query.from && query.from.first_name) || 'Pengguna', messageId);
                } else if (data === 'menu_gejala') {
                    await this.sendGejalaMenu(chatId, messageId);
                } else if (data === 'menu_obat') {
                    await this.sendObatMenu(chatId, messageId);
                } else if (data === 'menu_darurat') {
                    await this.sendEmergencyGuide(chatId, messageId);
                } else if (data === 'menu_help') {
                    await this.sendHelpMessage(chatId, messageId);
                } else if (data === 'menu_status') {
                    await this.sendStatusMessage(chatId, userId, messageId);
                } else if (data === 'menu_dokter') {
                    await this.sendDoctorPrompt(chatId);
                } else if (data.startsWith('forward_doctor:')) {
                    const questionId = data.replace('forward_doctor:', '');
                    await this.handleForwardQuestionToDoctor(chatId, userId, query.from, questionId);
                } else if (data.startsWith('query_topic:')) {
                    const topicQuery = data.replace('query_topic:', '');
                    await this.processUserQuestion(chatId, userId, query.from, topicQuery);
                }
            } catch (cbErr) {
                console.error('[Telegram Callback Error]:', cbErr.message);
                await this.sendMessage(chatId, '⚠️ Terjadi kendala saat memproses pilihan Anda. Silakan ketik keluhan Anda secara langsung.');
            }
        });

        // 7. General Text Message Listener
        this.bot.on('message', async (msg) => {
            if (!msg.text) return;

            const text = msg.text.trim();
            const fromUser = msg.from || {};
            const firstName = fromUser.first_name || 'Pengguna';

            // Check reply keyboard commands
            if (text === '🏠 Menu Utama') {
                return this.sendWelcomeMenu(msg.chat.id, firstName);
            }
            if (text === '🩺 Cek Gejala & Topik') {
                return this.sendGejalaMenu(msg.chat.id);
            }
            if (text === '👨‍⚕️ Tanya Dokter') {
                return this.sendDoctorPrompt(msg.chat.id);
            }
            if (text === '📋 Status Konsultasi') {
                return this.sendStatusMessage(msg.chat.id, fromUser.id);
            }
            if (text === 'ℹ️ Panduan & Bantuan') {
                return this.sendHelpMessage(msg.chat.id);
            }

            // Check common greetings or test queries
            const cleanCheck = text.toLowerCase().replace(/[\.\,\!\?]/g, '').trim();
            const greetingRegex = /^(tes|test|halo|hai|hi|hello|p|ping|salam|assalamu'?alaikum|assalamualaikum|start|menu|info|help|bantuan)$/i;
            if (greetingRegex.test(cleanCheck)) {
                return this.sendWelcomeMenu(msg.chat.id, firstName);
            }

            // Normal health query
            if (!text.startsWith('/')) {
                console.log(`[Telegram Bot] 📩 Pesan masuk dari @${fromUser.username || firstName}: "${text}"`);
                await this.processUserQuestion(msg.chat.id, fromUser.id, fromUser, text, msg.message_id);
            }
        });
    }

    /**
     * Send Main Welcome Menu
     */
    async sendWelcomeMenu(chatId, firstName, editMessageId = null) {
        const welcomeText = (
            `🏥 *TeleHealth Assistant* — Solusi Kesehatan Digital\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `👋 Halo *${firstName || 'Pengguna'}*! Selamat datang di layanan asisten medis *TeleHealth*.\n\n` +
            `Sistem kami menyediakan edukasi kesehatan berbasis literatur terverifikasi dan konsultasi langsung dengan dokter jaga.\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `👇 *Pilih menu interaktif di bawah atau langsung ketik keluhan Anda:*`
        );

        if (editMessageId) {
            try {
                await this.bot.editMessageText(welcomeText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: MAIN_INLINE_KEYBOARD
                });
                return;
            } catch (e) {
                // Fallback to send new message
            }
        }

        await this.sendMessage(chatId, welcomeText, {
            reply_markup: MAIN_INLINE_KEYBOARD
        });

        // Also ensure bottom reply keyboard is set
        await this.sendMessage(chatId, `💡 _Gunakan tombol di bawah untuk navigasi cepat kapan saja._`, {
            reply_markup: MAIN_REPLY_KEYBOARD
        });
    }

    /**
     * Send Symptom Exploration Menu
     */
    async sendGejalaMenu(chatId, editMessageId = null) {
        const text = (
            `🩺 *Cek Gejala & Topik Kesehatan Populer*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Pilih salah satu keluhan umum di bawah untuk melihat ringkasan klinis tervalidasi:\n`
        );

        if (editMessageId) {
            try {
                await this.bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: GEJALA_INLINE_KEYBOARD
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, text, {
            reply_markup: GEJALA_INLINE_KEYBOARD
        });
    }

    /**
     * Send Medication Menu
     */
    async sendObatMenu(chatId, editMessageId = null) {
        const text = (
            `💊 *Panduan Informasi Obat & Terapi*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Pilih topik obat umum di bawah untuk melihat aturan pakai dan anjuran keselamatan:\n`
        );

        if (editMessageId) {
            try {
                await this.bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: OBAT_INLINE_KEYBOARD
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, text, {
            reply_markup: OBAT_INLINE_KEYBOARD
        });
    }

    /**
     * Send Emergency Guide
     */
    async sendEmergencyGuide(chatId, editMessageId = null) {
        const text = (
            `🚨 *Panduan Kondisi Darurat & Tanda Bahaya (Red Flags)*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Segera kunjungi **IGD Rumah Sakit terdekat** atau hubungi **119** jika mengalami tanda-tanda berikut:\n\n` +
            `🔴 *Sesak napas berat* atau napas berbunyi keras\n` +
            `🔴 *Nyeri dada hebat* menjalar ke lengan kiri/rahang\n` +
            `🔴 *Penurunan kesadaran*, pingsan, atau kejang mendadak\n` +
            `🔴 *Perdarahan hebat* yang tidak kunjung berhenti\n` +
            `🔴 *Kelemahan anggota gerak sebelah* atau bicara pelo (tanda stroke)\n` +
            `🔴 *Demam sangat tinggi (> 39.5°C)* dengan kaku leher\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚠️ _TeleHealth tidak melayani kegawatdaruratan medis darurat langsung._`
        );

        if (editMessageId) {
            try {
                await this.bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: EMERGENCY_INLINE_KEYBOARD
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, text, {
            reply_markup: EMERGENCY_INLINE_KEYBOARD
        });
    }

    /**
     * Send Help Guide
     */
    async sendHelpMessage(chatId, editMessageId = null) {
        const text = (
            `ℹ️ *Bantuan & Panduan Penggunaan TeleHealth*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🤖 *Cara Menggunakan Bot:*\n` +
            `1. **Tanya Bebas:** Cukup ketik pertanyaan seperti _"Bagaimana mengatasi batuk berdahak?"_\n` +
            `2. **Pustaka Tervalidasi:** Bot akan langsung memberikan jawaban bersumber jurnal & dokter.\n` +
            `3. **Eskalasi Dokter:** Bila info belum ada, pertanyaan otomatis masuk ke antrian dokter jaga.\n` +
            `4. **Cek Status:** Tekan tombol *📋 Status Konsultasi* untuk memantau tiket dokter Anda.\n\n` +
            `📌 *Perintah Cepat:*\n` +
            `• \`/start\` atau \`/menu\` - Buka menu utama\n` +
            `• \`/gejala\` - Pilih daftar gejala umum\n` +
            `• \`/dokter\` - Petunjuk konsultasi dokter\n` +
            `• \`/status\` - Cek riwayat konsultasi dokter\n` +
            `• \`/help\` - Buka panduan ini\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚕️ _TeleHealth didesain untuk konsultasi medis yang aman dan akurat._`
        );

        const keyboard = {
            inline_keyboard: [
                [{ text: '🩺 Cek Gejala Sekarang', callback_data: 'menu_gejala' }],
                [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
            ]
        };

        if (editMessageId) {
            try {
                await this.bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, text, { reply_markup: keyboard });
    }

    /**
     * Send Doctor Consultation Prompt
     */
    async sendDoctorPrompt(chatId) {
        const text = (
            `👨‍⚕️ *Konsultasi Dokter Jaga TeleHealth*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan **ketik keluhan fisik atau pertanyaan kesehatan Anda** secara lengkap dan kirimkan ke chat ini.\n\n` +
            `💡 *Tips Pertanyaan yang Baik:*\n` +
            `• Sebutkan keluhan utama (contoh: nyeri ulu hati, demam, ruam)\n` +
            `• Berapa lama keluhan sudah dirasakan\n` +
            `• Riwayat obat atau penyakit yang sedang diderita\n\n` +
            `Sistem kami akan mencocokkan ke database dan otomatis meneruskannya kepada dokter jika diperlukan.`
        );

        await this.sendMessage(chatId, text, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]
                ]
            }
        });
    }

    /**
     * Render User Doctor Questions Status (TaskFlow style ticket list)
     */
    async sendStatusMessage(chatId, userId, editMessageId = null) {
        const userObj = userId ? db.find('users', u => String(u.telegram_id) === String(userId))[0] : null;
        const internalUserId = userObj ? userObj.id : null;

        const questions = db.find('doctor_questions', q =>
            String(q.telegram_chat_id) === String(chatId) ||
            (internalUserId && String(q.user_id) === String(internalUserId))
        );

        if (!questions || questions.length === 0) {
            const emptyText = (
                `📋 *Status Konsultasi Medis Anda*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Belum ada riwayat antrian konsultasi dokter untuk akun Anda.\n\n` +
                `💡 _Ketik pertanyaan medis Anda kapan saja atau tekan menu di bawah untuk berkonsultasi._`
            );
            const emptyKeyboard = {
                inline_keyboard: [
                    [{ text: '👨‍⚕️ Konsultasi Sekarang', callback_data: 'menu_dokter' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                ]
            };

            if (editMessageId) {
                try {
                    await this.bot.editMessageText(emptyText, {
                        chat_id: chatId,
                        message_id: editMessageId,
                        parse_mode: 'Markdown',
                        reply_markup: emptyKeyboard
                    });
                    return;
                } catch (e) {
                    try {
                        await this.bot.editMessageText(emptyText, {
                            chat_id: chatId,
                            message_id: editMessageId,
                            reply_markup: emptyKeyboard
                        });
                        return;
                    } catch (e2) {}
                }
            }
            return this.sendMessage(chatId, emptyText, { reply_markup: emptyKeyboard });
        }

        questions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const recent = questions.slice(0, 5);

        let statusList = recent.map(q => {
            let statusBadge = '';
            if (q.status === 'WAITING') {
                statusBadge = `🟢 *[#DQ-${q.id}]* ⏳ *WAITING (Dalam Antrian)*`;
            } else if (q.status === 'ASSIGNED') {
                statusBadge = `🟡 *[#DQ-${q.id}]* 🩺 *ASSIGNED (Ditangani ${q.assigned_doctor_name || 'Dokter'})*`;
            } else if (q.status === 'ANSWERED') {
                statusBadge = `✅ *[#DQ-${q.id}]* 👨‍⚕️ *ANSWERED (Selesai)*`;
            } else {
                statusBadge = `⚪ *[#DQ-${q.id}]* *${q.status}*`;
            }

            const timeStr = new Date(q.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(q.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            const rawText = q.question_text || '';
            const safeText = rawText.replace(/[*_`\[\]]/g, '');
            const truncatedText = safeText.length > 50 ? safeText.substring(0, 47) + '...' : safeText;

            return (
                `${statusBadge}\n` +
                `📝 "${truncatedText}"\n` +
                `⏰ Waktu: ${dateStr} ${timeStr}\n`
            );
        }).join('\n');

        const fullText = (
            `📋 *Daftar Konsultasi Medis Anda*\n` +
            `Berikut status antrian konsultasi dokter Anda:\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `${statusList}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `_Notifikasi jawaban dokter akan dikirim otomatis ke chat ini begitu selesai._`
        );

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔄 Refresh Status', callback_data: 'menu_status' }],
                [
                    { text: '👨‍⚕️ Konsultasi Baru', callback_data: 'menu_dokter' },
                    { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                ]
            ]
        };

        if (editMessageId) {
            try {
                await this.bot.editMessageText(fullText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                return;
            } catch (e) {
                try {
                    await this.bot.editMessageText(fullText, {
                        chat_id: chatId,
                        message_id: editMessageId,
                        reply_markup: keyboard
                    });
                    return;
                } catch (e2) {}
            }
        }

        await this.sendMessage(chatId, fullText, { reply_markup: keyboard });
    }

    /**
     * Forward an existing question explicitly to doctor queue on user click
     */
    async handleForwardQuestionToDoctor(chatId, userId, from, questionId) {
        const qRecord = db.findById('questions', questionId);
        if (!qRecord) {
            return this.sendMessage(chatId, 'Pertanyaan tidak ditemukan atau sudah kadaluarsa.');
        }

        const doctorQuestion = DoctorService.enqueueQuestion({
            questionId: qRecord.id,
            userId: qRecord.user_id,
            telegramChatId: chatId,
            questionText: qRecord.question_text
        });

        const ticketNotice = ResponseGenerator.formatDoctorFallbackNotice(doctorQuestion.id, qRecord.question_text);

        await this.sendMessage(chatId, ticketNotice, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📋 Cek Status Antrian', callback_data: 'menu_status' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                ]
            }
        });
    }

    /**
     * Process user question through pipeline and reply with interactive buttons
     */
    async processUserQuestion(chatId, userId, from, text, messageId = null) {
        const result = await this.handleIncomingMessage({
            telegramChatId: chatId,
            telegramUserId: userId,
            username: from.username,
            firstName: from.first_name,
            lastName: from.last_name,
            messageId: messageId || Date.now().toString(),
            text
        });

        if (!result) return;

        let replyMarkup = null;

        if (result.status === 'ANSWERED_BY_KB') {
            replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '👨‍⚕️ Butuh Jawaban Dokter?', callback_data: `forward_doctor:${result.questionId}` }
                    ],
                    [
                        { text: '🩺 Cek Gejala Lain', callback_data: 'menu_gejala' },
                        { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            };
        } else if (result.status === 'FORWARDED_TO_DOCTOR') {
            replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '📋 Cek Antrian Saya', callback_data: 'menu_status' },
                        { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            };
        } else if (result.status === 'REJECTED_NON_HEALTH') {
            replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '🤒 Contoh: Penanganan Flu', callback_data: 'query_topic:penanganan flu batuk' },
                        { text: '🤢 Contoh: Sakit Maag/GERD', callback_data: 'query_topic:gejala sakit maag' }
                    ],
                    [
                        { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            };
        }

        await this.sendMessage(chatId, result.responseMessage, {
            reply_markup: replyMarkup
        });
    }

    /**
     * Core Pipeline for processing any user message (Used by Telegram, n8n, and Web Simulator)
     */
    async handleIncomingMessage({ telegramChatId, telegramUserId, username, firstName, lastName, messageId, text }) {
        const cleanText = (text || '').trim();
        const chatId = String(telegramChatId || 'sim-user-01');
        const userLang = LanguageService.detectLanguage(cleanText);

        // 1. Ensure user exists in database
        let user = db.find('users', u => String(u.telegram_id) === String(telegramUserId || chatId))[0];
        if (!user) {
            user = db.insert('users', {
                telegram_id: String(telegramUserId || chatId),
                username: username || 'user_' + chatId,
                first_name: firstName || 'User',
                last_name: lastName || '',
                phone_number: null
            });
        }

        // 2. FIRST: Search Active Knowledge Base (with multi-language synonym bridging)
        const searchResult = await KnowledgeRetriever.search(cleanText, 0.58);

        // 3. IF KNOWLEDGE FOUND IN KB -> Answer directly from Knowledge Base in user's language
        if (searchResult.found && searchResult.knowledge) {
            const formattedResponse = ResponseGenerator.formatKnowledgeResponse(
                searchResult.knowledge,
                searchResult.source,
                searchResult.category,
                userLang
            );

            const qRecord = db.insert('questions', {
                user_id: user.id,
                telegram_chat_id: chatId,
                telegram_message_id: String(messageId || ''),
                question_text: cleanText,
                is_health_topic: true,
                relevance_score: searchResult.score,
                matched_knowledge_id: searchResult.knowledge.id,
                status: 'ANSWERED_BY_KB',
                bot_response: formattedResponse
            });

            return {
                status: 'ANSWERED_BY_KB',
                isHealth: true,
                language: userLang,
                questionId: qRecord.id,
                relevanceScore: searchResult.score,
                matchedKnowledge: searchResult.knowledge,
                source: searchResult.source,
                category: searchResult.category,
                responseMessage: formattedResponse,
                doctorQueued: false
            };
        }

        // 4. SECOND: If NOT found in Knowledge Base, evaluate topic with Guardrail
        const topicValidation = HealthValidator.validateTopic(cleanText);

        if (!topicValidation.isHealth) {
            // Out of scope (non-health) and not in Knowledge Base -> Reject politely in user's language
            const rejectedResponse = HealthValidator.getNonHealthResponse(userLang);
            const qRecord = db.insert('questions', {
                user_id: user.id,
                telegram_chat_id: chatId,
                telegram_message_id: String(messageId || ''),
                question_text: cleanText,
                is_health_topic: false,
                relevance_score: 0.0,
                matched_knowledge_id: null,
                status: 'REJECTED_NON_HEALTH',
                bot_response: rejectedResponse
            });

            return {
                status: 'REJECTED_NON_HEALTH',
                isHealth: false,
                language: userLang,
                questionId: qRecord.id,
                relevanceScore: 0,
                responseMessage: rejectedResponse,
                doctorQueued: false
            };
        }

        // 5. THIRD: If it IS a health topic but NOT in Knowledge Base -> Forward to Doctor Queue
        const qRecord = db.insert('questions', {
            user_id: user.id,
            telegram_chat_id: chatId,
            telegram_message_id: String(messageId || ''),
            question_text: cleanText,
            is_health_topic: true,
            relevance_score: searchResult.score || 0.0,
            matched_knowledge_id: null,
            status: 'FORWARDED_TO_DOCTOR',
            bot_response: null
        });

        // Enqueue to Doctor Questions
        const doctorQuestion = DoctorService.enqueueQuestion({
            questionId: qRecord.id,
            userId: user.id,
            telegramChatId: chatId,
            questionText: cleanText
        });

        const fallbackNotice = ResponseGenerator.formatDoctorFallbackNotice(doctorQuestion.id, cleanText, userLang);
        db.update('questions', qRecord.id, { bot_response: fallbackNotice });

        return {
            status: 'FORWARDED_TO_DOCTOR',
            isHealth: true,
            language: userLang,
            questionId: qRecord.id,
            doctorQuestionId: doctorQuestion.id,
            relevanceScore: searchResult.score || 0.0,
            responseMessage: fallbackNotice,
            doctorQueued: true
        };
    }

    /**
     * Handles webhook update payload from Telegram API
     */
    async processWebhookUpdate(update) {
        if (!update) return;
        if (update.message && update.message.text) {
            const msg = update.message;
            const text = msg.text.trim();
            if (text.startsWith('/start') || text.startsWith('/menu')) {
                await this.sendWelcomeMenu(msg.chat.id, msg.from && msg.from.first_name);
            } else if (text.startsWith('/help')) {
                await this.sendHelpMessage(msg.chat.id);
            } else if (text.startsWith('/gejala')) {
                await this.sendGejalaMenu(msg.chat.id);
            } else if (text.startsWith('/dokter')) {
                await this.sendDoctorPrompt(msg.chat.id);
            } else if (text.startsWith('/status')) {
                await this.sendStatusMessage(msg.chat.id, msg.from && msg.from.id);
            } else {
                await this.processUserQuestion(msg.chat.id, msg.from && msg.from.id, msg.from || {}, text, msg.message_id);
            }
        } else if (update.callback_query) {
            const query = update.callback_query;
            const data = query.data || '';
            const chatId = query.message ? query.message.chat.id : (query.from ? query.from.id : null);
            const userId = query.from ? query.from.id : null;
            const messageId = query.message ? query.message.message_id : null;

            if (this.bot) {
                try {
                    await this.bot.answerCallbackQuery(query.id);
                } catch (e) {}
            }

            if (!chatId) return;
            if (data === 'menu_main') {
                await this.sendWelcomeMenu(chatId, (query.from && query.from.first_name) || 'Pengguna', messageId);
            } else if (data === 'menu_gejala') {
                await this.sendGejalaMenu(chatId, messageId);
            } else if (data === 'menu_obat') {
                await this.sendObatMenu(chatId, messageId);
            } else if (data === 'menu_darurat') {
                await this.sendEmergencyGuide(chatId, messageId);
            } else if (data === 'menu_help') {
                await this.sendHelpMessage(chatId, messageId);
            } else if (data === 'menu_status') {
                await this.sendStatusMessage(chatId, userId, messageId);
            } else if (data === 'menu_dokter') {
                await this.sendDoctorPrompt(chatId);
            } else if (data.startsWith('forward_doctor:')) {
                const qId = data.replace('forward_doctor:', '');
                await this.handleForwardQuestionToDoctor(chatId, userId, query.from, qId);
            } else if (data.startsWith('query_topic:')) {
                const topic = data.replace('query_topic:', '');
                await this.processUserQuestion(chatId, userId, query.from, topic);
            }
        }
    }

    /**
     * Helper to send message to a specific Telegram chat with Markdown and keyboard options
     */
    async sendMessage(chatId, text, options = {}) {
        if (this.bot && this.isEnabled) {
            const sendOptions = {
                parse_mode: 'Markdown',
                ...options
            };

            try {
                await this.bot.sendMessage(chatId, text, sendOptions);
                return true;
            } catch (err) {
                try {
                    delete sendOptions.parse_mode;
                    await this.bot.sendMessage(chatId, text, sendOptions);
                    return true;
                } catch (plainErr) {
                    console.error(`[Telegram Bot] Error sending message to ${chatId}:`, plainErr.message);
                    return false;
                }
            }
        }
        return false;
    }
}

module.exports = new TelegramBotService();

