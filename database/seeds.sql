-- ==========================================================
-- TELEHEALTH INITIAL SEED DATA (PostgreSQL)
-- ==========================================================

-- 1. Kategori Kesehatan
INSERT INTO categories (name, slug, description, icon) VALUES
('Flu & Pernapasan', 'flu-pernapasan', 'Infeksi saluran pernapasan akut, pilek, flu, batuk, dan sakit tenggorokan.', 'wind'),
('Demam & Infeksi Umum', 'demam-infeksi', 'Kondisi demam, infeksi virus/bakteri, dan respon peradangan tubuh.', 'thermometer'),
('Sakit Kepala & Neurologi', 'sakit-kepala-neurologi', 'Migrain, tension headache, vertigo, dan gangguan saraf ringan.', 'brain'),
('Darah & Kardiovaskular', 'darah-kardiovaskular', 'Anemia, tekanan darah tinggi/rendah, dan kesehatan jantung.', 'heart-pulse'),
('Pencernaan & Lambung', 'pencernaan-lambung', 'Gastritis, asam lambung (GERD), diare, konstipasi, dan maag.', 'activity'),
('Kesehatan Anak & Pediatri', 'kesehatan-anak', 'Kesehatan balita dan anak, imunisasi, dan nutrisi tumbuh kembang.', 'baby')
ON CONFLICT (slug) DO NOTHING;

-- 2. Sumber Terpercaya (Sources)
INSERT INTO sources (name, type, publisher, year, url, is_trusted) VALUES
('Management of Common Cold and Upper Respiratory Infections', 'JOURNAL', 'Indonesian Journal of Internal Medicine / PAPDI', 2024, 'https://papdi.or.id/guidelines/common-cold-2024', TRUE),
('Clinical Practice Guideline for Evaluation of Fever in Adults', 'JOURNAL', 'WHO Health Guidelines & Kemenkes RI', 2023, 'https://kemkes.go.id/cpg-demam', TRUE),
('Diagnosis and Management of Tension-Type Headache and Migraine', 'JOURNAL', 'Journal of Neurology & Indonesian Neurological Association (PERDOSI)', 2024, 'https://perdosi.org/guidelines/headache-2024', TRUE),
('Diagnosis and Treatment of Iron Deficiency Anemia in Primary Care', 'LITERATURE', 'Perhimpunan Hematologi dan Transfusi Darah Indonesia (PHTDI)', 2023, 'https://phtdi.org/guidelines/anemia-guide', TRUE),
('National Clinical Guidelines for Dyspepsia and Gastroesophageal Reflux Disease', 'OFFICIAL_GUIDELINE', 'Konsensus Nasional Penatalaksanaan Dispepsia dan GERD', 2023, 'https://pbpegi.com/guidelines-dyspepsia', TRUE),
('Dr. Siti Rahmawati, Sp.PD (Dokter Spesialis Penyakit Dalam)', 'DOCTOR', 'TeleHealth Medical Panel', 2024, NULL, TRUE);

