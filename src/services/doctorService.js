/**
 * Doctor Service
 * Manages the Doctor Question Queue, Doctor Responses, and automatic Candidate creation.
 */

const db = require('../db');
const ResponseGenerator = require('./responseGenerator');

class DoctorService {
    /**
     * Enqueues an unanswerable question to the Doctor Queue
     * @param {object} params { questionId, userId, telegramChatId, questionText }
     */
    static enqueueQuestion({ questionId, userId, telegramChatId, questionText }) {
        const doctorQuestion = db.insert('doctor_questions', {
            question_id: questionId || null,
            user_id: userId || null,
            telegram_chat_id: String(telegramChatId || ''),
            question_text: questionText,
            status: 'WAITING',
            assigned_doctor_id: null,
            assigned_doctor_name: null,
            assigned_at: null
        });

        console.log(`[Doctor Queue] New question #${doctorQuestion.id} queued with status: WAITING`);
        return doctorQuestion;
    }

    /**
     * Doctor provides an answer to a queued question
     * @param {number|string} doctorQuestionId
     * @param {object} answerData { doctorId, doctorName, responseText, medicalAdvice, categoryId }
     */
    static async submitDoctorResponse(doctorQuestionId, { doctorId, doctorName, responseText, medicalAdvice, categoryId }) {
        const doctorQuestion = db.findById('doctor_questions', doctorQuestionId);
        if (!doctorQuestion) {
            throw new Error(`Doctor question with ID #${doctorQuestionId} not found.`);
        }

        const now = new Date().toISOString();
        const docName = doctorName || 'Dr. Siti Rahmawati, Sp.PD';
        const docId = doctorId || 'DOC-001';

        // 1. Insert into doctor_responses
        const doctorResponse = db.insert('doctor_responses', {
            doctor_question_id: doctorQuestion.id,
            doctor_id: docId,
            doctor_name: docName,
            response_text: responseText,
            medical_advice: medicalAdvice || null,
            notes: 'Submitted via TeleHealth Medical Interface'
        });

        // 2. Update status of doctor_questions
        db.update('doctor_questions', doctorQuestion.id, {
            status: 'ANSWERED',
            assigned_doctor_id: docId,
            assigned_doctor_name: docName,
            assigned_at: doctorQuestion.assigned_at || now,
            updated_at: now
        });

        // 3. Update original question status if linked
        if (doctorQuestion.question_id) {
            db.update('questions', doctorQuestion.question_id, {
                status: 'ANSWERED_BY_DOCTOR',
                bot_response: ResponseGenerator.formatDoctorAnswerResponse(docName, responseText, medicalAdvice)
            });
        }

        // 4. AUTOMATIC KNOWLEDGE ACQUISITION:
        // Automatically create a Knowledge Candidate in PENDING status
        const candidateTitle = doctorQuestion.question_text.length > 60
            ? doctorQuestion.question_text.substring(0, 57) + '...'
            : doctorQuestion.question_text;

        const candidate = db.insert('knowledge_candidates', {
            title: `Respon Dokter: ${candidateTitle}`,
            type: 'DOCTOR_RESPONSE',
            question_text: doctorQuestion.question_text,
            proposed_answer: responseText,
            important_points: JSON.stringify([
                `Jawaban klinis dari ${docName}`,
                medicalAdvice || 'Patuhi anjuran medis dan amati perkembangan gejala'
            ]),
            when_to_see_doctor: 'Kunjungi fasilitas medis segera bila kondisi memburuk atau timbul gejala kegawatdaruratan.',
            doctor_name: docName,
            doctor_id: docId,
            category_id: categoryId || 1,
            source_id: 6, // Default to Doctor source
            status: 'PENDING',
            rejection_reason: null,
            submitted_at: now,
            processed_at: null,
            processed_by: null
        });

        console.log(`[Knowledge Candidate] Auto-created Candidate #${candidate.id} (PENDING) from Doctor Question #${doctorQuestion.id}`);

        // 5. Send message back to Telegram user (if telegramBot is active)
        const formattedUserMessage = ResponseGenerator.formatDoctorAnswerResponse(
            docName,
            responseText,
            medicalAdvice,
            doctorQuestion.question_text
        );
        
        let telegramSent = false;
        try {
            const telegramBot = require('./telegramBot');
            if (telegramBot && telegramBot.sendMessage && doctorQuestion.telegram_chat_id) {
                telegramSent = await telegramBot.sendMessage(doctorQuestion.telegram_chat_id, formattedUserMessage, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💬 Konsultasi Keluhan Baru', callback_data: 'menu_dokter' }],
                            [{ text: '📋 Status Konsultasi', callback_data: 'menu_status' }, { text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                        ]
                    }
                });
            }
        } catch (e) {
            console.warn('[Doctor Service] Could not send live Telegram message:', e.message);
        }

        return {
            success: true,
            doctorQuestion: db.findById('doctor_questions', doctorQuestion.id),
            doctorResponse,
            knowledgeCandidate: candidate,
            userMessage: formattedUserMessage,
            telegramSent
        };
    }

    /**
     * Assigns doctor to a question
     */
    static assignDoctor(doctorQuestionId, doctorId, doctorName) {
        return db.update('doctor_questions', doctorQuestionId, {
            status: 'ASSIGNED',
            assigned_doctor_id: doctorId,
            assigned_doctor_name: doctorName,
            assigned_at: new Date().toISOString()
        });
    }

    /**
     * Lists doctor questions with optional filter
     */
    static getQueue(statusFilter = null) {
        let questions = db.find('doctor_questions');
        if (statusFilter && statusFilter !== 'ALL') {
            questions = questions.filter(q => q.status === statusFilter);
        }
        // Attach response if answered
        return questions.map(q => {
            const responses = db.find('doctor_responses', r => String(r.doctor_question_id) === String(q.id));
            return {
                ...q,
                response: responses.length > 0 ? responses[0] : null
            };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

module.exports = DoctorService;
