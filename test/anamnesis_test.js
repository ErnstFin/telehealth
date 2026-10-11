/**
 * Test Suite for Sacred Seven Anamnesis Service
 */

const assert = require('assert');
const anamnesisService = require('../src/services/anamnesisService');
const db = require('../src/db');

async function runTests() {
    console.log('🧪 RUNNING SACRED SEVEN ANAMNESIS TESTS');
    console.log('====================================================');

    const chatId = 'test-patient-001';

    // 1. TEST START SESSION
    anamnesisService.cancelSession(chatId);
    const startRes = anamnesisService.startSession(chatId, 'Kepala saya sakit berdenyut');
    assert.strictEqual(startRes.isEmergency, false, 'Start session should not be emergency');
    assert.strictEqual(startRes.step, 1, 'Should start at step 1');
    assert(startRes.renderedMessage.includes('Onset'), 'Prompt should mention Onset');
    console.log('✅ PASS: Start session successfully on Step 1 (Onset)');

    // 2. TEST RED FLAG EMERGENCY DETECTION
    const emergencyChatId = 'test-patient-emergency';
    const emRes = anamnesisService.startSession(emergencyChatId, 'Dada saya nyeri hebat seperti ditindih dan keluar keringat dingin');
    assert.strictEqual(emRes.isEmergency, true, 'Should detect cardiovascular red flag immediately');
    assert(emRes.renderedMessage.includes('Instalasi Gawat Darurat'), 'Should mention IGD');
    assert(emRes.renderedMessage.includes('119'), 'Should mention emergency number 119');
    console.log('✅ PASS: Immediate emergency break & referral to IGD for Red Flag');

    // 3. TEST STEP PROGRESSION & FREE TEXT / BUTTON SELECTION
    // Step 1: Onset
    const step2 = await anamnesisService.processAnswer(chatId, '1 sampai 3 hari terakhir');
    assert.strictEqual(step2.step, 2, 'Should advance to step 2');
    assert(step2.renderedMessage.includes('Location'), 'Should ask Location');
    console.log('✅ PASS: Advances from Step 1 to Step 2 (Location)');

    // Step 2: Location
    const step3 = await anamnesisService.processAnswer(chatId, 'Area kepala sebelah kiri berdenyut');
    console.log('Step 3 result status:', step3.status);
    assert(step3.step === 3 || step3.status === 'EARLY_EXIT_OFFERED', 'Advances to Step 3 or triggers early exit check');
    console.log('✅ PASS: Evaluates Step 2 and performs adaptive early evaluation');

    // If early exit offered or step 3
    if (step3.status === 'EARLY_EXIT_OFFERED') {
        console.log('✅ PASS: Early exit successfully triggered with high confidence match!');
        const earlyRes = await anamnesisService.acceptEarlyExit(chatId);
        assert.strictEqual(earlyRes.status, 'COMPLETED_EARLY_EXIT', 'Early exit completed successfully');
        console.log('✅ PASS: User accepted early exit and received immediate solution');
    }

    // 4. TEST MID-ANAMNESIS RED FLAG TRIGGER
    const midEmergencyChat = 'test-mid-emergency';
    anamnesisService.startSession(midEmergencyChat, 'Saya merasa agak pusing');
    const redFlagStep2 = await anamnesisService.processAnswer(midEmergencyChat, 'Tiba-tiba bibir mencong dan bicara pelo separuh badan lemas');
    assert.strictEqual(redFlagStep2.isEmergency, true, 'Mid-anamnesis Red Flag must stop session');
    assert.strictEqual(anamnesisService.hasActiveSession(midEmergencyChat), false, 'Session must be cleared');
    console.log('✅ PASS: Mid-anamnesis Red Flag abruptly halts consultation and clears session');

    console.log('====================================================');
    console.log('🎉 ALL SACRED SEVEN TESTS PASSED!');
    console.log('====================================================');
}

runTests().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
