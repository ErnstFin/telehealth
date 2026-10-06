/**
 * Knowledge Candidates API Routes
 * Handles Candidate Ingestion, Review, Approval, and Rejection.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const ValidationService = require('../services/validationService');
const HealthValidator = require('../services/healthValidator');

// List Candidates
router.get('/', (req, res) => {
    try {
        const { status, type } = req.query;
        let candidates = db.find('knowledge_candidates');

        if (status && status !== 'ALL') {
            candidates = candidates.filter(c => c.status === status);
        }

        if (type && type !== 'ALL') {
            candidates = candidates.filter(c => c.type === type);
        }

        // Hydrate with category and source
        const enriched = candidates.map(c => {
            const cat = c.category_id ? db.findById('categories', c.category_id) : null;
            const src = c.source_id ? db.findById('sources', c.source_id) : null;
            return {
                ...c,
                category_name: cat ? cat.name : 'Umum',
                source_name: src ? src.name : (c.doctor_name || 'Sumber Luar')
            };
        }).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

        res.json({ success: true, data: enriched });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Candidate
router.get('/:id', (req, res) => {
    try {
        const candidate = db.findById('knowledge_candidates', req.params.id);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        const cat = candidate.category_id ? db.findById('categories', candidate.category_id) : null;
        const src = candidate.source_id ? db.findById('sources', candidate.source_id) : null;

        res.json({
            success: true,
            data: {
                ...candidate,
                category: cat,
                source: src
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ingest Medical Journal / Literature as Candidate
router.post('/journal', (req, res) => {
    try {
        const { title, proposed_answer, important_points, when_to_see_doctor, category_id, source_name, publisher, year, author, url } = req.body;

        if (!title || !proposed_answer) {
            return res.status(400).json({ error: 'Title and proposed answer are required.' });
        }

        // Medical Domain Check for Ingestion
        const validation = HealthValidator.validateMedicalContent(req.body);
        if (!validation.isHealth) {
            return res.status(400).json({ error: validation.rejectReason });
        }

        const candidate = ValidationService.submitJournalCandidate({
            title,
            type: 'JOURNAL',
            target_question: req.body.target_question || title,
            proposed_answer,
            important_points,
            when_to_see_doctor,
            category_id: category_id ? Number(category_id) : 1,
            source_name: source_name || publisher || title,
            source_type: 'JOURNAL',
            publisher,
            year: year ? Number(year) : new Date().getFullYear(),
            author,
            url
        }, req.body.admin_user || 'Administrator Medis');

        res.status(201).json({ success: true, data: candidate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin VALIDATE Candidate
router.post('/:id/validate', (req, res) => {
    try {
        const { admin_user = 'Administrator Medis', edits = {} } = req.body;
        const result = ValidationService.validateCandidate(req.params.id, admin_user, edits);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Candidate Validate API Error]', err);
        res.status(400).json({ error: err.message });
    }
});

// Admin REJECT Candidate
router.post('/:id/reject', (req, res) => {
    try {
        const { reason, admin_user = 'Administrator Medis' } = req.body;

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ error: 'Alasan penolakan (reason) wajib diisi.' });
        }

        const result = ValidationService.rejectCandidate(req.params.id, reason, admin_user);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Candidate Reject API Error]', err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
