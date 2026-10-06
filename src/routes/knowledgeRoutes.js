/**
 * Knowledge Base Management API Routes
 * Supports Direct CRUD, External File Import (PDF, DOCX, TXT, MD), and Medical Domain Validation.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const DocumentParserService = require('../services/documentParser');
const ValidationService = require('../services/validationService');
const HealthValidator = require('../services/healthValidator');

// Multer memory storage configuration (Max 25MB per file)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

// List Knowledge with filters
router.get('/', (req, res) => {
    try {
        const { search, category_id, status } = req.query;
        let items = db.find('knowledge');

        if (status && status !== 'ALL') {
            items = items.filter(k => k.status === status);
        }

        if (category_id && category_id !== 'ALL') {
            items = items.filter(k => String(k.category_id) === String(category_id));
        }

        if (search && search.trim().length > 0) {
            const q = search.toLowerCase();
            items = items.filter(k =>
                k.title.toLowerCase().includes(q) ||
                (k.topic_keywords && k.topic_keywords.toLowerCase().includes(q)) ||
                (k.short_answer && k.short_answer.toLowerCase().includes(q))
            );
        }

        // Hydrate with category and source names
        const enriched = items.map(k => {
            const cat = k.category_id ? db.findById('categories', k.category_id) : null;
            const src = k.source_id ? db.findById('sources', k.source_id) : null;
            return {
                ...k,
                category_name: cat ? cat.name : 'Umum',
                source_name: src ? src.name : 'Literatur Terverifikasi'
            };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({ success: true, data: enriched });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Parse External Document (PDF, DOCX, TXT, MD) and extract structured medical knowledge
router.post('/parse-document', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Tidak ada file yang diunggah. Pilih file PDF atau DOCX.' });
        }

        const { originalname, buffer, mimetype } = req.file;
        console.log(`[DocumentParser] Parsing uploaded file: ${originalname} (${mimetype}, ${buffer.length} bytes)`);

        const extracted = await DocumentParserService.extractTextFromFile(buffer, originalname, mimetype);
        
        // Strict Medical Domain Validation Guardrail
        const validation = HealthValidator.validateMedicalContent({
            title: originalname,
            content_full: extracted.text
        });

        if (!validation.isHealth) {
            return res.status(400).json({ error: validation.rejectReason });
        }

        const parsed = DocumentParserService.parseMedicalDocument(extracted.text, originalname);

        res.json({
            success: true,
            data: {
                ...parsed,
                format: extracted.format,
                pageCount: extracted.pageCount || 1,
                raw_text_length: extracted.text.length
            }
        });
    } catch (err) {
        console.error('[DocumentParser Error]', err);
        res.status(400).json({ error: err.message });
    }
});

// Import External Validated Document directly or via Candidate Queue
router.post('/import-document', upload.single('file'), async (req, res) => {
    try {
        let payload = req.body;

        // If file was attached directly, extract text and parse
        if (req.file) {
            const extracted = await DocumentParserService.extractTextFromFile(req.file.buffer, req.file.originalname, req.file.mimetype);
            const parsed = DocumentParserService.parseMedicalDocument(extracted.text, req.file.originalname);
            payload = {
                ...parsed,
                ...payload // User override fields
            };
        }

        const {
            title,
            category_id,
            source_name,
            publisher,
            year,
            url,
            topic_keywords,
            target_question,
            short_answer,
            important_points,
            when_to_see_doctor,
            content_full,
            validated_by = 'Administrator Medis',
            target_status = 'ACTIVE' // 'ACTIVE' (Direct to KB) or 'PENDING' (To Candidate Review)
        } = payload;

        if (!title || (!short_answer && !payload.proposed_answer)) {
            return res.status(400).json({ error: 'Judul dan Rangkuman/Jawaban Klinis wajib diisi.' });
        }

        // Domain Validation: Medical Check
        const validation = HealthValidator.validateMedicalContent(payload);
        if (!validation.isHealth) {
            return res.status(400).json({ error: validation.rejectReason });
        }

        const finalShortAnswer = short_answer || payload.proposed_answer;
        const now = new Date().toISOString();

        // 1. Create or link Source
        let sourceId = payload.source_id ? Number(payload.source_id) : null;
        if (!sourceId && (source_name || publisher || title)) {
            const newSource = db.findOrCreateSource({
                name: source_name || publisher || title,
                type: 'JOURNAL',
                publisher: publisher || 'Penerbit Medis Tervalidasi',
                year: year ? Number(year) : new Date().getFullYear(),
                url: url || null,
                is_trusted: true
            });
            sourceId = newSource ? newSource.id : 1;
        }

        // Format points
        let finalPoints = important_points;
        if (typeof finalPoints === 'string') {
            try {
                finalPoints = JSON.parse(finalPoints);
            } catch (e) {
                finalPoints = finalPoints.split('\n').map(p => p.replace(/^[•\-\*]\s*/, '').trim()).filter(p => p.length > 0);
            }
        }
        if (!Array.isArray(finalPoints)) {
            finalPoints = [finalPoints || 'Panduan klinis terverifikasi'];
        }

        // Clean topic keywords
        const cleanKws = topic_keywords || title.toLowerCase();

        // If saving directly as ACTIVE Validated Knowledge Base
        if (target_status === 'ACTIVE') {
            const newKnowledge = db.insert('knowledge', {
                title,
                topic_keywords: cleanKws,
                short_answer: finalShortAnswer,
                important_points: JSON.stringify(finalPoints),
                when_to_see_doctor: when_to_see_doctor || 'Segera ke dokter apabila gejala memburuk.',
                content_full: content_full || `Diimpor dari dokumen eksternal tervalidasi (${payload.original_filename || title}).`,
                category_id: category_id ? Number(category_id) : 1,
                source_id: sourceId || 1,
                status: 'ACTIVE',
                validated_by: validated_by || 'Administrator Medis',
                validated_at: now
            });

            // Log validation
            db.insert('validation_logs', {
                candidate_id: null,
                knowledge_id: newKnowledge.id,
                admin_user: validated_by || 'Administrator Medis',
                action: 'VALIDATED',
                previous_status: 'NEW_FILE_IMPORT',
                new_status: 'ACTIVE',
                notes: `Import dokumen valid (${payload.original_filename || title}) langsung ke Knowledge Base.`
            });

            console.log(`[Document Import] Successfully imported validated document into Knowledge Base #${newKnowledge.id}`);
            return res.status(201).json({
                success: true,
                mode: 'KNOWLEDGE_BASE',
                data: newKnowledge,
                message: 'Dokumen eksternal tervalidasi berhasil diimpor ke Knowledge Base!'
            });
        } else {
            // Save as Knowledge Candidate (PENDING)
            const candidate = db.insert('knowledge_candidates', {
                title,
                type: 'JOURNAL',
                question_text: target_question || `Panduan Klinis: ${title}`,
                proposed_answer: finalShortAnswer,
                important_points: JSON.stringify(finalPoints),
                when_to_see_doctor: when_to_see_doctor || 'Segera ke dokter apabila gejala memburuk.',
                doctor_name: publisher || 'Dokumen Eksternal',
                doctor_id: null,
                category_id: category_id ? Number(category_id) : 1,
                source_id: sourceId || 1,
                status: 'PENDING',
                rejection_reason: null,
                submitted_at: now,
                processed_at: null,
                processed_by: null
            });

            console.log(`[Document Import] Saved document as Knowledge Candidate #${candidate.id}`);
            return res.status(201).json({
                success: true,
                mode: 'CANDIDATE',
                data: candidate,
                message: 'Dokumen berhasil disimpan ke antrian Knowledge Candidates untuk divalidasi!'
            });
        }
    } catch (err) {
        console.error('[Document Import Error]', err);
        res.status(400).json({ error: err.message });
    }
});

