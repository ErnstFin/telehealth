-- ==========================================================
-- TELEHEALTH INITIAL SEED DATA (PostgreSQL)
-- Standards: Kemenkes RI, IDI, PDEI, PERKENI, PERKI
-- ==========================================================

-- 1. Kategori Kesehatan
INSERT INTO categories (name, slug, description, icon) VALUES
('Flu & Pernapasan', 'flu-pernapasan', 'Infeksi saluran pernapasan akut, pilek, flu, batuk, faringitis, tonsilitis, dan sesak napas.', 'wind'),
('Demam & Infeksi Umum', 'demam-infeksi', 'Kondisi demam, infeksi virus/bakteri/parasit, HIV, sepsis, dan respon peradangan tubuh.', 'thermometer'),
('Sakit Kepala & Neurologi', 'sakit-kepala-neurologi', 'Sakit kepala tegang, sefalgia, stroke, kejang, cedera kepala, dan penurunan kesadaran.', 'brain'),
('Darah & Kardiovaskular', 'darah-kardiovaskular', 'Hipertensi, tekanan darah tinggi, nyeri dada kardiak, infark miokard, dan syok.', 'heart-pulse'),
('Pencernaan & Lambung', 'pencernaan-lambung', 'Gastritis, dispepsia, perdarahan saluran cerna, akut abdomen, dan keracunan makanan.', 'activity'),
('Penyakit Metabolik & Endokrin', 'metabolik-endokrin', 'Diabetes melitus komplikasi/non-komplikasi, hipoglikemia, dan ketoasidosis diabetikum (KAD).', 'droplet'),
('Otot, Sendi & Muskuloskeletal', 'otot-tulang-sendi', 'Mialgia (nyeri otot), osteoartritis/gonartrosis lutut, dan nyeri punggung bawah (LBP).', 'shield'),
('Kulit, Mata & Ginjal', 'kulit-mata-ginjal', 'Dermatitis/eksem, konjungtivitis mata merah, dan gagal ginjal akut (AKI).', 'eye'),
('Umum & Panduan Lain', 'umum-pengetahuan-lain', 'Informasi kesehatan umum, triase klinis, dan panduan multi-disiplin.', 'book')
ON CONFLICT (slug) DO NOTHING;

-- 2. Sumber Terpercaya (Sources - Bebas WHO)
INSERT INTO sources (name, type, publisher, year, url, is_trusted) VALUES
('Panduan Praktik Klinis Dokter di Fasilitas Pelayanan Kesehatan Primer', 'OFFICIAL_GUIDELINE', 'Kementerian Kesehatan RI & PB IDI', 2024, 'https://kemkes.go.id/ppk-dokter-primer', TRUE),
('Pedoman Tatalaksana Kegawatdaruratan Medis & Triase IGD', 'OFFICIAL_GUIDELINE', 'Perhimpunan Dokter Emergency Indonesia (PDEI) & Kemenkes RI', 2024, 'https://kemkes.go.id/pedoman-igd-darurat', TRUE),
('Konsensus Nasional Pengendalian & Pencegahan Diabetes Melitus di Indonesia', 'OFFICIAL_GUIDELINE', 'Perkumpulan Endokrinologi Indonesia (PERKENI)', 2023, 'https://perkeni.org/konsensus-dm', TRUE),
('Pedoman Diagnosis dan Tata Laksana Hipertensi & Kardiovaskular', 'OFFICIAL_GUIDELINE', 'Perhimpunan Dokter Spesialis Kardiovaskular Indonesia (PERKI)', 2024, 'https://inaheart.org/guidelines-hipertensi', TRUE),
('Dr. Siti Rahmawati, Sp.PD (Dokter Spesialis Penyakit Dalam)', 'DOCTOR', 'TeleHealth Medical Panel', 2024, NULL, TRUE);

