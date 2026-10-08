process.env.NODE_ENV = 'test';

const assert = require('assert');
const db = require('../src/db');
const LanguageService = require('../src/services/languageService');
const HealthValidator = require('../src/services/healthValidator');
const KnowledgeRetriever = require('../src/services/knowledgeRetriever');
const ResponseGenerator = require('../src/services/responseGenerator');
const telegramBot = require('../src/services/telegramBot');

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING TELEHEALTH FEATURE UPGRADE TEST SUITE');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}\n`);
            failed++;
        }
    }

    async function testAsync(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}\n`);
            failed++;
        }
    }

    // -------------------------------------------------------------
    // 1. CATEGORY CRUD TESTS
    // -------------------------------------------------------------
    console.log('📁 [1] CATEGORY CRUD TESTS');
    test('Create new category', () => {
        const cat = db.insert('categories', {
            name: 'Kesehatan Mental & Psikologi',
            slug: 'kesehatan-mental-psikologi',
            description: 'Depresi, ansietas, gangguan tidur, dan stres.',
            icon: 'brain'
        });
        assert.ok(cat.id > 0, 'Category ID should be created');
        assert.strictEqual(cat.name, 'Kesehatan Mental & Psikologi');
    });

    test('Update existing category', () => {
        const cat = db.find('categories', c => c.name === 'Kesehatan Mental & Psikologi')[0];
        assert.ok(cat, 'Created category should exist');
        const updated = db.update('categories', cat.id, {
            name: 'Kesehatan Jiwa & Psikologi Terpadu',
            icon: 'brain'
        });
        assert.strictEqual(updated.name, 'Kesehatan Jiwa & Psikologi Terpadu');
    });

    test('Delete category with safe fallback', () => {
        const cat = db.find('categories', c => c.name === 'Kesehatan Jiwa & Psikologi Terpadu')[0];
        assert.ok(cat, 'Category should exist before deletion');
        const deleted = db.delete('categories', cat.id);
        assert.strictEqual(deleted, true, 'Category should be deleted successfully');
        const check = db.findById('categories', cat.id);
        assert.strictEqual(check, null, 'Deleted category should no longer exist');
    });

    // -------------------------------------------------------------
    // 2. MULTILINGUAL GREETINGS & DETECTION TESTS
    // -------------------------------------------------------------
    console.log('\n🌐 [2] MULTILINGUAL GREETINGS & DETECTION TESTS');
    test('Detect single-word English greetings ("Hello", "Hi", "Hey")', () => {
        assert.strictEqual(LanguageService.detectLanguage('Hello'), 'en', 'Hello should detect as en');
        assert.strictEqual(LanguageService.detectLanguage('Hi'), 'en', 'Hi should detect as en');
        assert.strictEqual(LanguageService.detectLanguage('Hey'), 'en', 'Hey should detect as en');
        assert.strictEqual(LanguageService.detectLanguage('Good morning'), 'en', 'Good morning should detect as en');
    });

    test('Detect regional greetings (Javanese & Sundanese)', () => {
        assert.strictEqual(LanguageService.detectLanguage('Sugeng enjang'), 'jv', 'Sugeng enjang should detect as jv');
        assert.strictEqual(LanguageService.detectLanguage('Sampurasun'), 'su', 'Sampurasun should detect as su');
        assert.strictEqual(LanguageService.detectLanguage('Wilujeng enjing'), 'su', 'Wilujeng enjing should detect as su');
    });

    test('Detect Indonesian greetings ("Halo", "Hai", "Tes", "Selamat pagi")', () => {
        assert.strictEqual(LanguageService.detectLanguage('Halo'), 'id', 'Halo should detect as id');
        assert.strictEqual(LanguageService.detectLanguage('Hai'), 'id', 'Hai should detect as id');
        assert.strictEqual(LanguageService.detectLanguage('Tes'), 'id', 'Tes should detect as id');
        assert.strictEqual(LanguageService.detectLanguage('Selamat pagi'), 'id', 'Selamat pagi should detect as id');
    });

    test('Detect complex multilingual clinical questions', () => {
        assert.strictEqual(LanguageService.detectLanguage('How to treat a severe headache and fever?'), 'en');
        assert.strictEqual(LanguageService.detectLanguage('Sirahku ngelu lan wetengku perih, kudu ngombe opo?'), 'jv');
        assert.strictEqual(LanguageService.detectLanguage('Abdi lieur pisan sareng awak haredang panas tiris'), 'su');
        assert.strictEqual(LanguageService.detectLanguage('Bagaimana cara penanganan flu dan batuk berdahak?'), 'id');
    });

    test('Bridge English query with medical keywords', () => {
        const bridged = LanguageService.bridgeQueryToMedical('I have a severe headache and high fever', 'en');
        assert.ok(bridged.includes('sakit kepala') || bridged.includes('demam'), 'Bridged query should include Indonesian medical synonyms');
    });

    // -------------------------------------------------------------
    // 3. MULTILINGUAL BOT UI & KEYBOARDS
    // -------------------------------------------------------------
    console.log('\n📱 [3] MULTILINGUAL BOT UI & KEYBOARD GENERATION TESTS');
    test('Generate English Bot Welcome Menu & Keyboards', () => {
        const ui = LanguageService.getBotUIDictionary('en', 'Ernst');
        assert.ok(ui.welcomeText.includes('Hello *Ernst*! Welcome to *TeleHealth*'), 'Welcome text should be in English');
        assert.ok(ui.mainInlineKeyboard.inline_keyboard[0][0].text.includes('Check Common Symptoms'), 'Buttons should be in English');
        assert.ok(ui.mainReplyKeyboard.keyboard[0][0].text.includes('Main Menu'), 'Reply keyboard should be in English');
        assert.ok(ui.gejalaInlineKeyboard.inline_keyboard[0][0].text.includes('Flu & Common Cold'), 'Symptom keyboard in English');
    });

    test('Generate Javanese Bot Welcome Menu', () => {
        const ui = LanguageService.getBotUIDictionary('jv', 'Ernst');
        assert.ok(ui.welcomeText.includes('Sugeng rawuh *Ernst*'), 'Welcome text should be in Javanese');
        assert.ok(ui.mainInlineKeyboard.inline_keyboard[0][0].text.includes('Priksa Gejala'), 'Buttons should be in Javanese');
    });

    test('Generate Indonesian Bot Welcome Menu', () => {
        const ui = LanguageService.getBotUIDictionary('id', 'Ernst');
        assert.ok(ui.welcomeText.includes('Halo *Ernst*! Selamat datang'), 'Welcome text should be in Indonesian');
        assert.ok(ui.mainInlineKeyboard.inline_keyboard[0][0].text.includes('Cek Gejala Umum'), 'Buttons should be in Indonesian');
    });

    // -------------------------------------------------------------
    // 4. MULTILINGUAL KNOWLEDGE RETRIEVAL & RESPONSE GENERATION
    // -------------------------------------------------------------
    console.log('\n🤖 [4] MULTILINGUAL RETRIEVAL & RESPONSE FORMATTING TESTS');
    await testAsync('Retrieve knowledge for English headache query and format in English', async () => {
        const search = await KnowledgeRetriever.search('How to treat tension headache and migraine?', 0.58);
        assert.strictEqual(search.found, true, 'Knowledge should be found for English query');
        assert.strictEqual(search.lang, 'en', 'Detected language should be en');

        const formatted = ResponseGenerator.formatKnowledgeResponse(search.knowledge, search.source, search.category, 'en');
        assert.ok(formatted.includes('VERIFIED MEDICAL INFORMATION'), 'Response should be formatted in English header');
        assert.ok(formatted.includes('Clinical Summary') || formatted.includes('Key Management Points'), 'Response should contain English sections');
    });

    await testAsync('Retrieve knowledge for Javanese flu query', async () => {
        const search = await KnowledgeRetriever.search('Awakku mriang lan watuk pilek, piye carane?', 0.58);
        assert.strictEqual(search.found, true, 'Knowledge should be found for Javanese flu query');
        assert.strictEqual(search.lang, 'jv', 'Detected language should be jv');

        const formatted = ResponseGenerator.formatKnowledgeResponse(search.knowledge, search.source, search.category, 'jv');
        assert.ok(formatted.includes('BASA JAWA'), 'Response should have Javanese localization');
    });

    test('Doctor fallback notice in English', () => {
        const notice = ResponseGenerator.formatDoctorFallbackNotice(99, 'My left knee is swelling after running', 'en');
        assert.ok(notice.includes('Consultation Forwarded to On-Call Doctor'), 'Notice should be in English');
        assert.ok(notice.includes('[#DQ-99]'), 'Notice should have question ID tag');
    });

    test('Non-health refusal in English', () => {
        const refusal = HealthValidator.getNonHealthResponse('en');
        assert.ok(refusal.includes('TeleHealth AI Assistant') || refusal.includes('TeleHealth Specialized Medical Assistant'), 'Refusal should be in English');
    });

    // -------------------------------------------------------------
    // 5. FULL BOT PIPELINE MULTILINGUAL TEST
    // -------------------------------------------------------------
    console.log('\n💬 [5] END-TO-END PIPELINE MULTILINGUAL TESTS');
    await testAsync('Bot handles English health question end-to-end', async () => {
        const result = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-device-en',
            telegramUserId: 'test-user-en',
            text: 'How can I treat mild fever and body chills at home?'
        });

        assert.strictEqual(result.isHealth, true, 'Should be validated as health topic');
        assert.strictEqual(result.language, 'en', 'Should detect English language');
        assert.strictEqual(result.status, 'ANSWERED_BY_KB', 'Should be answered by KB');
        assert.ok(result.responseMessage.includes('VERIFIED MEDICAL INFORMATION'), 'Message should be in English');
    });

    await testAsync('Bot handles non-health question in English with polite refusal in English', async () => {
        const result = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-device-en',
            telegramUserId: 'test-user-en',
            text: 'How to write a Python script for database query?'
        });

        assert.strictEqual(result.status, 'REJECTED_NON_HEALTH', 'Should reject non-health');
        assert.strictEqual(result.language, 'en', 'Should detect English');
        assert.ok(result.responseMessage.includes('Non-Healthcare Inquiry Notice') || result.responseMessage.includes('TeleHealth AI Assistant'), 'Refusal should be in English');
    });

    await testAsync('Bot maintains English session language across multiple turns and button clicks', async () => {
        // Turn 1: User says Hello
        const turn1 = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-session-user-99',
            telegramUserId: 'test-session-user-99',
            text: 'Hello'
        });
        assert.strictEqual(telegramBot.getUserLang('test-session-user-99', 'test-session-user-99'), 'en');

        // Turn 2: User clicks English symptom topic
        const turn2 = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-session-user-99',
            telegramUserId: 'test-session-user-99',
            text: 'how to treat flu and common cold symptoms'
        });
        assert.strictEqual(turn2.language, 'en', 'Should stay in English');
        assert.ok(turn2.responseMessage.includes('VERIFIED MEDICAL INFORMATION'), 'Response should be in English');

        // Turn 3: User asks follow-up
        const turn3 = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-session-user-99',
            telegramUserId: 'test-session-user-99',
            text: 'What should I do for headache?'
        });
        assert.strictEqual(turn3.language, 'en', 'Should stay in English');

        // Turn 4: User explicitly switches to Indonesian
        const turn4 = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-session-user-99',
            telegramUserId: 'test-session-user-99',
            text: 'Halo dokter, saya sakit perut'
        });
        assert.strictEqual(turn4.language, 'id', 'Should switch to Indonesian');
        assert.strictEqual(telegramBot.getUserLang('test-session-user-99', 'test-session-user-99'), 'id');
    });

    // -------------------------------------------------------------
    // 6. SUPERADMIN KNOWLEDGE BASE RESET TESTS
    // -------------------------------------------------------------
    console.log('\n🛡️ [6] SUPERADMIN KNOWLEDGE BASE RESET TESTS');
    test('Reset Knowledge Base to DEFAULT baseline', () => {
        db.insert('knowledge', {
            title: 'Custom Test Knowledge Entry',
            topic_keywords: 'test',
            short_answer: 'Test short answer',
            status: 'ACTIVE'
        });

        const resetRes = db.resetKnowledgeStore('DEFAULT', 'Super Administrator Test');
        assert.strictEqual(resetRes.mode, 'DEFAULT');
        assert.ok(resetRes.count >= 5, 'Baseline knowledge should be restored');

        const kb = db.find('knowledge');
        assert.ok(kb.some(k => k.id === 1 && k.title.includes('Flu')), 'PAPDI/WHO Flu baseline should be present');
    });

    test('Reset Knowledge Base CLEAR_ALL mode', () => {
        const clearRes = db.resetKnowledgeStore('CLEAR_ALL', 'Super Administrator Test');
        assert.strictEqual(clearRes.mode, 'CLEAR_ALL');
        assert.strictEqual(clearRes.count, 0);

        const kb = db.find('knowledge');
        assert.strictEqual(kb.length, 0, 'Knowledge store should be empty');

        // Restore to default baseline for normal app usage
        db.resetKnowledgeStore('DEFAULT', 'Super Administrator');
        assert.ok(db.find('knowledge').length >= 5, 'Knowledge store restored to baseline');
    });

    console.log('\n====================================================');
    console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