-- 3. Knowledge Base Tervalidasi (Status: ACTIVE)
INSERT INTO knowledge (title, topic_keywords, short_answer, important_points, when_to_see_doctor, content_full, category_id, source_id, status, validated_by) VALUES
(
    'Penanganan Gejala Flu Awal pada Dewasa',
    'flu, pilek, influenza, batuk ringan, bersin, hidung tersumbat, gejala flu awal, mengatasi flu, masuk angin',
    'Untuk gejala flu ringan pada tahap awal, penanganan mandiri yang tepat meliputi istirahat optimal, pemenuhan hidrasi tubuh yang cukup, dan menjaga kehangatan saluran napas.',
    '["Istirahat total dan tidur yang cukup (7-9 jam per hari) guna membantu imunitas tubuh melawan virus.", "Perbanyak minum air hangat minimal 2-2.5 liter per hari untuk mengencerkan lendir dan mencegah dehidrasi.", "Konsumsi makanan bernutrisi tinggi dan sup hangat serta vitamin C atau buah-buahan segar.", "Gunakan uap air hangat atau bilas hidung dengan larutan saline (garam fisiologis) jika hidung tersumbat."]',
    'Segera konsultasikan ke dokter apabila demam melebihi 38.5°C selama lebih dari 3 hari, timbul sesak napas berat, nyeri dada, batuk berdahak kuning-kehijauan kental, atau kondisi memburuk setelah 7 hari.',
    'Panduan klinis tata laksana influenza ringan mengutamakan terapi suportif karena flu disebabkan oleh virus yang bersifat self-limiting. Antibiotik tidak diperlukan kecuali terdapat indikasi infeksi bakteri sekunder yang telah diperiksa oleh dokter.',
    1, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Penyebab dan Pertolongan Pertama Demam pada Dewasa',
    'demam, panas badan, suhu tinggi, menggigil, badan panas, penyebab demam, mengatasi demam, paracetamol',
    'Demam adalah respon fisiologis sistem kekebalan tubuh dalam melawan infeksi virus, bakteri, atau peradangan. Suhu tubuh normal berkisar antara 36.5°C - 37.5°C.',
    '["Ukur suhu secara berkala dengan termometer medis yang akurat (demam di atas 38°C).", "Kompres dengan air hangat (bukan air es) di area dahi, ketiak, atau lipatan paha.", "Minum cairan yang cukup untuk mencegah dehidrasi akibat penguapan tubuh.", "Kenakan pakaian yang longgar dan menyerap keringat di ruangan bersirkulasi baik.", "Dapat meminum obat penurun panas (seperti Paracetamol) sesuai dosis anjuran kemasan jika merasa tidak nyaman."]',
    'Kunjungi fasilitas kesehatan jika suhu tubuh di atas 39°C, demam berlanjut lebih dari 3 hari, timbul ruam kemerahan, kaku pada leher, kejang, muntah terus menerus, atau pasien mengalami penurunan kesadaran.',
    'Demam bukan merupakan penyakit tersendiri, melainkan gejala dari suatu proses infeksi atau reaksi imunologis tubuh.',
    2, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Langkah Penanganan Sakit Kepala Tegang (Tension Headache)',
    'sakit kepala, pusing, kepala tegang, puyeng, sakit kepala belakang, migrain, stres, kaku leher',
    'Sakit kepala tipe tegang umumnya dipicu oleh stres fisik atau emosional, kelelahan mata, kurang tidur, dehidrasi, atau postur tubuh yang kaku saat bekerja.',
    '["Istirahatkan mata dan hindari paparan layar gadget (screen time) selama minimal 30 menit.", "Lakukan relaksasi dan pijat lembut di area pelipis, tengkuk leher, dan bahu.", "Pastikan tubuh terhidrasi dengan meminum segelas air putih hangat.", "Lakukan peregangan otot leher secara perlahan dan atur pernapasan secara teratur."]',
    'Segera ke IGD atau dokter spesialis saraf jika sakit kepala muncul sangat mendadak dan hebat (thunderclap headache), disertai gangguan penglihatan, kelemahan separuh badan, bicara pelo, atau setelah mengalami benturan kepala.',
    'Sebagian besar sakit kepala tegang merespon baik terhadap modifikasi gaya hidup, manajemen stres, dan analgesik ringan lini pertama jika diperlukan.',
    3, 3, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Gejala dan Pencegahan Anemia Defisiensi Besi',
    'anemia, kurang darah, hb rendah, pucat, lemas, 5L, mudah lelah, pusing saat berdiri, ujung jari dingin',
    'Anemia adalah kondisi ketika kadar hemoglobin (Hb) dalam sel darah merah berada di bawah standar normal, mengakibatkan pasokan oksigen ke seluruh jaringan tubuh menurun.',
    '["Gejala khas 5L: Lemah, Letih, Lesu, Lelah, dan Lunglai serta tampak pucat pada kelopak mata bawah atau kuku.", "Konsumsi makanan kaya zat besi seperti daging merah tanpa lemak, hati ayam/sapi, bayam, brokoli, dan kacang-kacangan.", "Kombinasikan dengan makanan kaya vitamin C (jeruk, jambu biji) untuk membantu penyerapan zat besi optimal di usus.", "Hindari minum teh atau kopi secara bersamaan saat makan makanan berzat besi tinggi karena tanin menghambat penyerapan."]',
    'Konsultasikan ke dokter untuk pemeriksaan darah lengkap (Hb, Ferritin, TIBC) jika sering mengalami pusing berputar, jantung berdebar-debar tanpa sebab jelas, sesak napas saat aktivitas ringan, atau pingsan.',
    'Penegakan diagnosis pasti anemia memerlukan konfirmasi laboratorium hemoglobin darah.',
    4, 4, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Pertolongan Awal Sakit Maag dan Asam Lambung (Gastritis/GERD)',
    'maag, asam lambung, gerd, nyeri ulu hati, perut perih, kembung, mual, heartburn, lambung sakit',
    'Sakit maag (dispepsia) atau refluks asam lambung terjadi akibat iritasi pada dinding lambung atau naiknya asam lambung ke kerongkongan.',
    '["Makan dalam porsi kecil namun lebih sering (small frequent meals) setiap 3-4 jam.", "Hindari makanan yang terlalu pedas, sangat asam, berlemak tinggi, minuman bersoda, kopi, dan alkohol.", "Jangan langsung berbaring atau tidur setidaknya 2-3 jam setelah makan.", "Tinggikan posisi bantal saat tidur jika merasakan sensasi panas di dada (heartburn).", "Dapat mengonsumsi antasida sesuai petunjuk kemasan untuk meredakan keasaman lambung sementara."]',
    'Segera periksakan ke dokter jika terdapat muntah berwarna hitam atau bercak darah, BAB berwarna hitam pekat (melena), penurunan berat badan drastis tanpa sebab, atau nyeri ulu hati tembus ke punggung.',
    'Pencegahan kekambuhan maag sangat bergantung pada pola makan teratur dan pengelolaan stres.',
    5, 5, 'ACTIVE', 'Admin Medis TeleHealth'
);