// Batch Import Multiple External Documents
router.post('/batch-import', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
        }

        const target_status = req.body.target_status || 'ACTIVE';
        const validated_by = req.body.validated_by || 'Administrator Medis';
        const default_category_id = req.body.category_id ? Number(req.body.category_id) : null;

        const results = [];
        const errors = [];

        for (const file of req.files) {
            try {
                const extracted = await DocumentParserService.extractTextFromFile(file.buffer, file.originalname, file.mimetype);
                
                // Validate domain
                const validation = HealthValidator.validateMedicalContent({
                    title: file.originalname,
                    content_full: extracted.text
                });

                if (!validation.isHealth) {
                    errors.push({ filename: file.originalname, error: validation.rejectReason });
                    continue;
                }

                const parsed = DocumentParserService.parseMedicalDocument(extracted.text, file.originalname);
                const category_id = default_category_id || parsed.category_id || 1;
                const now = new Date().toISOString();

                // Create or find existing source
                const newSource = db.findOrCreateSource({
                    name: parsed.source_name || file.originalname,
                    type: 'JOURNAL',
                    publisher: parsed.publisher,
                    year: parsed.year,
                    url: null,
                    is_trusted: true
                });

                if (target_status === 'ACTIVE') {
                    const newKnowledge = db.insert('knowledge', {
                        title: parsed.title,
                        topic_keywords: parsed.topic_keywords,
                        short_answer: parsed.short_answer,
                        important_points: JSON.stringify(parsed.important_points),
                        when_to_see_doctor: parsed.when_to_see_doctor,
                        content_full: parsed.content_full,
                        category_id: category_id,
                        source_id: newSource.id,
                        status: 'ACTIVE',
                        validated_by: validated_by,
                        validated_at: now
                    });

                    db.insert('validation_logs', {
                        candidate_id: null,
                        knowledge_id: newKnowledge.id,
                        admin_user: validated_by,
                        action: 'VALIDATED',
                        previous_status: 'BATCH_IMPORT',
                        new_status: 'ACTIVE',
                        notes: `Batch import file: ${file.originalname}`
                    });

                    results.push({ filename: file.originalname, id: newKnowledge.id, title: newKnowledge.title, status: 'ACTIVE' });
                } else {
                    const candidate = db.insert('knowledge_candidates', {
                        title: parsed.title,
                        type: 'JOURNAL',
                        question_text: parsed.target_question,
                        proposed_answer: parsed.short_answer,
                        important_points: JSON.stringify(parsed.important_points),
                        when_to_see_doctor: parsed.when_to_see_doctor,
                        doctor_name: parsed.publisher,
                        category_id: category_id,
                        source_id: newSource.id,
                        status: 'PENDING',
                        submitted_at: now
                    });

                    results.push({ filename: file.originalname, id: candidate.id, title: candidate.title, status: 'PENDING' });
                }
            } catch (fileErr) {
                errors.push({ filename: file.originalname, error: fileErr.message });
            }
        }

        res.json({
            success: true,
            total_uploaded: req.files.length,
            imported_count: results.length,
            results,
            errors
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Knowledge
router.get('/:id', (req, res) => {
    try {
        const item = db.findById('knowledge', req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Knowledge not found' });
        }
        const cat = item.category_id ? db.findById('categories', item.category_id) : null;
        const src = item.source_id ? db.findById('sources', item.source_id) : null;

        res.json({
            success: true,
            data: {
                ...item,
                category: cat,
                source: src
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Direct Knowledge
router.post('/', (req, res) => {
    try {
        const { title, topic_keywords, short_answer, important_points, when_to_see_doctor, content_full, category_id, source_id, validated_by } = req.body;

        if (!title || !short_answer) {
            return res.status(400).json({ error: 'Title and Short Answer are required.' });
        }

        // Strict Medical Domain Validation Guardrail
        const validation = HealthValidator.validateMedicalContent(req.body);
        if (!validation.isHealth) {
            return res.status(400).json({ error: validation.rejectReason });
        }

        const now = new Date().toISOString();
        const newKnowledge = db.insert('knowledge', {
            title,
            topic_keywords: topic_keywords || title.toLowerCase(),
            short_answer,
            important_points: typeof important_points === 'string' ? important_points : JSON.stringify(important_points || []),
            when_to_see_doctor: when_to_see_doctor || 'Konsultasi ke dokter bila gejala bertambah berat.',
            content_full: content_full || '',
            category_id: category_id ? Number(category_id) : null,
            source_id: source_id ? Number(source_id) : null,
            status: 'ACTIVE',
            validated_by: validated_by || 'Administrator Medis',
            validated_at: now
        });

        // Add to validation logs
        db.insert('validation_logs', {
            candidate_id: null,
            knowledge_id: newKnowledge.id,
            admin_user: validated_by || 'Administrator Medis',
            action: 'VALIDATED',
            previous_status: 'NEW',
            new_status: 'ACTIVE',
            notes: `Penambahan langsung knowledge: ${newKnowledge.title}`
        });

        res.status(201).json({ success: true, data: newKnowledge });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Knowledge
router.put('/:id', (req, res) => {
    try {
        const item = db.findById('knowledge', req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Knowledge not found' });
        }

        const updates = { ...req.body };

        // Validate medical content if text updated
        if (updates.title || updates.short_answer || updates.content_full) {
            const validation = HealthValidator.validateMedicalContent({
                ...item,
                ...updates
            });
            if (!validation.isHealth) {
                return res.status(400).json({ error: validation.rejectReason });
            }
        }

        if (updates.category_id !== undefined && updates.category_id !== null && updates.category_id !== '') {
            updates.category_id = Number(updates.category_id);
        }
        if (updates.source_id !== undefined && updates.source_id !== null && updates.source_id !== '') {
            updates.source_id = Number(updates.source_id);
        }

        if (updates.important_points && typeof updates.important_points !== 'string') {
            updates.important_points = JSON.stringify(updates.important_points);
        }

        const updated = db.update('knowledge', item.id, updates);

        db.insert('validation_logs', {
            candidate_id: null,
            knowledge_id: updated.id,
            admin_user: 'Administrator Medis',
            action: 'EDITED_AND_VALIDATED',
            previous_status: item.status,
            new_status: updated.status,
            notes: `Pembaruan data knowledge #${updated.id}`
        });

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Status (ACTIVE / INACTIVE)
router.patch('/:id/toggle-status', (req, res) => {
    try {
        const item = db.findById('knowledge', req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Knowledge not found' });
        }

        const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const updated = db.update('knowledge', item.id, { status: newStatus });

        db.insert('validation_logs', {
            candidate_id: null,
            knowledge_id: updated.id,
            admin_user: 'Administrator Medis',
            action: newStatus === 'ACTIVE' ? 'REACTIVATED' : 'DEACTIVATED',
            previous_status: item.status,
            new_status: newStatus,
            notes: `Status diubah menjadi ${newStatus}`
        });

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Knowledge
router.delete('/:id', (req, res) => {
    try {
        const success = db.delete('knowledge', req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Knowledge not found' });
        }
        res.json({ success: true, message: 'Knowledge deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
