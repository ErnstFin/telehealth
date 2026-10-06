/**
 * Dashboard Analytics & Stats API Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/stats', (req, res) => {
    try {
        const knowledgeItems = db.find('knowledge');
        const candidates = db.find('knowledge_candidates');
        const doctorQuestions = db.find('doctor_questions');
        const questions = db.find('questions');
        const logs = db.find('validation_logs');
        const categories = db.find('categories');

        // Key Metric Counts
        const totalKnowledgeValid = knowledgeItems.filter(k => k.status === 'ACTIVE').length;
        const totalKnowledgeInactive = knowledgeItems.filter(k => k.status === 'INACTIVE').length;
        const pendingValidation = candidates.filter(c => c.status === 'PENDING').length;
        const rejectedKnowledge = candidates.filter(c => c.status === 'REJECTED').length;

        const doctorWaiting = doctorQuestions.filter(d => d.status === 'WAITING').length;
        const doctorAssigned = doctorQuestions.filter(d => d.status === 'ASSIGNED').length;
        const doctorAnswered = doctorQuestions.filter(d => d.status === 'ANSWERED').length;

        const totalQuestions = questions.length;
        const answeredByKb = questions.filter(q => q.status === 'ANSWERED_BY_KB').length;
        const answeredByDoctor = questions.filter(q => q.status === 'ANSWERED_BY_DOCTOR').length;
        const rejectedNonHealth = questions.filter(q => q.status === 'REJECTED_NON_HEALTH').length;
        const forwardedToDoctor = questions.filter(q => q.status === 'FORWARDED_TO_DOCTOR').length;

        // Breakdown by category
        const categoryStats = categories.map(cat => {
            const count = knowledgeItems.filter(k => k.category_id === cat.id && k.status === 'ACTIVE').length;
            return {
                id: cat.id,
                name: cat.name,
                count
            };
        });

        // Recent Activity Feed
        const recentLogs = [...logs]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8);

        // Recent Inquiries
        const recentQuestions = [...questions]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 6);

        res.json({
            success: true,
            data: {
                counts: {
                    total_knowledge_valid: totalKnowledgeValid,
                    total_knowledge_inactive: totalKnowledgeInactive,
                    pending_validation: pendingValidation,
                    rejected_knowledge: rejectedKnowledge,
                    doctor_waiting: doctorWaiting,
                    doctor_assigned: doctorAssigned,
                    doctor_answered: doctorAnswered,
                    total_questions: totalQuestions,
                    answered_by_kb: answeredByKb,
                    answered_by_doctor: answeredByDoctor,
                    rejected_non_health: rejectedNonHealth,
                    forwarded_to_doctor: forwardedToDoctor
                },
                category_stats: categoryStats,
                recent_logs: recentLogs,
                recent_questions: recentQuestions
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