-- 4. Contoh Knowledge Candidates (Untuk Pengujian Fitur Validasi Admin)
INSERT INTO knowledge_candidates (title, type, question_text, proposed_answer, important_points, when_to_see_doctor, doctor_name, status) VALUES
(
    'Tips Mengatasi Batuk Kering Akibat Iritasi Tenggorokan',
    'DOCTOR_RESPONSE',
    'Tenggorokan saya gatal dan batuk kering sudah 2 hari, obat alami apa yang bisa dicoba?',
    'Untuk batuk kering yang disebabkan oleh iritasi tenggorokan ringan atau udara kering, konsumsi 1 sendok madu murni dicampur air lemon hangat dapat membantu melapisi mukosa tenggorokan dan meredakan rasa gatal.',
    '["Minum madu murni 1-2 sendok teh sebelum tidur.", "Hindari makanan gorengan berminyak dan minuman dingin.", "Gunakan humidifier atau pelembap udara di kamar tidur."]',
    'Periksakan ke dokter jika batuk berlangsung lebih dari 2 minggu, disertai batuk berdarah, demam tinggi, atau sesak napas.',
    'Dr. Siti Rahmawati, Sp.PD',
    'PENDING'
),
(
    'Penanganan Awal Nyeri Otot (Myalgia) Pasca Olahraga',
    'JOURNAL',
    'Bagaimana meredakan nyeri otot kram setelah berolahraga berat?',
    'Nyeri otot tunda (DOMS) dapat diredakan dengan metode kompres dingin pada 24 jam pertama, dilanjutkan kompres hangat, hidrasi elektrolit, dan peregangan statis ringan.',
    '["Lakukan peregangan ringan dan jangan langsung istirahat total tanpa pendinginan.", "Kompres es 15 menit jika ada bengkak atau rasa panas.", "Pastikan asupan protein dan air cukup untuk pemulihan jaringan otot."]',
    'Periksakan ke dokter bila nyeri sangat intens hingga tidak bisa menggerakkan anggota gerak atau urine berwarna gelap seperti teh (tanda rhabdomyolysis).',
    'Indonesian Sports Medicine Journal',
    'PENDING'
);
