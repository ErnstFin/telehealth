/**
 * Telegram Bot & Chatbot Pipeline Service
 * Manages live Telegram bot connection with rich UI/UX (Inline & Reply Keyboards,
 * Status Tickets, Interactive Callbacks) with complete Multilingual Session State.
 */

require('dotenv').config();
const TelegramBotApi = require('node-telegram-bot-api');
const db = require('../db');
const HealthValidator = require('./healthValidator');
const KnowledgeRetriever = require('./knowledgeRetriever');
const ResponseGenerator = require('./responseGenerator');
const DoctorService = require('./doctorService');
const LanguageService = require('./languageService');

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

    /**
     * Look up user's preferred language from database
     */
    getUserLang(telegramUserId, chatId) {
        const user = db.find('users', u => String(u.telegram_id) === String(telegramUserId || chatId))[0];
        return (user && user.preferred_lang) || 'id';
    }

    /**
     * Persist user's preferred language
     */
    setUserLang(telegramUserId, chatId, lang) {
        const user = db.find('users', u => String(u.telegram_id) === String(telegramUserId || chatId))[0];
        if (user) {
            db.update('users', user.id, { preferred_lang: lang });
        } else {
            db.insert('users', {
                telegram_id: String(telegramUserId || chatId),
                username: 'user_' + chatId,
                first_name: 'User',
                last_name: '',
                phone_number: null,
                preferred_lang: lang
            });
        }
    }

    registerHandlers() {
        if (!this.bot) return;

        this.bot.on('polling_error', (err) => {
            const msg = err.message || '';
            if (msg.includes('409') || msg.includes('Conflict')) {
                console.warn('[Telegram Polling Warning] 409 Conflict: Sesi polling ganda terdeteksi. Pastikan hanya 1 server instance yang aktif.');
            } else {
                console.warn('[Telegram Polling Warning]:', msg);
            }
        });

        // 1. Interactive Callback Query Handler (Button Clicks)
        this.bot.on('callback_query', async (query) => {
            const data = query.data || '';
            const chatId = query.message ? query.message.chat.id : (query.from ? query.from.id : null);
            const userId = query.from ? query.from.id : null;
            const messageId = query.message ? query.message.message_id : null;
            const userLang = this.getUserLang(userId, chatId);

            // Acknowledge callback query with localized quick feedback
            try {
                let ackText = userLang === 'en' ? 'Processing...' : 'Memproses...';
                if (data === 'menu_status') ackText = userLang === 'en' ? '📋 Opening queue status...' : '📋 Membuka status antrian...';
                else if (data === 'menu_main') ackText = userLang === 'en' ? '🏠 Opening Main Menu...' : '🏠 Membuka Menu Utama...';
                else if (data === 'menu_gejala') ackText = userLang === 'en' ? '🩺 Opening symptoms list...' : '🩺 Membuka daftar gejala...';
                else if (data === 'menu_obat') ackText = userLang === 'en' ? '💊 Opening medications guide...' : '💊 Membuka panduan obat...';
                else if (data === 'menu_darurat') ackText = userLang === 'en' ? '🚨 Opening emergency guide...' : '🚨 Membuka panduan darurat...';
                else if (data === 'menu_help') ackText = userLang === 'en' ? 'ℹ️ Opening user guide...' : 'ℹ️ Membuka panduan...';
                else if (data === 'menu_dokter') ackText = userLang === 'en' ? '👨‍⚕️ Opening doctor consultation...' : '👨‍⚕️ Membuka form dokter...';
                else if (data.startsWith('query_topic:')) ackText = userLang === 'en' ? '🔍 Searching medical archive...' : '🔍 Mencari info medis...';
                else if (data.startsWith('forward_doctor:')) ackText = userLang === 'en' ? '👨‍⚕️ Forwarding to doctor queue...' : '👨‍⚕️ Meneruskan ke dokter...';
                await this.bot.answerCallbackQuery(query.id, { text: ackText, show_alert: false });
            } catch (e) {}

            if (!chatId) return;
            console.log(`[Telegram Bot] 🔘 Button Clicked: "${data}" by @${(query.from && query.from.username) || (query.from && query.from.first_name) || chatId} [Lang: ${userLang}]`);

            try {
                if (data === 'menu_main') {
                    await this.sendWelcomeMenu(chatId, (query.from && query.from.first_name) || 'User', messageId, userLang);
                } else if (data === 'menu_gejala') {
                    await this.sendGejalaMenu(chatId, messageId, userLang);
                } else if (data === 'menu_obat') {
                    await this.sendObatMenu(chatId, messageId, userLang);
                } else if (data === 'menu_darurat') {
                    await this.sendEmergencyGuide(chatId, messageId, userLang);
                } else if (data === 'menu_help') {
                    await this.sendHelpMessage(chatId, messageId, userLang);
                } else if (data === 'menu_status') {
                    await this.sendStatusMessage(chatId, userId, messageId, userLang);
                } else if (data === 'menu_dokter') {
                    await this.sendDoctorPrompt(chatId, userLang);
                } else if (data.startsWith('forward_doctor:')) {
                    const questionId = data.replace('forward_doctor:', '');
                    await this.handleForwardQuestionToDoctor(chatId, userId, query.from, questionId, userLang);
                } else if (data.startsWith('query_topic:')) {
                    const topicQuery = data.replace('query_topic:', '');
                    await this.processUserQuestion(chatId, userId, query.from, topicQuery, null, userLang);
                }
            } catch (cbErr) {
                console.error('[Telegram Callback Error]:', cbErr.message);
                const errorMsg = userLang === 'en'
                    ? '⚠️ Error processing selection. Please type your medical question directly.'
                    : '⚠️ Terjadi kendala saat memproses pilihan Anda. Silakan ketik keluhan Anda secara langsung.';
                await this.sendMessage(chatId, errorMsg);
            }
        });

        // 2. Single Unified Text Message & Command Listener (No duplicates)
        this.bot.on('message', async (msg) => {
            if (!msg.text) return;

            const text = msg.text.trim();
            const fromUser = msg.from || {};
            const firstName = fromUser.first_name || 'User';

            // Get existing user language from session
            const currentLang = this.getUserLang(fromUser.id, msg.chat.id);
            const detectedLang = LanguageService.detectLanguage(text, currentLang);
            this.setUserLang(fromUser.id, msg.chat.id, detectedLang);

            // A. Slash Commands
            if (/^\/(start|menu)/i.test(text)) {
                return this.sendWelcomeMenu(msg.chat.id, firstName, null, detectedLang);
            }
            if (/^\/help/i.test(text)) {
                return this.sendHelpMessage(msg.chat.id, null, detectedLang);
            }
            if (/^\/gejala/i.test(text)) {
                return this.sendGejalaMenu(msg.chat.id, null, detectedLang);
            }
            if (/^\/dokter/i.test(text)) {
                return this.sendDoctorPrompt(msg.chat.id, detectedLang);
            }
            if (/^\/status/i.test(text)) {
                return this.sendStatusMessage(msg.chat.id, fromUser.id, null, detectedLang);
            }

            // B. Reply Keyboard Button Clicks
            if (/^(🏠\s*(Menu Utama|Main Menu))$/i.test(text)) {
                return this.sendWelcomeMenu(msg.chat.id, firstName, null, detectedLang);
            }
            if (/^(🩺\s*(Cek Gejala & Topik|Symptoms & Topics|Check Symptoms & Topics|Priksa Gejala))$/i.test(text)) {
                return this.sendGejalaMenu(msg.chat.id, null, detectedLang);
            }
            if (/^(👨‍⚕️\s*(Tanya Dokter|Ask Doctor|Tanglet Dokter))$/i.test(text)) {
                return this.sendDoctorPrompt(msg.chat.id, detectedLang);
            }
            if (/^(📋\s*(Status Konsultasi|Consultation Status))$/i.test(text)) {
                return this.sendStatusMessage(msg.chat.id, fromUser.id, null, detectedLang);
            }
            if (/^(ℹ️\s*(Panduan & Bantuan|Help & User Guide|Help & Guide|Bantuan))$/i.test(text)) {
                return this.sendHelpMessage(msg.chat.id, null, detectedLang);
            }

            // C. Common Greetings
            const cleanCheck = text.toLowerCase().replace(/[\.\,\!\?\#]/g, '').trim();
            const greetingRegex = /^(tes|test|halo|hai|hi|hello|hey|good\s+(morning|afternoon|evening|night)|howdy|salam|assalamu'?alaikum|assalamualaikum|sugeng\s+(enjang|siang|sonten|dalu)|sampurasun|wilujeng|start|menu|info|help|bantuan|p|ping)$/i;
            if (greetingRegex.test(cleanCheck)) {
                return this.sendWelcomeMenu(msg.chat.id, firstName, null, detectedLang);
            }

            // D. Health Question or Clinical Inquiry
            if (!text.startsWith('/')) {
                console.log(`[Telegram Bot] 📩 Message received from @${fromUser.username || firstName} [Lang: ${detectedLang}]: "${text}"`);
                await this.processUserQuestion(msg.chat.id, fromUser.id, fromUser, text, msg.message_id, detectedLang);
            }
        });
    }

    /**
     * Send Main Welcome Menu (Multilingual)
     */
    async sendWelcomeMenu(chatId, firstName, editMessageId = null, lang = null) {
        const userLang = lang || this.getUserLang(chatId, chatId);
        const ui = LanguageService.getBotUIDictionary(userLang, firstName);

        if (editMessageId) {
            try {
                await this.bot.editMessageText(ui.welcomeText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: ui.mainInlineKeyboard
                });
                return;
            } catch (e) {
                // Fallback to send new message
            }
        }

        await this.sendMessage(chatId, ui.welcomeText, {
            reply_markup: ui.mainInlineKeyboard
        });

        // Also ensure bottom reply keyboard is localized
        await this.sendMessage(chatId, ui.welcomeTip, {
            reply_markup: ui.mainReplyKeyboard
        });
    }

    /**
     * Send Symptom Exploration Menu (Multilingual)
     */
    async sendGejalaMenu(chatId, editMessageId = null, lang = null) {
        const userLang = lang || this.getUserLang(chatId, chatId);
        const ui = LanguageService.getBotUIDictionary(userLang);

        if (editMessageId) {
            try {
                await this.bot.editMessageText(ui.gejalaText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: ui.gejalaInlineKeyboard
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, ui.gejalaText, {
            reply_markup: ui.gejalaInlineKeyboard
        });
    }

    /**
     * Send Medication Menu (Multilingual)
     */
    async sendObatMenu(chatId, editMessageId = null, lang = null) {
        const userLang = lang || this.getUserLang(chatId, chatId);
        const ui = LanguageService.getBotUIDictionary(userLang);

        if (editMessageId) {
            try {
                await this.bot.editMessageText(ui.obatText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: ui.obatInlineKeyboard
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, ui.obatText, {
            reply_markup: ui.obatInlineKeyboard
        });
    }

    /**
     * Send Emergency Guide (Multilingual)
     */
    async sendEmergencyGuide(chatId, editMessageId = null, lang = null) {
        const userLang = lang || this.getUserLang(chatId, chatId);
        const ui = LanguageService.getBotUIDictionary(userLang);

        if (editMessageId) {
            try {
                await this.bot.editMessageText(ui.daruratText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: ui.daruratInlineKeyboard
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, ui.daruratText, {
            reply_markup: ui.daruratInlineKeyboard
        });
    }

    /**
     * Send Help Guide (Multilingual)
     */
    async sendHelpMessage(chatId, editMessageId = null, lang = null) {
        const userLang = lang || this.getUserLang(chatId, chatId);
        const ui = LanguageService.getBotUIDictionary(userLang);

        if (editMessageId) {
            try {
                await this.bot.editMessageText(ui.helpText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: ui.helpInlineKeyboard
                });
                return;
            } catch (e) {}
        }

        await this.sendMessage(chatId, ui.helpText, { reply_markup: ui.helpInlineKeyboard });
    }

    /**
     * Send Doctor Consultation Prompt (Multilingual)
     */
    async sendDoctorPrompt(chatId, lang = null) {
        const userLang = lang || this.getUserLang(chatId, chatId);
        const ui = LanguageService.getBotUIDictionary(userLang);

        await this.sendMessage(chatId, ui.doctorPromptText, {
            reply_markup: ui.doctorPromptInlineKeyboard
        });
    }

    /**
     * Render User Doctor Questions Status (Multilingual TaskFlow ticket list)
     */
    async sendStatusMessage(chatId, userId, editMessageId = null, lang = null) {
        const userLang = lang || this.getUserLang(userId, chatId);
        const ui = LanguageService.getBotUIDictionary(userLang);

        const userObj = userId ? db.find('users', u => String(u.telegram_id) === String(userId))[0] : null;
        const internalUserId = userObj ? userObj.id : null;

        const questions = db.find('doctor_questions', q =>
            String(q.telegram_chat_id) === String(chatId) ||
            (internalUserId && String(q.user_id) === String(internalUserId))
        );

        if (!questions || questions.length === 0) {
            if (editMessageId) {
                try {
                    await this.bot.editMessageText(ui.statusEmptyText, {
                        chat_id: chatId,
                        message_id: editMessageId,
                        parse_mode: 'Markdown',
                        reply_markup: ui.statusEmptyInlineKeyboard
                    });
                    return;
                } catch (e) {
                    try {
                        await this.bot.editMessageText(ui.statusEmptyText, {
                            chat_id: chatId,
                            message_id: editMessageId,
                            reply_markup: ui.statusEmptyInlineKeyboard
                        });
                        return;
                    } catch (e2) {}
                }
            }
            return this.sendMessage(chatId, ui.statusEmptyText, { reply_markup: ui.statusEmptyInlineKeyboard });
        }

        questions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const recent = questions.slice(0, 5);

        let statusList = recent.map(q => {
            let statusBadge = '';
            if (userLang === 'en') {
                if (q.status === 'WAITING') {
                    statusBadge = `🟢 *[#DQ-${q.id}]* ⏳ *WAITING (In Doctor Queue)*`;
                } else if (q.status === 'ASSIGNED') {
                    statusBadge = `🟡 *[#DQ-${q.id}]* 🩺 *ASSIGNED (With ${q.assigned_doctor_name || 'On-Call Doctor'})*`;
                } else if (q.status === 'ANSWERED') {
                    statusBadge = `✅ *[#DQ-${q.id}]* 👨‍⚕️ *ANSWERED (Completed)*`;
                } else {
                    statusBadge = `⚪ *[#DQ-${q.id}]* *${q.status}*`;
                }
            } else if (userLang === 'jv') {
                if (q.status === 'WAITING') {
                    statusBadge = `🟢 *[#DQ-${q.id}]* ⏳ *WAITING (Ngentosi Dokter)*`;
                } else if (q.status === 'ASSIGNED') {
                    statusBadge = `🟡 *[#DQ-${q.id}]* 🩺 *ASSIGNED (Dipunpriksa ${q.assigned_doctor_name || 'Dokter'})*`;
                } else if (q.status === 'ANSWERED') {
                    statusBadge = `✅ *[#DQ-${q.id}]* 👨‍⚕️ *ANSWERED (Sampun Rampung)*`;
                } else {
                    statusBadge = `⚪ *[#DQ-${q.id}]* *${q.status}*`;
                }
            } else {
                if (q.status === 'WAITING') {
                    statusBadge = `🟢 *[#DQ-${q.id}]* ⏳ *WAITING (Dalam Antrian)*`;
                } else if (q.status === 'ASSIGNED') {
                    statusBadge = `🟡 *[#DQ-${q.id}]* 🩺 *ASSIGNED (Ditangani ${q.assigned_doctor_name || 'Dokter'})*`;
                } else if (q.status === 'ANSWERED') {
                    statusBadge = `✅ *[#DQ-${q.id}]* 👨‍⚕️ *ANSWERED (Selesai)*`;
                } else {
                    statusBadge = `⚪ *[#DQ-${q.id}]* *${q.status}*`;
                }
            }

            const locale = userLang === 'en' ? 'en-US' : 'id-ID';
            const timeStr = new Date(q.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(q.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
            const rawText = q.question_text || '';
            const safeText = rawText.replace(/[*_`\[\]]/g, '');
            const truncatedText = safeText.length > 50 ? safeText.substring(0, 47) + '...' : safeText;
            const timeLabel = userLang === 'en' ? 'Time' : 'Waktu';

            return (
                `${statusBadge}\n` +
                `📝 "${truncatedText}"\n` +
                `⏰ ${timeLabel}: ${dateStr} ${timeStr}\n`
            );
        }).join('\n');

        const fullText = (
            `${ui.statusListTitle}` +
            `${statusList}` +
            `${ui.statusListFooter}`
        );

        if (editMessageId) {
            try {
                await this.bot.editMessageText(fullText, {
                    chat_id: chatId,
                    message_id: editMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: ui.statusInlineKeyboard
                });
                return;
            } catch (e) {
                try {
                    await this.bot.editMessageText(fullText, {
                        chat_id: chatId,
                        message_id: editMessageId,
                        reply_markup: ui.statusInlineKeyboard
                    });
                    return;
                } catch (e2) {}
            }
        }

        await this.sendMessage(chatId, fullText, { reply_markup: ui.statusInlineKeyboard });
    }

    /**
     * Forward an existing question explicitly to doctor queue on user click (Multilingual)
     */
    async handleForwardQuestionToDoctor(chatId, userId, from, questionId, lang = null) {
        const userLang = lang || this.getUserLang(userId, chatId);
        const qRecord = db.findById('questions', questionId);
        if (!qRecord) {
            const notFoundMsg = userLang === 'en' ? 'Inquiry not found or expired.' : 'Pertanyaan tidak ditemukan atau sudah kadaluarsa.';
            return this.sendMessage(chatId, notFoundMsg);
        }

        const doctorQuestion = DoctorService.enqueueQuestion({
            questionId: qRecord.id,
            userId: qRecord.user_id,
            telegramChatId: chatId,
            questionText: qRecord.question_text
        });

        const ticketNotice = ResponseGenerator.formatDoctorFallbackNotice(doctorQuestion.id, qRecord.question_text, userLang);
        const ui = LanguageService.getBotUIDictionary(userLang);

        await this.sendMessage(chatId, ticketNotice, {
            reply_markup: ui.actionButtonsDoctor
        });
    }

    /**
     * Process user question through pipeline and reply with interactive buttons (Multilingual)
     */
    async processUserQuestion(chatId, userId, from, text, messageId = null, forcedLang = null) {
        const result = await this.handleIncomingMessage({
            telegramChatId: chatId,
            telegramUserId: userId,
            username: from.username,
            firstName: from.first_name,
            lastName: from.last_name,
            messageId: messageId || Date.now().toString(),
            text,
            forcedLang
        });

        if (!result) return;

        const lang = result.language || forcedLang || this.getUserLang(userId, chatId);
        const ui = LanguageService.getBotUIDictionary(lang);
        let replyMarkup = null;

        if (result.status === 'ANSWERED_BY_KB') {
            replyMarkup = ui.actionButtonsKB(result.questionId);
        } else if (result.status === 'FORWARDED_TO_DOCTOR') {
            replyMarkup = ui.actionButtonsDoctor;
        } else if (result.status === 'REJECTED_NON_HEALTH') {
            replyMarkup = ui.actionButtonsNonHealth;
        }

        await this.sendMessage(chatId, result.responseMessage, {
            reply_markup: replyMarkup
        });
    }

    /**
     * Core Pipeline for processing any user message (Used by Telegram, n8n, and Web Simulator)
     */
    async handleIncomingMessage({ telegramChatId, telegramUserId, username, firstName, lastName, messageId, text, forcedLang = null }) {
        const cleanText = (text || '').trim();
        const chatId = String(telegramChatId || 'sim-user-01');
        const currentLang = forcedLang || this.getUserLang(telegramUserId, chatId);
        const userLang = forcedLang || LanguageService.detectLanguage(cleanText, currentLang);

        // 1. Ensure user exists in database and remember preferred language
        let user = db.find('users', u => String(u.telegram_id) === String(telegramUserId || chatId))[0];
        if (!user) {
            user = db.insert('users', {
                telegram_id: String(telegramUserId || chatId),
                username: username || 'user_' + chatId,
                first_name: firstName || 'User',
                last_name: lastName || '',
                phone_number: null,
                preferred_lang: userLang
            });
        } else {
            db.update('users', user.id, { preferred_lang: userLang });
        }

        // 2. FIRST: Search Active Knowledge Base (with multi-language synonym bridging)
        const searchResult = await KnowledgeRetriever.search(cleanText, 0.58, userLang);

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
            const currentLang = this.getUserLang(msg.from && msg.from.id, msg.chat.id);
            const userLang = LanguageService.detectLanguage(text, currentLang);
            this.setUserLang(msg.from && msg.from.id, msg.chat.id, userLang);

            if (text.startsWith('/start') || text.startsWith('/menu')) {
                await this.sendWelcomeMenu(msg.chat.id, msg.from && msg.from.first_name, null, userLang);
            } else if (text.startsWith('/help')) {
                await this.sendHelpMessage(msg.chat.id, null, userLang);
            } else if (text.startsWith('/gejala')) {
                await this.sendGejalaMenu(msg.chat.id, null, userLang);
            } else if (text.startsWith('/dokter')) {
                await this.sendDoctorPrompt(msg.chat.id, userLang);
            } else if (text.startsWith('/status')) {
                await this.sendStatusMessage(msg.chat.id, msg.from && msg.from.id, null, userLang);
            } else {
                await this.processUserQuestion(msg.chat.id, msg.from && msg.from.id, msg.from || {}, text, msg.message_id, userLang);
            }
        } else if (update.callback_query) {
            const query = update.callback_query;
            const data = query.data || '';
            const chatId = query.message ? query.message.chat.id : (query.from ? query.from.id : null);
            const userId = query.from ? query.from.id : null;
            const messageId = query.message ? query.message.message_id : null;
            const userLang = this.getUserLang(userId, chatId);

            if (this.bot) {
                try {
                    await this.bot.answerCallbackQuery(query.id);
                } catch (e) {}
            }

            if (!chatId) return;
            if (data === 'menu_main') {
                await this.sendWelcomeMenu(chatId, (query.from && query.from.first_name) || 'User', messageId, userLang);
            } else if (data === 'menu_gejala') {
                await this.sendGejalaMenu(chatId, messageId, userLang);
            } else if (data === 'menu_obat') {
                await this.sendObatMenu(chatId, messageId, userLang);
            } else if (data === 'menu_darurat') {
                await this.sendEmergencyGuide(chatId, messageId, userLang);
            } else if (data === 'menu_help') {
                await this.sendHelpMessage(chatId, messageId, userLang);
            } else if (data === 'menu_status') {
                await this.sendStatusMessage(chatId, userId, messageId, userLang);
            } else if (data === 'menu_dokter') {
                await this.sendDoctorPrompt(chatId, userLang);
            } else if (data.startsWith('forward_doctor:')) {
                const qId = data.replace('forward_doctor:', '');
                await this.handleForwardQuestionToDoctor(chatId, userId, query.from, qId, userLang);
            } else if (data.startsWith('query_topic:')) {
                const topic = data.replace('query_topic:', '');
                await this.processUserQuestion(chatId, userId, query.from, topic, null, userLang);
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
