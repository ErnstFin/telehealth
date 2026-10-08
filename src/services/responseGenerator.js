/**
 * Response Generator Service
 * Formats verified knowledge and doctor answers into structured, rich medical cards
 * with full Multilingual Support (Indonesian, English, Javanese, Sundanese).
 */

const LanguageService = require('./languageService');

class ResponseGenerator {
    /**
     * Formats validated knowledge into structured Telegram & Web card based on user's language
     * @param {object} knowledgeItem
     * @param {object} source
     * @param {object} category
     * @param {string} lang - 'id' | 'en' | 'jv' | 'su'
     */
    static formatKnowledgeResponse(knowledgeItem, source, category, lang = 'id') {
        if (lang === 'en') {
            const enData = LanguageService.translateKnowledgeToEnglish(knowledgeItem, category, source);
            const categoryName = enData.category_name || (category ? category.name : 'General Health');
            const bulletList = enData.important_points.length > 0
                ? enData.important_points.map(pt => `• ${String(pt).replace(/^[•\-\*]\s*/, '')}`).join('\n')
                : '• Monitor symptom progress and ensure optimal physical rest.';

            const sourceTitle = source ? `${source.name}${source.year ? ` (${source.year})` : ''}` : 'TeleHealth Verified Clinical Literature';
            const publisherInfo = source && source.publisher ? ` - ${source.publisher}` : '';

            return (
                `💡 *[VERIFIED MEDICAL INFORMATION]*\n` +
                `📂 *Category:* _${categoryName}_\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🩺 *${enData.title}*\n\n` +
                `📋 *Clinical Summary:*\n` +
                `${enData.short_answer}\n\n` +
                `📌 *Key Management Points:*\n` +
                `${bulletList}\n\n` +
                `🚨 *When to See a Doctor / Red Flags:*\n` +
                `${enData.when_to_see_doctor}\n\n` +
                `📚 *Source Reference:*\n` +
                `_${sourceTitle}${publisherInfo}_\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⚕️ _Note: This information is sourced from verified medical guidelines and does not replace in-person consultation with a qualified doctor._`
            );
        }

        if (lang === 'jv') {
            let points = [];
            try {
                if (typeof knowledgeItem.important_points === 'string') {
                    points = JSON.parse(knowledgeItem.important_points);
                } else if (Array.isArray(knowledgeItem.important_points)) {
                    points = knowledgeItem.important_points;
                }
            } catch (e) {
                points = [knowledgeItem.important_points];
            }

            const categoryName = category ? category.name : 'Kesehatan Umum';
            const bulletList = points.length > 0
                ? points.map(pt => `• ${String(pt).replace(/^[•\-\*]\s*/, '')}`).join('\n')
                : '• Ngaso sing cukup lan gatekake kahanan awak.';

            const sourceTitle = source ? `${source.name}${source.year ? ` (${source.year})` : ''}` : 'Literatur Medis Tervalidasi';

            return (
                `💡 *[INFORMASI MEDIS TERVALIDASI - BASA JAWA]*\n` +
                `📂 *Kategori:* _${categoryName}_\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🩺 *${knowledgeItem.title}*\n\n` +
                `📋 *Katrangan Klinis:*\n` +
                `${knowledgeItem.short_answer}\n\n` +
                `📌 *Babagan Wigati kang Perlu Dilakoni:*\n` +
                `${bulletList}\n\n` +
                `🚨 *Kapan Kudu Tindak menyang Dokter:*\n` +
                `${knowledgeItem.when_to_see_doctor || 'Enom-enom tindak menyang dokter menawi kahanan tansah sanget.'}\n\n` +
                `📚 *Sumber:* _${sourceTitle}_\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⚕️ _Cathetan: Katrangan punika minangka panduan awal saking pustaka medis resmi lan sanes pangganti pamriksan langsung dokter._`
            );
        }

        if (lang === 'su') {
            let points = [];
            try {
                if (typeof knowledgeItem.important_points === 'string') {
                    points = JSON.parse(knowledgeItem.important_points);
                } else if (Array.isArray(knowledgeItem.important_points)) {
                    points = knowledgeItem.important_points;
                }
            } catch (e) {
                points = [knowledgeItem.important_points];
            }

            const categoryName = category ? category.name : 'Kesehatan Umum';
            const bulletList = points.length > 0
                ? points.map(pt => `• ${String(pt).replace(/^[•\-\*]\s*/, '')}`).join('\n')
                : '• Istirahat anu cekap tur perhatikeun kaayaan awak.';

            const sourceTitle = source ? `${source.name}${source.year ? ` (${source.year})` : ''}` : 'Literatur Medis Tervalidasi';

            return (
                `💡 *[INFORMASI MEDIS TERVALIDASI - BASA SUNDA]*\n` +
                `📂 *Kategori:* _${categoryName}_\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🩺 *${knowledgeItem.title}*\n\n` +
                `📋 *Katerangan Klinis:*\n` +
                `${knowledgeItem.short_answer}\n\n` +
                `📌 *Poin Penting Pitulung Mandiri:*\n` +
                `${bulletList}\n\n` +
                `🚨 *Iraha Kedah Ka Dokter:*\n` +
                `${knowledgeItem.when_to_see_doctor || 'Enggal parios ka dokter upami karaosna beuki parah.'}\n\n` +
                `📚 *Sumber:* _${sourceTitle}_\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⚕️ _Catetan: Informasi ieu dumasar kana pedoman medis terverifikasi sareng sanes gaganti pamariksaan langsung ku dokter._`
            );
        }

        // Default Indonesian
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
     * @param {number|string} doctorQuestionId
     * @param {string} questionText
     * @param {string} lang - 'id' | 'en' | 'jv' | 'su'
     */
    static formatDoctorFallbackNotice(doctorQuestionId = null, questionText = '', lang = 'id') {
        const idTag = doctorQuestionId ? `[#DQ-${doctorQuestionId}] ` : '';

        if (lang === 'en') {
            const previewQ = questionText ? `\n📝 *Patient Inquiry:* _"${questionText}"_\n` : '';
            return (
                `🟢 *${idTag}Consultation Forwarded to On-Call Doctor*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━${previewQ}\n` +
                `⏳ *Status:* Waiting for Doctor Response\n` +
                `⏱️ *Estimated Response:* 5 - 15 Minutes\n\n` +
                `👨‍⚕️ Your question is not yet in our pre-verified archive and has been queued directly to our *Doctor Queue*.\n\n` +
                `Our on-call medical specialist will review your symptoms and provide personalized medical advice via this chat shortly.`
            );
        }

        if (lang === 'jv') {
            const previewQ = questionText ? `\n📝 *Pitakon Panjenengan:* _"${questionText}"_\n` : '';
            return (
                `🟢 *${idTag}Pitakon Dipunterusaken dhumateng Dokter Jaga*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━${previewQ}\n` +
                `⏳ *Status:* Ngentosi Wangsulan Dokter\n` +
                `⏱️ *Perkiraan Wektu:* 5 - 15 Menit\n\n` +
                `👨‍⚕️ Pitakon panjenengan dereng wonten ing pustaka lan sampun dipunlebetaken antrian dokter jaga.\n\n` +
                `Dokter jaga badhe maringi pitedah medis lumantar chat punika.`
            );
        }

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
     * @param {string} doctorName
     * @param {string} answerText
     * @param {string} medicalAdvice
     * @param {string} questionText
     * @param {string} lang
     */
    static formatDoctorAnswerResponse(doctorName, answerText, medicalAdvice, questionText = null, lang = 'id') {
        if (lang === 'en') {
            return (
                `👨‍⚕️ *[TELEHEALTH DOCTOR RESPONSE]* ✅\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👨‍⚕️ *Attending Physician:* ${doctorName || 'TeleHealth Medical Team'}\n` +
                (questionText ? `📝 *Inquiry:* _"${questionText}"_\n` : '') +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🩺 *Clinical Explanation:*\n` +
                `${answerText}\n\n` +
                (medicalAdvice ? `💡 *Medical Recommendations & Advice:*\n${medicalAdvice}\n\n` : '') +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⚠️ _Note: This is a direct response from an on-call physician and does not replace emergency in-person medical evaluation._`
            );
        }

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
