/**
 * Response Generator Service
 * Formats verified knowledge and doctor answers into structured, rich medical cards.
 */

class ResponseGenerator {
    /**
     * Formats validated knowledge into the structured Telegram & Web card
     * @param {object} knowledgeItem
     * @param {object} source
     * @param {object} category
     */
    static formatKnowledgeResponse(knowledgeItem, source, category) {
        let points = [];
        try {
            if (typeof knowledgeItem.important_points === 'string') {
                points = JSON.parse(knowledgeItem.important_points);
            } else if (Array.isArray(knowledgeItem.important_points)) {
                points = knowledgeItem.important_points;
            }
        } catch (e) {
            points = knowledgeItem.important_points ? [knowledgeItem.important_points] : [];
        }

        const categoryName = category ? category.name : (knowledgeItem.category_name || 'Kesehatan Umum');
        const bulletList = points.length > 0
            ? points.map(pt => `• ${String(pt).replace(/^[•\-\*]\s*/, '')}`).join('\n')
            : '• Amati perkembangan gejala dan istirahat yang cukup.';

        const sourceTitle = source ? `${source.name}${source.year ? ` (${source.year})` : ''}` : 'Literatur Medis Tervalidasi TeleHealth';
        const publisherInfo = source && source.publisher ? ` - ${source.publisher}` : '';

        return (
            `💡 *[INFORMASI MEDIS TERVALIDASI]*\n` +
            `📂 *Kategori:* _${categoryName}_\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🩺 *${knowledgeItem.title}*\n\n` +
            `📋 *Ringkasan Klinis:*\n` +
            `${knowledgeItem.short_answer}\n\n` +
            `📌 *Poin Penting Penanganan:*\n` +
            `${bulletList}\n\n` +
            `🚨 *Kapan Harus ke Dokter:*\n` +
            `${knowledgeItem.when_to_see_doctor || 'Segera periksakan diri ke fasilitas medis bila gejala semakin memberat.'}\n\n` +
            `📚 *Sumber:*\n` +
            `_${sourceTitle}${publisherInfo}_\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚕️ _Catatan: Informasi ini bersumber dari data medis terverifikasi dan bukan pengganti diagnosis langsung dari dokter._`
        );
    }

    /**
     * Formats doctor fallback notification message (Doctor Queue Ticket)
     */
    static formatDoctorFallbackNotice(doctorQuestionId = null, questionText = '') {
        const idTag = doctorQuestionId ? `[#DQ-${doctorQuestionId}] ` : '';
        const previewQ = questionText ? `\n📝 *Pertanyaan Pasien:* _"${questionText}"_\n` : '';

        return (
            `🟢 *${idTag}Konsultasi Diteruskan ke Dokter Jaga*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━${previewQ}\n` +
            `⏳ *Status:* Menunggu Respon Dokter Jaga\n` +
            `⏱️ *Estimasi Respon:* 5 - 15 Menit\n\n` +
            `👨‍⚕️ Pertanyaan Anda belum ada di arsip pustaka tervalidasi dan telah kami teruskan ke *Antrian Dokter (Doctor Queue)*.\n\n` +
            `Dokter jaga kami akan segera meninjau keluhan Anda dan memberikan anjuran medis melalui chat ini.`
        );
    }

    /**
     * Formats the final answer when doctor responds
     */
    static formatDoctorAnswerResponse(doctorName, answerText, medicalAdvice, questionText = null) {
        return (
            `👨‍⚕️ *[RESPON DOKTER TELEHEALTH]* ✅\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `👨‍⚕️ *Dokter Penjawab:* ${doctorName || 'Tim Dokter TeleHealth'}\n` +
            (questionText ? `📝 *Pertanyaan:* _"${questionText}"_\n` : '') +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🩺 *Penjelasan Klinis:*\n` +
            `${answerText}\n\n` +
            (medicalAdvice ? `💡 *Saran & Anjuran Medis:*\n${medicalAdvice}\n\n` : '') +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚠️ _Catatan: Informasi ini merupakan respon langsung dari dokter jaga dan bukan pengganti pemeriksaan fisik atau penanganan darurat secara langsung._`
        );
    }
}

module.exports = ResponseGenerator;
