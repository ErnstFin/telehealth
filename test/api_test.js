/**
 * TeleHealth Automated System & API Verification Test Suite
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/server');
const db = require('../src/db');

const PORT = 3999;
let server;

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING TELEHEALTH END-TO-END VERIFICATION TESTS');
    console.log('====================================================\n');

    // Clean only test-specific artifacts before starting
    const initialKnowledge = db.find('knowledge');
    for (const k of initialKnowledge) {
        if (k.title && k.title.startsWith('[TEST]')) {
            db.delete('knowledge', k.id);
        }
    }

    server = app.listen(PORT);
    await new Promise(r => setTimeout(r, 600));

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = '') {
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name} -> ${details}`);
            failed++;
        }
    }

    try {
        // TEST 1: Health Query (Flu Awal) Matching Knowledge Base
        console.log('\n--- TEST 1: Health Query (Flu Awal) Matching Knowledge Base ---');
        const fluRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Bagaimana mengatasi gejala flu awal?',
            telegramChatId: 'test-user-01'
        });
        assert('Chat API returns 200', fluRes.status === 200);
        assert('Status is ANSWERED_BY_KB', fluRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Relevance score >= 0.65', fluRes.data.data.relevanceScore >= 0.65);
        assert('Contains structured layout with Sumber', fluRes.data.data.responseMessage.includes('Sumber:'));
        assert('Contains disclaimer', fluRes.data.data.responseMessage.includes('bukan pengganti'));

        // TEST 2: Non-Health Query Guardrail (Politics)
        console.log('\n--- TEST 2: Non-Health Query Guardrail (Politics) ---');
        const presRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Siapa presiden Indonesia saat ini?',
            telegramChatId: 'test-user-01'
        });
        assert('Status is REJECTED_NON_HEALTH', presRes.data.data.status === 'REJECTED_NON_HEALTH');
        assert('Bot refuses non-health topic politely', presRes.data.data.responseMessage.includes('asisten informasi khusus seputar **kesehatan'));

        // TEST 3: Non-Health Query Guardrail (Coding)
        console.log('\n--- TEST 3: Non-Health Query Guardrail (Coding) ---');
        const codeRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Buatkan program Python untuk sorting array database sql',
            telegramChatId: 'test-user-01'
        });
        assert('Status is REJECTED_NON_HEALTH', codeRes.data.data.status === 'REJECTED_NON_HEALTH');

        // TEST 4: Unknown Health Query Fallback to Doctor Queue
        console.log('\n--- TEST 4: Fallback to Doctor Queue for Unknown Health Query ---');
        const randNum = Math.floor(Math.random() * 900000) + 100000;
        const uniqueSymptom = `Keluhan langka sensasi kesemutan berdenyut temporal ${randNum}`;
        const unkRes = await makeRequest('POST', '/api/chat/ask', {
            text: uniqueSymptom,
            telegramChatId: 'test-user-02'
        });
        assert('Status is FORWARDED_TO_DOCTOR', unkRes.data.data.status === 'FORWARDED_TO_DOCTOR');
        assert('Doctor question created', Boolean(unkRes.data.data.doctorQuestionId));
        const docQId = unkRes.data.data.doctorQuestionId;

        // TEST 5: Doctor Submits Answer
        console.log('\n--- TEST 5: Doctor Answers the Queued Question ---');
        const docAnsRes = await makeRequest('POST', `/api/doctor/questions/${docQId}/answer`, {
            doctor_name: 'Dr. Siti Rahmawati, Sp.PD',
            category_id: 2,
            response_text: 'Serangan arthritis gout akut memerlukan terapi obat anti-inflamasi dan kompres es.',
            medical_advice: 'Hindari makanan tinggi purin seperti jeroan dan makanan laut.'
        });
        assert('Doctor Answer succeeds', docAnsRes.status === 200 && docAnsRes.data.success);
        assert('Doctor Question status updated to ANSWERED', docAnsRes.data.data.doctorQuestion.status === 'ANSWERED');
        assert('Candidate automatically created with PENDING status', docAnsRes.data.data.knowledgeCandidate.status === 'PENDING');
        const candidateId = docAnsRes.data.data.knowledgeCandidate.id;

        // TEST 6: Admin Validates Candidate -> Promoted to Active Knowledge Base
        console.log('\n--- TEST 6: Administrator Validates Candidate ---');
        const valRes = await makeRequest('POST', `/api/candidates/${candidateId}/validate`, {
            admin_user: 'Administrator Medis'
        });
        assert('Validation succeeds', valRes.status === 200 && valRes.data.success);
        assert('Candidate status updated to VALID', valRes.data.data.candidate.status === 'VALID');
        assert('Promoted to Knowledge Base with ACTIVE status', valRes.data.data.knowledge.status === 'ACTIVE');

        // TEST 7: Bot Can Now Answer the Newly Acquired Knowledge!
        console.log('\n--- TEST 7: Chatbot Answers Newly Validated Knowledge ---');
        const reAskRes = await makeRequest('POST', '/api/chat/ask', {
            text: uniqueSymptom,
            telegramChatId: 'test-user-03'
        });
        assert('Status is now ANSWERED_BY_KB', reAskRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Contains newly validated clinical answer', reAskRes.data.data.responseMessage.includes('arthritis gout akut'));

        // TEST 8: Admin Rejects Candidate with Mandatory Reason
        console.log('\n--- TEST 8: Administrator Rejects Invalid Candidate ---');
        const journalRes = await makeRequest('POST', '/api/candidates/journal', {
            title: 'Klaim Ramuan Herbal Tanpa Bukti Medis',
            proposed_answer: 'Ramuan ini diklaim menyembuhkan segala jenis penyakit tanpa uji klinis terstandar.',
            category_id: 1,
            source_name: 'Artikel Ramuan Tradisional'
        });
        assert('Candidate journal created', journalRes.status === 201 && journalRes.data.success);
        const rejCandidateId = journalRes.data.data.id;
        const rejRes = await makeRequest('POST', `/api/candidates/${rejCandidateId}/reject`, {
            reason: 'Tidak memiliki bukti uji klinis berbasis bukti (Evidence-Based Medicine).',
            admin_user: 'Administrator Medis'
        });
        assert('Rejection succeeds', rejRes.status === 200 && rejRes.data.success);
        assert('Candidate status is REJECTED', rejRes.data.data.candidate.status === 'REJECTED');
        assert('Validation audit log records rejection reason', rejRes.data.data.validationLog.notes.includes('Evidence-Based'));

        // TEST 9: Dashboard Stats API
        console.log('\n--- TEST 9: Dashboard Stats KPI Aggregation ---');
        const statsRes = await makeRequest('GET', '/api/dashboard/stats');
        assert('Stats API returns 200', statsRes.status === 200);
        assert('Has total_knowledge_valid count', typeof statsRes.data.data.counts.total_knowledge_valid === 'number');
        assert('Has category breakdown', Array.isArray(statsRes.data.data.category_stats));
        assert('Has recent validation logs', Array.isArray(statsRes.data.data.recent_logs));

    } catch (err) {
        console.error('Unexpected test error:', err);
        failed++;
    } finally {
        // Clean up only test records added during this run
        const allK = db.find('knowledge');
        for (const k of allK) {
            if (k.title && k.title.startsWith('[TEST]')) {
                db.delete('knowledge', k.id);
            }
        }
        server.close();
        console.log('\n====================================================');
        console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('====================================================');
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
