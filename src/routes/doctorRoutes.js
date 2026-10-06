/**
 * Doctor Questions & Medical Response API Routes
 */

const express = require('express');
const router = express.Router();
const DoctorService = require('../services/doctorService');
const db = require('../db');

// List Doctor Questions
router.get('/questions', (req, res) => {
    try {
        const { status } = req.query;
        const queue = DoctorService.getQueue(status);
        res.json({ success: true, data: queue });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Doctor Question with history
router.get('/questions/:id', (req, res) => {
    try {
        const item = db.findById('doctor_questions', req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Doctor question not found' });
        }

        const responses = db.find('doctor_responses', r => String(r.doctor_question_id) === String(item.id));
        const user = item.user_id ? db.findById('users', item.user_id) : null;

        res.json({
            success: true,
            data: {
                ...item,
                user,
                responses
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Doctor Submits Answer
router.post('/questions/:id/answer', async (req, res) => {
    try {
        const { doctor_id, doctor_name, response_text, medical_advice, category_id } = req.body;

        if (!response_text || response_text.trim().length === 0) {
            return res.status(400).json({ error: 'Response text from doctor is required.' });
        }

        const result = await DoctorService.submitDoctorResponse(req.params.id, {
            doctorId: doctor_id || 'DOC-001',
            doctorName: doctor_name || 'Dr. Siti Rahmawati, Sp.PD',
            responseText: response_text.trim(),
            medicalAdvice: medical_advice ? medical_advice.trim() : null,
            categoryId: category_id ? Number(category_id) : 1
        });

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Doctor Answer API Error]', err);
        res.status(400).json({ error: err.message });
    }
});

// Assign Doctor
router.post('/questions/:id/assign', (req, res) => {
    try {
        const { doctor_id, doctor_name } = req.body;
        const updated = DoctorService.assignDoctor(
            req.params.id,
            doctor_id || 'DOC-001',
            doctor_name || 'Dr. Siti Rahmawati, Sp.PD'
        );
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Archive Doctor Question
router.patch('/questions/:id/archive', (req, res) => {
    try {
        const updated = db.update('doctor_questions', req.params.id, {
            status: 'ARCHIVED'
        });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