-- 3. Knowledge Base Tervalidasi (Status: ACTIVE - 36 Diagnoses)
INSERT INTO knowledge (title, topic_keywords, short_answer, important_points, when_to_see_doctor, content_full, category_id, source_id, status, validated_by) VALUES
(
    'Nasofaringitis Akut (Common Cold / Flu)',
    'flu, nasofaringitis, common cold, bersin, hidung tersumbat, ingus jernih, nyeri tenggorokan ringan, demam sumeng, hidung meler, tenggorokan gatal, meriang, masuk angin, pilek, meler, hidung mampet, mengatasi flu, gejala flu awal',
    'Infeksi virus akut pada saluran pernapasan atas yang bisa sembuh sendiri (self-limiting). Menyebabkan peradangan mukosa hidung dan faring.',
    '["Istirahat cukup dan jaga hidrasi tubuh (minum air hangat).", "Obat simtomatik: Parasetamol 3x sehari untuk demam/nyeri, Cetirizin/CTM 2x sehari jika hidung tersumbat berat."]',
    'Segera periksakan ke dokter/faskes jika timbul sesak napas atau napas berbunyi, demam tinggi >39°C lebih dari 3 hari, atau gejala tidak membaik setelah 7-10 hari atau memburuk secara signifikan.',
    'Nasofaringitis akut adalah peradangan pada saluran pernapasan atas yang paling sering disebabkan oleh rhinovirus. Terapi bersifat simtomatik dan suportif.',
    1, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Tekanan Darah Tinggi / Hipertensi (Skrining)',
    'tekanan darah tinggi, tensi tinggi, tensi rendah, skrining tensi, cek tensi tinggi, darah tinggi tanpa gejala, hasil tensimeter naik, skrining darah tinggi, tensi naik',
    'Temuan tekanan darah di luar rentang normal saat pemeriksaan rutin tanpa riwayat atau kriteria diagnostik hipertensi organ sasaran. Perlu pemantauan berkala.',
    '["Evaluasi ulang tensi dengan teknik yang benar setelah istirahat 5-10 menit.", "Batasi asupan garam dan kafein sebelum pemeriksaan.", "Lakukan pemantauan mandiri selama 1 minggu."]',
    'Segera ke IGD terdekat jika tensi sistolik >180 atau diastolik >120 (Krisis Hipertensi), disertai sakit kepala hebat, pandangan kabur, nyeri dada, atau sesak napas mendadak.',
    'Tekanan darah tinggi tanpa gejala memerlukan evaluasi berkala dan konfirmasi berulang.',
    4, 4, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Hipertensi Esensial (Primer)',
    'hipertensi esensial, hipertensi primer, tekanan darah tinggi, tensi diatas 140 90, tengkuk terasa berat, leher belakang tegang kaku, kepala belakang kencang berat, darah tinggi menahun, pusing tengkuk',
    'Peningkatan tekanan darah arterial kronis (>=140/90 mmHg) persisten tanpa penyebab lain yang mendasari. Berisiko menyebabkan komplikasi organ (jantung, otak, ginjal).',
    '["Modifikasi gaya hidup: Diet rendah garam (DASH), olahraga teratur, turunkan berat badan.", "Cari tenaga kesehatan / medis terdekat untuk evaluasi berkala.", "Farmakologis: obat antihipertensi rutin (amlodipin 5 mg 1x sehari / candesartan 8 mg) jika belum pernah berkonsultasi dengan dokter."]',
    'Segera ke IGD terdekat jika timbul nyeri dada khas seperti tertekan/tertindih, kelemahan separuh badan mendadak atau bicara pelo, serta nyeri kepala hebat menetap disertai mual muntah.',
    'Hipertensi esensial mencakup mayoritas kasus hipertensi di faskes primer.',
    4, 4, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Mialgia (Nyeri Otot)',
    'mialgia, nyeri otot, otot pegal, badan pegal linu, pundak kaku, paha sakit, otot sakit setelah aktivitas fisik, badan kaku, nyeri fisik, pegal pegal linu, kram otot, otot tegang',
    'Nyeri pada otot yang disebabkan oleh ketegangan, penggunaan berlebihan (overuse), mikrotrauma, atau respon radang sistemik ringan.',
    '["Istirahatkan otot yang sakit, kompres hangat atau dingin.", "Lakukan peregangan ringan (stretching).", "Farmakologis: Parasetamol 3x sehari untuk meredakan nyeri."]',
    'Segera ke fasilitas medis jika kelemahan otot berat hingga tidak bisa bergerak, urin berwarna gelap cokelat/seperti teh (curiga rhabdomyolysis), atau bengkak dan kemerahan lokal yang makin meluas.',
    'Mialgia sering terjadi pasca aktivitas berat dan merespon baik terhadap istirahat dan analgetik ringan.',
    7, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Penyakit HIV (Infeksi Vaskular & Parasitik)',
    'hiv, infeksi vaskular parasitik, demam kronis berulang, demam hilang timbul sebulan, penurunan berat badan drastis, lidah putih, sariawan jamur lidah, diare lama sebulan, infeksi oportunistik, candida mulut',
    'Infeksi Human Immunodeficiency Virus yang menginfeksi sel imun (CD4), menyebabkan penurunan daya tahan tubuh dan rentan terhadap infeksi oportunistik.',
    '["Segera berkonsultasi ke tenaga kesehatan / medis terdekat atau klinik VCT untuk pemeriksaan darah khusus.", "Inisiasi terapi Antiretroviral (ARV) sedini mungkin untuk menjaga kadar CD4 dan menekan replikasi virus."]',
    'Segera ke IGD terdekat jika timbul sesak napas berat (curiga pneumonia PCP/TB), penurunan kesadaran atau kejang, serta nyeri kepala hebat disertai kaku kuduk.',
    'HIV memerlukan pendampingan medis jangka panjang dan pengobatan antiretroviral teratur.',
    2, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Demam Tanpa Penyebab Yang Jelas',
    'demam tanpa penyebab jelas, suhu diatas 37.5, badan menggigil, lemas meriang, sumeng, demam meriang panas, suhu tubuh tinggi belum jelas, panas dingin badan, demam naik turun',
    'Peningkatan suhu tubuh di atas nilai normal (>37.5°C) di mana penyebab spesifiknya belum teridentifikasi pada evaluasi awal dan memerlukan observasi lanjutan.',
    '["Kompres hangat pada lipatan tubuh (aksila/inguinal) dan jaga asupan cairan cukup.", "Farmakologis: Parasetamol 500 mg tiap 6-8 jam bila suhu meningkat.", "Pantau pola demam dan tanda vital harian."]',
    'Segera ke IGD jika demam >39°C yang tidak turun dengan antipiretik, muncul bintik merah/perdarahan pada kulit (petechiae), atau kejang / penurunan kesadaran / gelisah.',
    'Evaluasi pola demam sangat krusial untuk menegakkan diagnosis spesifik.',
    2, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Diabetes Melitus Tipe 2 dengan Komplikasi',
    'diabetes melitus komplikasi, dm tipe 2 komplikasi, kencing manis luka lama, banyak pipis makan minum, luka sulit sembuh, kaki baal tebal, kaki kesemutan, neuropati diabetik, gangren kaki, lemas mengantuk diabetes',
    'Gangguan metabolik kronis akibat resistensi insulin disertai adanya komplikasi vaskular/neuropati yang memerlukan penanganan terpadu.',
    '["Pemantauan kadar gula darah mandiri secara berkala.", "Segera cari tenaga kesehatan / medis terdekat untuk berkonsultasi mengenai pengobatan terpadu.", "Farmakologis: Obat Anti-Hiperglikemia Oral (Metformin, Glibenklamid) atau Insulin sesuai anjuran tenaga medis."]',
    'Segera ke IGD terdekat jika kadar gula darah >300 mg/dL atau <70 mg/dL, napas cepat dan dalam (Kussmaul) atau berbau buah (aseton), serta luka membusuk/gangren pada kaki yang meluas cepat.',
    'Komplikasi neuropati dan vaskulopati memerlukan kontrol glikemik ketat dan perawatan kaki.',
    6, 3, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Gonartrosis (Osteoartritis Lutut)',
    'gonartrosis, osteoartritis lutut, radang sendi lutut, nyeri lutut jalan jauh tangga, kaku sendi pagi hari, bunyi krek saat ditekuk, krepitasi lutut, susah berdiri, lutut bengkak, nyeri sendi lutut',
    'Penyakit degeneratif sendi lutut yang ditandai dengan kerusakan tulang rawan sendi, pembentukan osteofit, dan penyempitan celah sendi.',
    '["Kurangi beban sendi: Turunkan berat badan, hindari berlutut/jongkok lama.", "Lakukan latihan penguatan otot kuadrisep paha berintensitas rendah.", "Farmakologis: Parasetamol/NSAID topikal atau oral saat nyeri kambuh."]',
    'Segera ke IGD/faskes jika sendi lutut bengkak hebat, merah, dan panas (curiga arthritis septik), tidak mampu menumpu beban sama sekali mendadak, atau kelainan bentuk sendi memburuk cepat.',
    'Osteoartritis genu merupakan penyebab umum disabilitas muskuloskeletal pada usia lanjut.',
    7, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Dispepsia Non-Ulser',
    'dispepsia non-ulser, dispepsia, nyeri ulu hati, rasa terbakar ulu hati, cepat kenyang, kembung begah mual setelah makan, maag fungsional, lambung perih begah, perut tidak nyaman setelah makan',
    'Kumpulan gejala rasa tidak nyaman pada perut bagian atas tanpa adanya kelainan struktural pada pemeriksaan endoskopi rutin.',
    '["Modifikasi pola makan: Porsi kecil tapi sering, hindari pedas, asam, kopi, dan stres.", "Hindari berbaring dalam 2 jam setelah makan.", "Farmakologis: Antasida, H2 blocker (Ranitidin), atau PPI (Omeprazole)."]',
    'Segera ke IGD terdekat jika muntah hitam seperti bubuk kopi atau BAB berwarna hitam pekat (melena), penurunan berat badan drastis tanpa sebab jelas, atau sulit menelan (disfagia) / nyeri menelan.',
    'Dispepsia fungsional memerlukan modifikasi gaya hidup dan manajemen asam lambung.',
    5, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Diabetes Melitus Tipe 2 Tanpa Komplikasi',
    'diabetes tipe 2 tanpa komplikasi, sering kencing poliuria, sering haus polidipsia, sering lapar polifagia, bb turun tanpa sebab, kencing manis lemas, haus terus lapar terus, kencing malam hari',
    'Gangguan metabolik kronis yang ditandai dengan tingginya gula dalam darah akibat hormon insulin tidak diserap tubuh atau hormon insulin tidak dibuat oleh pankreas.',
    '["Perubahan pola hidup: Makan rendah gula, olahraga 150 menit/minggu.", "Pemantauan kadar gula darah mandiri secara berkala.", "Segera cari tenaga kesehatan / medis terdekat untuk berkonsultasi mengenai obat anti-hiperglikemia oral (Metformin, Glibenklamid) atau insulin."]',
    'Segera ke IGD jika timbul gejala gula rendah berat (gemetar, keringat dingin, bingung), kadar gula darah puasa persisten >200 mg/dL, atau adanya luka pada bagian tubuh yang tidak kunjung sembuh.',
    'Pencegahan komplikasi sekunder dicapai dengan regulasi gula darah dan aktivitas teratur.',
    6, 3, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Faringitis Akut (Sakit Tenggorokan)',
    'faringitis akut, sakit tenggorokan, nyeri menelan, tenggorokan merah, bercak putih tenggorokan, leher agak bengkak, demam menelan, radang tenggorokan, tenggorokan sakit menelan',
    'Peradangan mukosa faring yang kebanyakan disebabkan oleh infeksi virus tetapi juga mungkin akibat bakteri.',
    '["Kumur air garam hangat, hindari makanan iritatif/es.", "Perbanyak konsumsi cairan hangat.", "Farmakologis: Analgesik/Antipiretik (Parasetamol/Ibuprofen).", "Konsultasi dengan tenaga kesehatan / medis terdekat apakah perlu antibiotik."]',
    'Segera ke IGD terdekat jika kesulitan bernapas atau suara serak berat, sulit membuka mulut (trismus), sulit menelan ludah, atau pembengkakan leher yang tidak rata kiri dan kanan.',
    'Faringitis akut umumnya bersifat swasirna kecuali ada kecurigaan bakteri streptokokus.',
    1, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Eksem (Dermatitis)',
    'eksem, eksim, dermatitis, kulit kemerahan, gatal hebat kulit, kulit kering bersisik, bentol berair, digaruk makin perih, bintik berair merah, alergi kulit gatal',
    'Peradangan non-infeksius pada kulit yang ditandai dengan kemerahan, gatal, dan lentingan atau bercak akibat berbagai macam faktor.',
    '["Gunakan pelembab kulit (emolien) secara teratur, hindari sabun berbahan keras.", "Hindari garukan berlebih untuk mencegah infeksi sekunder.", "Konsultasi dengan tenaga kesehatan / medis untuk penggunaan obat salep khusus."]',
    'Segera ke IGD jika ruam meluas ke seluruh tubuh disertai demam, kulit melepuh luas atau terkelupas (curiga reaksi obat berat/SJS), tanda infeksi lebih berat berupa nanah dan nyeri hebat, atau bercak putih mati rasa.',
    'Penatalaksanaan eksem menitikberatkan pada perlindungan sawar hidrasi kulit.',
    8, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Nyeri Punggung Bawah (Low Back Pain)',
    'nyeri punggung bawah, low back pain, lbp, pinggang bawah pegal sakit, kaku membungkuk, sakit berdiri lama, sakit habis angkat benda berat, pinggang encok, sakit pinggang bawah',
    'Nyeri yang dirasakan di daerah punggung bawah atau area atas pantat akibat ketegangan otot, ligamen, atau kelainan sendi/diskus intervertebralis.',
    '["Latihan penguatan otot punggung (core training) dan edukasi posisi ergonomis.", "Kompres hangat pada area pinggang yang kaku.", "Farmakologis: Parasetamol 500 mg 3x sehari.", "Jika masih dirasa nyeri perlu tenaga kesehatan / medis untuk konsultasi mengenai pengobatan."]',
    'Segera ke IGD jika nyeri menjalar ke kaki disertai kesemutan/kelemahan otot, gangguan Buang Air Besar atau Buang Air Kecil atau kebas area selangkangan (saddle anesthesia), atau riwayat trauma berat / kanker.',
    'LBP mekanik memerlukan rehabilitasi postur dan istirahat aktif.',
    7, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Gastritis dan Duodenitis',
    'gastritis dan duodenitis, gastritis, duodenitis, nyeri perih ulu hati melilit, ulu hati terbakar, telat makan perih, makan pedas asam perih, mual kembung penuh lambung, sakit maag asam lambung',
    'Peradangan pada bagian lambung dan usus dua belas jari yang disebabkan oleh asam lambung berlebih, penggunaan NSAID kronis, atau infeksi H. pylori.',
    '["Makan teratur porsi kecil, hindari kopi, alkohol, makanan pedas dan berlemak.", "Hentikan penggunaan obat anti-nyeri NSAID tanpa resep.", "Konsultasi dengan tenaga kesehatan / medis mengenai pengobatan penetral atau penekan asam lambung."]',
    'Segera ke IGD jika BAB berwarna hitam seperti ter (melena) atau muntah darah, nyeri perut hebat mendadak yang tembus ke punggung, serta anemia berat (pucat, lemas, pusing berputar).',
    'Kerusakan mukosa lambung dan duodenum dipicu hiperasiditas dan paparan zat iritan.',
    5, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Infeksi Saluran Napas Atas Akut (ISPA)',
    'ispa, infeksi saluran napas atas akut, batuk pilek serentak, nyeri tenggorokan demam meriang, demam ringan sumeng batuk pilek, infeksi hidung faring laring, batuk pilek meriang',
    'Infeksi akut yang melibatkan beberapa organ saluran pernapasan atas sekaligus (hidung, faring, laring) yang umumnya disebabkan oleh virus.',
    '["Istirahat cukup, minum air putih hangat, konsumsi vitamin C.", "Parasetamol 500 mg 3x sehari jika demam/meriang.", "Konsultasi dengan tenaga kesehatan / medis mengenai pengobatan."]',
    'Segera ke IGD terdekat jika timbul sesak napas atau retraksi dinding dada, demam tinggi persisten >3 hari, atau sianosis (kebiruan pada bibir atau kuku).',
    'ISPA meliputi spektrum peradangan hidung hingga saluran trakeobronkial proksimal.',
    1, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Sakit Kepala Tipe Tegang (Tension-Type Headache)',
    'sakit kepala tipe tegang, tension-type headache, tension headache, kepala diikat kencang dahi leher, cengkeram kedua sisi kepala, kaku otot leher, sakit kepala tegang, pusing tegang leher',
    'Kumpulan gangguan sakit kepala primer non-migrain yang umumnya terkait dengan stres, ketegangan otot leher, atau kelelahan mata.',
    '["Istirahat di ruangan tenang, kelola stres, dan pijat ringan otot leher/bahu.", "Hidrasi dan batasi penggunaan gadget berlebih.", "Farmakologis: Parasetamol 500 mg 3x sehari."]',
    'Segera ke IGD jika sakit kepala timbul mendadak dan sangat hebat, disertai demam tinggi, kaku kuduk, atau kejang, serta disertai kelemahan anggota gerak atau kebingungan.',
    'Sakit kepala tegang bilateral merespon efektif terhadap relaksasi dan hidrasi.',
    3, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Tonsilitis Akut (Amandel)',
    'tonsilitis akut, radang amandel, amandel membesar bengkak merah, bercak putih amandel, amandel ada warna putih kuning, nyeri menelan berat amandel, demam tinggi amandel, amandel bengkak',
    'Peradangan akut pada amandel akibat infeksi virus atau bakteri (Streptococcus), sering terjadi pada anak-anak dan remaja.',
    '["Istirahat, makan makanan bertekstur lunak dan tidak merangsang.", "Kumur antiseptik/air garam hangat.", "Parasetamol 500 mg 3x sehari jika demam.", "Konsultasi ke tenaga kesehatan / medis untuk pengobatan lebih lanjut."]',
    'Segera ke IGD jika kesulitan bernapas atau ngorok hebat saat tidur, tidak bisa menelan makanan/cairan sama sekali, atau pembengkakan leher hebat atau abses peritonsil.',
    'Tonsilitis akut memerlukan pemantauan potensi komplikasi peritonsilar.',
    1, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Konjungtivitis (Mata Merah)',
    'konjungtivitis, mata merah, belekan mata, belek kuning jernih, mata gatal terasa ganjal ganjil, mata berair bangun tidur lengket kotoran, radang konjungtiva, mata belekan lengket',
    'Peradangan pada lapisan konjungtiva mata akibat infeksi virus, bakteri, atau reaksi alergi. Sangat menular jika disebabkan oleh infeksi.',
    '["Jaga kebersihan mata, hindari mengucek mata, dan cuci tangan teratur.", "Kompres dingin/hangat sesuai penyebab.", "Perlu konsultasi tenaga kesehatan / medis untuk pengobatan lebih lanjut.", "Farmakologis: Tetes mata antibiotik (bakteri) atau Tetes mata antihistamin/air mata buatan sesuai dengan anjuran dokter."]',
    'Segera periksakan ke dokter spesialis mata / IGD jika penglihatan kabur mendadak, nyeri mata berat atau silau berlebih (fotofobia), atau terdapat kekeruhan pada kornea.',
    'Konjungtivitis mudah menular lewat kontak sekret mata.',
    8, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Batuk',
    'batuk berdahak, batuk kering, gatal di tenggorokan batuk, batuk terus menerus 4 hari, dada pegal batuk tanpa sesak, obat batuk, batuk akut, mengatasi batuk',
    'Refleks pertahanan saluran napas untuk membersihkan sekret atau iritan. Merupakan gejala dari berbagai kondisi respiratori.',
    '["Minum air hangat, hindari es, makanan berminyak, dan asap rokok.", "Madu dan lemon untuk meredakan iritasi tenggorokan.", "Farmakologis: Ekspektoran (Guaifenesin) untuk batuk berdahak, Antitusif (Dextromethorphan) untuk batuk kering."]',
    'Segera ke fasilitas kesehatan jika batuk berdarah (hemoptisis), batuk menetap lebih dari 2-3 minggu (curiga TB/keganasan), atau disertai penurunan berat badan drastis dan keringat malam.',
    'Evaluasi kronisitas batuk membantu membedakan batuk akut dari tuberkulosis paru.',
    1, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Sakit Kepala (Cephalgia)',
    'sakit kepala, pusing, pusing cekot-cekot sejak pagi, nyeri di kepala, rasa tidak nyaman di kepala, kepala sakit cekot cekot, sakit kepala biasa, migrain umum',
    'Sintom nyeri pada regio kepala yang dapat bersifat primer (TTH, migrain) atau sekunder akibat penyakit sistemik/lokal lain.',
    '["Istirahat cukup di ruangan redup dan tenang.", "Pastikan kecukupan cairan dan pola makan teratur.", "Farmakologis: Parasetamol 500 mg."]',
    'Segera ke IGD terdekat jika nyeri kepala memberat progresif dari hari ke hari, terjadi pasca trauma kepala berat, atau disertai defisit neurologis fokal (mulut merot, bicara pelo).',
    'Cephalgia adalah gejala umum yang memerlukan penyingkiran tanda kegawatan intrakranial.',
    3, 1, 'ACTIVE', 'Admin Medis TeleHealth'
),
-- Gawat Darurat (15 Item)
(
    'Nyeri Dada Tidak Spesifik (Chest Pain Akut)',
    'nyeri dada tidak spesifik, chest pain, dada tertindih beban berat agak sesak, nyeri dada tumpul tajam, sensasi tertekan dada bernapas aktivitas, dada sesak setengah jam, nyeri dada darurat',
    'Gejala nyeri dada yang memerlukan evaluasi cepat untuk menyingkirkan sindrom koroner akut, diseksi aorta, atau emboli paru.',
    '["Gawat Darurat! Segera ke IGD RS terdekat.", "Posisikan pasien istirahat total (tirah baring) setengah duduk.", "Jangan memberikan makanan/minuman berlebih."]',
    'KONDISI GAWAT DARURAT SEGERA KE IGD: Nyeri dada menjalar ke lengan kiri, leher, atau rahang; Disertai keringat dingin, mual, dan sesak napas berat; Riwayat penyakit jantung koroner atau faktor risiko tinggi.',
    'Semua nyeri dada akut dievaluasi sebagai kegawatan kardiovaskular sampai terbukti sebaliknya.',
    4, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Dispnea (Sesak Napas Akut)',
    'dispnea, sesak napas akut, sangat sesak napas, tidak bisa menarik udara paru-paru, laju napas meningkat, napas cuping hidung, otot bantu napas, sianosis sesak, napas tersengal darurat',
    'Ketidakmampuan bernapas secara adekuat yang menandakan gangguan oksigenasi atau ventilasi berat (kardiak/pulmonal).',
    '["Gawat Darurat! Segera bawa ke IGD Rumah Sakit terdekat.", "Posisikan setengah duduk (Fowler) untuk membantu ekspansi paru.", "Longgarkan pakaian yang ketat di area leher dan dada."]',
    'KONDISI GAWAT DARURAT SEGERA KE IGD: Bibir dan ujung jari kebiruan (sianosis); Penurunan kesadaran atau pasien tampak sangat gelisah; Tidak bisa mengucapkan satu kalimat utuh karena sesak.',
    'Dispnea akut membutuhkan terapi oksigen aliran tinggi dan monitor saturasi segera.',
    1, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Koma / Penurunan Kesadaran',
    'koma, penurunan kesadaran, tidak bisa dibangunkan sama sekali, napas perlahan tidak sadar, tidak merespon panggilan atau rangsangan nyeri, pingsan lama, tidak sadar diri',
    'Kondisi ketidaksadaran menetap akibat disfungsi serebral difus atau gangguan batang otak yang mengancam jiwa.',
    '["Gawat Darurat Utama! Segera panggil ambulans / IGD.", "Amankan jalan napas (posisi miring mantap jika muntah).", "Cek napas dan nadi; siap lakukan RJP jika henti napas/nadi."]',
    'KONDISI KRITIS DARURAT SEGERA KE IGD: Henti napas atau pola napas ireguler; Manifestasi kejang berulang; Pupil anisokor (besar sebelah) atau tidak merespon cahaya.',
    'Proteksi jalan napas dan resusitasi ABC adalah tindakan utama pada koma.',
    3, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Kejang / Konvulsi',
    'kejang, konvulsi, mendadak kejang-kejang, mulut berbusa kejang, tidak sadarkan diri kejang, kekakuan tubuh mendadak, hentakan otot seluruh tubuh, mata mendelik, lidah tergigit, ayan, pingsan kejang',
    'Aktivitas listrik otak yang tidak normal dan berlebihan, memicu gangguan motorik, sensorik, atau kesadaran mendadak.',
    '["Gawat Darurat! Longgarkan pakaian, baringkan di tempat aman.", "JANGAN memasukkan benda apapun ke dalam mulut pasien.", "Miringkan posisi tubuh pasien setelah kejang berhenti agar cairan tidak menyumbat jalan napas."]',
    'KONDISI KRITIS DARURAT SEGERA KE IGD: Kejang berlangsung lebih dari 5 menit (Status Epileptikus); Kejang berulang tanpa pemulihan kesadaran di antaranya; Disertai demam sangat tinggi atau cedera kepala.',
    'Kejang tonik klonik akut memerlukan proteksi trauma kepala dan terminasi obat antikonvulsan.',
    3, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Infark Miokard Akut (Serangan Jantung)',
    'infark miokard akut, serangan jantung, dada kiri diremas ditekan hebat, menjalar ke lengan dan leher, keringat dingin membasuhi baju, nyeri dada lebih 20 menit, tembus ke belakang punggung, gelisah serangan jantung',
    'Nekrosis otot jantung akibat oklusi mendadak pada arteri koroner. Merupakan salah satu penyebab kematian mendadak tertinggi.',
    '["Gawat Darurat Utama! Segera ke IGD fasilitas yang memiliki faskes PCI/Layanan Jantung.", "Tirah baring total, berikan Aspirin kunyah jika tersedia dan dianjurkan petugas."]',
    'KONDISI KRITIS SEGERA KE IGD: Henti jantung mendadak; Tekanan darah drop drastis (syok kardiogenik); Aritmia/jantung berdebar sangat cepat dan tidak teratur.',
    'Sindrom koroner akut membutuhkan revaskularisasi emergensi secepatnya.',
    4, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Stroke Akut (Iskemik / Perdarahan)',
    'stroke akut, stroke iskemik, stroke perdarahan, tangan kaki kanan lemas tidak bisa diangkat, mulut merot mencong, bicara pelo mendadak, kelemahan separuh badan mendadak, lumpuh sebelah',
    'Defisit neurologis fokal akut akibat penyumbatan atau pecahnya pembuluh darah otak. Golden period tindakan <4.5 jam.',
    '["Gawat Darurat Utama! Segera ke RS dengan fasilitas CT Scan.", "Catat WAKTU PASTI onset gejala muncul.", "Jangan berikan obat penurun tensi atau makanan/minuman oral."]',
    'KONDISI KRITIS SEGERA KE IGD: Penurunan kesadaran secara cepat; Muntah menyembur atau kejang; Nyeri kepala hebat yang timbul mendadak.',
    'Setiap menit penundaan stroke memicu hilangnya jutaan neuron serebral.',
    3, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Gagal Napas Akut',
    'gagal napas akut, saturasi oksigen dibawah 90, napas cepat dangkal lebih 30 kali, bibir mulai biru, megap-megap kehabisan udara, dada naik turun cepat, bibir biru, ujung tangan biru sianosis',
    'Kegagalan sistem respirasi dalam mempertahankan pertukaran gas O2 dan CO2 yang adekuat untuk memenuhi kebutuhan metabolik.',
    '["Gawat Darurat Utama! Segera evakuasi ke IGD RS.", "Berikan bantuan ventilasi/oksigenasi tekanan tinggi segera."]',
    'KONDISI KRITIS SEGERA KE IGD: Henti napas (apnea); Sianosis berat seluruh tubuh; Gelisah hebat diikuti letargi/koma.',
    'Gagal napas membutuhkan intervensi jalan napas dan ventilasi mekanik invasif/noninvasif.',
    1, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Sepsis',
    'sepsis, badan menggigil hebat demam tinggi, denyut jantung kencang nafas cepat, linglung disorientasi, tekanan darah turun infeksi, badan pasien menggigil linglung',
    'Disfungsi organ yang mengancam jiwa yang disebabkan oleh respon imun tubuh yang tidak teratur terhadap infeksi.',
    '["Gawat Darurat! Perlu perawatan intensif (ICU/HCU) dan antibiotik IV spektrum luas segera di IGD."]',
    'KONDISI KRITIS SEGERA KE IGD: Tekanan darah drop tidak respon cairan (Syok Septik); Produksi urin sangat sedikit/tidak ada (akut oliguria); Kesadaran makin menurun/delirium.',
    'Penanganan sepsis sedini mungkin mencegah progresi ke arah disfungsi multiorgan.',
    2, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Syok (Unspecified)',
    'syok, tekanan darah dibawah 90, ujung jari tangan kaki dingin basah, nadi cepat lemah halus, kulit dingin pucat basah, lemas berat tidak bisa berdiri, tensi drop drastis',
    'Kegagalan sirkulasi sistemik akut yang mengakibatkan perfusi jaringan dan oksigenasi selular tidak adekuat.',
    '["Gawat Darurat Utama! Baringkan terlentang dengan posisi kaki lebih tinggi (posisi Trendelenburg).", "Segera bawa ke IGD untuk resusitasi cairan intravena."]',
    'KONDISI KRITIS SEGERA KE IGD: Penurunan kesadaran total; Anuria (tidak ada urin); Henti jantung.',
    'Resusitasi cairan dan monitoring tanda vital ketat merupakan pilar utama penanganan syok.',
    4, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Hipoglikemia Akut',
    'hipoglikemia akut, gula darah dibawah 70, mendadak gemetar hebat keringat dingin linglung, pusing bingung jantung berdebar diabetes, syok gula darah rendah',
    'Kadar glukosa darah berada di bawah tingkat normal (<70 mg/dL), memicu respon simpatis dan neuroglikopenia yang mengancam otak.',
    '["Jika SADAR: Berikan minum air gula/teh manis (15-20 gram glukosa).", "Jika TIDAK SADAR: JANGAN masukkan cairan ke mulut. Bawa segera ke IGD untuk IV Dextrose 40%."]',
    'KONDISI KRITIS SEGERA KE IGD: Kejang hipoglikemia; Penurunan kesadaran / koma hipoglikemik; Gula darah tidak naik setelah pemberian gula oral.',
    'Hipoglikemia membutuhkan koreksi glukosa cepat untuk melindungi fungsi korteks serebral.',
    6, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Ketoasidosis Diabetikum (KAD)',
    'ketoasidosis diabetikum, kad, gula darah tinggi diatas 250, napas berbau manis buah aseton, napas kussmaul cepat dalam, muntah terus gula darah tinggi, dehidrasi diabetes',
    'Komplikasi akut diabetes melitus akibat defisiensi insulin berat yang memicu akumulasi badan keton dan asidosis metabolik.',
    '["Gawat Darurat! Segera ke IGD untuk rehidrasi cairan IV masif dan infus insulin kontinu."]',
    'KONDISI KRITIS SEGERA KE IGD: Penurunan kesadaran / koma ketoasidosis; Dehidrasi berat dengan syok; Gangguan elektrolit berat.',
    'KAD memerlukan hidrasi cairan agresif dan protokol insulin kontinu dengan monitoring kalium.',
    6, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Perdarahan Saluran Cerna Akut',
    'perdarahan saluran cerna akut, muntah darah segar, muntah cairan hitam bubuk kopi, bab berwarna hitam aspal, melena, buang air besar hitam lengket pucat lemas, pendarahan lambung',
    'Perdarahan akut pada saluran cerna atas atau bawah yang berisiko memicu anemia akut dan syok hipovolemik.',
    '["Gawat Darurat! Puasakan pasien total (jangan beri makan/minum).", "Bawa ke IGD untuk pemasangan NGT, resusitasi cairan, dan persiapan transfusi/endoskopi."]',
    'KONDISI KRITIS SEGERA KE IGD: Perdarahan masif terus menerus; Pingsan / syok hipovolemik (tensi drop, nadi cepat); Pucat ekstrem disertai sesak napas.',
    'Hematemesis dan melena memerlukan hemostasis endoskopik dan proteksi hemodinamik.',
    5, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Gagal Ginjal Akut (AKI)',
    'gagal ginjal akut, aki, kencing sedikit pipis sedikit, tidak bisa pipis kencing tidak keluar, kaki wajah bengkak kencing macet, mual muntah sesak ginjal, kencing tidak keluar kemarin',
    'Penurunan fungsi ginjal secara mendadak yang menyebabkan retensi sisa metabolik nitrogen dan gangguan keseimbangan cairan/elektrolit.',
    '["Gawat Darurat! Segera ke fasilitas kesehatan untuk evaluasi fungsi ginjal dan hidrasi terkontrol."]',
    'KONDISI KRITIS SEGERA KE IGD: Sesak napas berat akibat edem paru (penumpukan cairan di paru); Kadar Kalium sangat tinggi (Hiperkalemia) berisiko henti jantung; Penurunan kesadaran uremik.',
    'Gagal ginjal akut membutuhkan investigasi penyebab etiologis dan koreksi hiperkalemia.',
    8, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Cedera Kepala Berat / Intrakranial',
    'cedera kepala berat, intrakranial, jatuh membentur kepala pingsan, pingsan 10 menit setelah kecelakaan, muntah menyembur bingung kepala, hilang ingatan jatuh kepala, gegar otak berat',
    'Kerusakan struktur otak akibat gaya mekanis luar yang memicu perdarahan intrakranial atau edema serebral.',
    '["Gawat Darurat Utama! Imobilisasi leher (pasang cervical collar jika ada suspect fraktur servikal).", "Bawa segera ke IGD RS dengan CT Scan."]',
    'KONDISI KRITIS SEGERA KE IGD: Pupil mata tidak sama besar (anisokor); Keluar cairan bening/darah dari hidung atau telinga; Kejang post-trauma atau GCS terus menurun.',
    'Cedera kepala berat memerlukan evaluasi neurobedah cito dan kontrol tekanan intrakranial.',
    3, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
(
    'Akut Abdomen',
    'akut abdomen, sakit perut hebat sekali tidak bisa disentuh, perut kaku seperti papan, tegang kaku tidak bisa kentut, mual muntah berat perut sakit, perut keras papan disentuh',
    'Kondisi intraabdominal akut yang memerlukan tindakan bedah darurat segera (misal: perforasi gaster, peritonitis, ileus strangulasi).',
    '["Gawat Darurat! Puasakan pasien total (jangan diberi makan/minum/obat cacing/pencahar).", "Segera konsultasi Bedah di IGD RS terdekat."]',
    'KONDISI KRITIS SEGERA KE IGD: Tanda peritonitis (perut kaku papan / rebound tenderness); Demam tinggi disertai syok septik; Muntah faekal (berbau kotoran).',
    'Perut papan (defans muskular) menunjukkan peritonitis akut yang membutuhkan intervensi laparotomi cito.',
    5, 2, 'ACTIVE', 'Admin Medis TeleHealth'
),
-- Tambahan Medis Bermanfaat (1 Item)
(
    'Keracunan Makanan (Food Poisoning)',
    'keracunan makanan, keracunan, makanan basi, sakit perut sehabis makan, mual muntah sehabis makan basi, diare muntah berak, intoksikasi makanan, muntaber, keracunan udang makanan kaleng',
    'Kondisi gangguan pencernaan akut akibat mengonsumsi makanan atau minuman yang terkontaminasi oleh bakteri, toksin mikroba, virus, atau zat kimia beracun.',
    '["Cegah dehidrasi dengan segera meminum larutan oralit atau cairan elektrolit sedikit demi sedikit secara sering.", "Konsumsi makanan lunak yang mudah dicerna (bubur polos, pisang, roti tawar) setelah frekuensi muntah berkurang.", "Dapat mengonsumsi tablet karbon aktif (norit) sesuai dosis kemasan bila baru saja menelan makanan yang dicurigai terkontaminasi."]',
    'Segera ke IGD terdekat jika muntah terus-menerus hingga tidak ada cairan yang masuk sama sekali, diare berdarah pekat, demam tinggi >38.5°C, pusing lemas berat berkunang-kunang (dehidrasi berat), atau timbul gangguan penglihatan / kelemahan otot (toksin saraf).',
    'Intoksikasi makanan akut memerlukan hidrasi elektrolit dini untuk mencegah syok hipovolemik.',
    5, 1, 'ACTIVE', 'Admin Medis TeleHealth'
);
