/**
 * Knowledge Validation Service
 * Implements the Administrator Validation workflow for Knowledge Candidates.
 * Ensures ONLY validated knowledge enters the active Knowledge Base.
 */

const db = require('../db');
const HealthValidator = require('./healthValidator');

class ValidationService {
    /**
     * Approves and validates a candidate, promoting it to active Knowledge Base
     * @param {number|string} candidateId
     * @param {string} adminUser
     * @param {object} optionalEdits
     */
    static validateCandidate(candidateId, adminUser = 'Administrator Medis', optionalEdits = {}) {
        const candidate = db.findById('knowledge_candidates', candidateId);
        if (!candidate) {
            throw new Error(`Candidate #${candidateId} not found.`);
        }

        if (candidate.status === 'VALID') {
            throw new Error(`Candidate #${candidateId} has already been validated.`);
        }

        const now = new Date().toISOString();

        // 1. Update candidate status
        const updatedCandidate = db.update('knowledge_candidates', candidate.id, {
            ...optionalEdits,
            status: 'VALID',
            processed_at: now,
            processed_by: adminUser
        });

        // 2. Prepare clean keywords for search indexing
        const rawTokens = `${updatedCandidate.title} ${updatedCandidate.question_text || ''} ${updatedCandidate.proposed_answer || ''}`
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !['pada', 'untuk', 'dengan', 'yang', 'dalam', 'tata', 'laksana', 'pedoman', 'panduan', 'respon', 'dokter'].includes(w));
        
        const uniqueKws = Array.from(new Set(rawTokens)).slice(0, 10);
        const topicKeywords = uniqueKws.join(', ') || updatedCandidate.title.toLowerCase();

        // 3. Insert into active Knowledge Base
        const newKnowledge = db.insert('knowledge', {
            title: updatedCandidate.title,
            topic_keywords: topicKeywords,
            short_answer: updatedCandidate.proposed_answer,
            important_points: updatedCandidate.important_points || JSON.stringify(['Rekomendasi klinis terverifikasi']),
            when_to_see_doctor: updatedCandidate.when_to_see_doctor || 'Segera ke fasilitas medis jika kondisi memburuk.',
            content_full: `Knowledge diperoleh melalui proses akuisisi ${updatedCandidate.type} oleh ${updatedCandidate.doctor_name || 'Administrator Medis'}.`,
            category_id: updatedCandidate.category_id || 1,
            source_id: updatedCandidate.source_id || 6,
            status: 'ACTIVE',
            validated_by: adminUser,
            validated_at: now
        });

        // 4. Record in validation_logs
        const log = db.insert('validation_logs', {
            candidate_id: candidate.id,
            knowledge_id: newKnowledge.id,
            admin_user: adminUser,
            action: Object.keys(optionalEdits).length > 0 ? 'EDITED_AND_VALIDATED' : 'VALIDATED',
            previous_status: candidate.status,
            new_status: 'ACTIVE',
            notes: `Candidate #${candidate.id} berhasil divalidasi dan dipromosikan ke Knowledge Base aktif #${newKnowledge.id}.`
        });

        console.log(`[Validator] Candidate #${candidate.id} VALIDATED -> Promoted to Knowledge Base #${newKnowledge.id}`);

        return {
            success: true,
            candidate: updatedCandidate,
            knowledge: newKnowledge,
            validationLog: log
        };
    }

    /**
     * Rejects a candidate with mandatory rejection reason
     * @param {number|string} candidateId
     * @param {string} rejectionReason
     * @param {string} adminUser
     */
    static rejectCandidate(candidateId, rejectionReason, adminUser = 'Administrator Medis') {
        const candidate = db.findById('knowledge_candidates', candidateId);
        if (!candidate) {
            throw new Error(`Candidate #${candidateId} not found.`);
        }

        if (!rejectionReason || rejectionReason.trim().length === 0) {
            throw new Error('Alasan penolakan (rejection reason) wajib diisi.');
        }

        const now = new Date().toISOString();

        // 1. Update candidate status to REJECTED
        const updatedCandidate = db.update('knowledge_candidates', candidate.id, {
            status: 'REJECTED',
            rejection_reason: rejectionReason.trim(),
            processed_at: now,
            processed_by: adminUser
        });

        // 2. Record in validation_logs
        const log = db.insert('validation_logs', {
            candidate_id: candidate.id,
            knowledge_id: null,
            admin_user: adminUser,
            action: 'REJECTED',
            previous_status: candidate.status,
            new_status: 'REJECTED',
            notes: `Penolakan candidate: ${rejectionReason.trim()}`
        });

        console.log(`[Validator] Candidate #${candidate.id} REJECTED with reason: "${rejectionReason}"`);

        return {
            success: true,
            candidate: updatedCandidate,
            validationLog: log
        };
    }

    /**
     * Adds a new medical journal or literature article as a Knowledge Candidate
     * @param {object} journalData
     */
    static submitJournalCandidate(journalData, adminUser = 'Administrator Medis') {
        const now = new Date().toISOString();

        // Create or link source
        let sourceId = journalData.source_id;
        if (!sourceId && journalData.source_name) {
            const newSource = db.findOrCreateSource({
                name: journalData.source_name,
                type: journalData.source_type || 'JOURNAL',
                publisher: journalData.publisher || 'Medical Publisher',
                year: journalData.year || new Date().getFullYear(),
                url: journalData.url || null,
                is_trusted: true
            });
            sourceId = newSource ? newSource.id : 1;
        }

        const candidate = db.insert('knowledge_candidates', {
            title: journalData.title,
            type: journalData.type || 'JOURNAL',
            question_text: journalData.target_question || `Panduan Klinis: ${journalData.title}`,
            proposed_answer: journalData.proposed_answer,
            important_points: typeof journalData.important_points === 'string'
                ? journalData.important_points
                : JSON.stringify(journalData.important_points || []),
            when_to_see_doctor: journalData.when_to_see_doctor || 'Segera konsultasi dokter bila gejala memburuk.',
            doctor_name: journalData.author || journalData.publisher || 'Literatur Medis',
            doctor_id: null,
            category_id: journalData.category_id || 1,
            source_id: sourceId || 1,
            status: 'PENDING',
            rejection_reason: null,
            submitted_at: now,
            processed_at: null,
            processed_by: null
        });

        console.log(`[Validator] Ingested Medical Journal Candidate #${candidate.id}: "${candidate.title}"`);
        return candidate;
    }
}

module.exports = ValidationService;
