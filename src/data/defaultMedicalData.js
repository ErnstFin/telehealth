/**
 * Default Medical Knowledge & Clinical Diagnoses Dataset
 * Replaces old baseline knowledge with:
 * - 20 Rawat Jalan & Non-Z Utama diagnoses
 * - 15 Gawat Darurat (Emergency) diagnoses
 * - 1 Practical medical topic: Keracunan Makanan (Food Poisoning)
 * Completely eliminates old WHO entries in favor of Kemenkes RI, IDI, PDEI, PERKENI, and PERKI guidelines.
 */

const DEFAULT_CATEGORIES = [
    {
        id: 1,
        name: 'Flu & Pernapasan',
        slug: 'flu-pernapasan',
        description: 'Infeksi saluran pernapasan akut, pilek, flu, batuk, faringitis, tonsilitis, dan sesak napas.',
        icon: 'wind'
    },
    {
        id: 2,
        name: 'Demam & Infeksi Umum',
        slug: 'demam-infeksi',
        description: 'Kondisi demam, infeksi virus/bakteri/parasit, HIV, sepsis, dan respon peradangan tubuh.',
        icon: 'thermometer'
    },
    {
        id: 3,
        name: 'Sakit Kepala & Neurologi',
        slug: 'sakit-kepala-neurologi',
        description: 'Sakit kepala tegang, sefalgia, stroke, kejang, cedera kepala, dan penurunan kesadaran.',
        icon: 'brain'
    },
    {
        id: 4,
        name: 'Darah & Kardiovaskular',
        slug: 'darah-kardiovaskular',
        description: 'Hipertensi, tekanan darah tinggi, nyeri dada kardiak, infark miokard, dan syok.',
        icon: 'heart-pulse'
    },
    {
        id: 5,
        name: 'Pencernaan & Lambung',
        slug: 'pencernaan-lambung',
        description: 'Gastritis, dispepsia, perdarahan saluran cerna, akut abdomen, dan keracunan makanan.',
        icon: 'activity'
    },
    {
        id: 6,
        name: 'Penyakit Metabolik & Endokrin',
        slug: 'metabolik-endokrin',
        description: 'Diabetes melitus komplikasi/non-komplikasi, hipoglikemia, dan ketoasidosis diabetikum (KAD).',
        icon: 'droplet'
    },
    {
        id: 7,
        name: 'Otot, Sendi & Muskuloskeletal',
        slug: 'otot-tulang-sendi',
        description: 'Mialgia (nyeri otot), osteoartritis/gonartrosis lutut, dan nyeri punggung bawah (LBP).',
        icon: 'shield'
    },
    {
        id: 8,
        name: 'Kulit, Mata & Ginjal',
        slug: 'kulit-mata-ginjal',
        description: 'Dermatitis/eksem, konjungtivitis mata merah, dan gagal ginjal akut (AKI).',
        icon: 'eye'
    },
    {
        id: 9,
        name: 'Umum & Panduan Lain',
        slug: 'umum-pengetahuan-lain',
        description: 'Informasi kesehatan umum, triase klinis, dan panduan multi-disiplin.',
        icon: 'book'
    }
];

const DEFAULT_SOURCES = [
    {
        id: 1,
        name: 'Panduan Praktik Klinis Dokter di Fasilitas Pelayanan Kesehatan Primer',
        type: 'OFFICIAL_GUIDELINE',
        publisher: 'Kementerian Kesehatan RI & PB IDI',
        year: 2024,
        url: 'https://kemkes.go.id/ppk-dokter-primer',
        is_trusted: true
    },
    {
        id: 2,
        name: 'Pedoman Tatalaksana Kegawatdaruratan Medis & Triase IGD',
        type: 'OFFICIAL_GUIDELINE',
        publisher: 'Perhimpunan Dokter Emergency Indonesia (PDEI) & Kemenkes RI',
        year: 2024,
        url: 'https://kemkes.go.id/pedoman-igd-darurat',
        is_trusted: true
    },
    {
        id: 3,
        name: 'Konsensus Nasional Pengendalian & Pencegahan Diabetes Melitus di Indonesia',
        type: 'OFFICIAL_GUIDELINE',
        publisher: 'Perkumpulan Endokrinologi Indonesia (PERKENI)',
        year: 2023,
        url: 'https://perkeni.org/konsensus-dm',
        is_trusted: true
    },
    {
        id: 4,
        name: 'Pedoman Diagnosis dan Tata Laksana Hipertensi & Kardiovaskular',
        type: 'OFFICIAL_GUIDELINE',
        publisher: 'Perhimpunan Dokter Spesialis Kardiovaskular Indonesia (PERKI)',
        year: 2024,
        url: 'https://inaheart.org/guidelines-hipertensi',
        is_trusted: true
    },
    {
        id: 5,
        name: 'Dr. Siti Rahmawati, Sp.PD (Dokter Spesialis Penyakit Dalam)',
        type: 'DOCTOR',
        publisher: 'TeleHealth Medical Panel',
        year: 2024,
        url: null,
        is_trusted: true
    }
];

const DEFAULT_KNOWLEDGE = [
    // --- 1. Rawat Jalan & Non-Z Utama (20 Item) ---
    {
        id: 1,
        title: 'Nasofaringitis Akut (Common Cold / Flu)',
        topic_keywords: 'flu, nasofaringitis, common cold, bersin, hidung tersumbat, ingus jernih, nyeri tenggorokan ringan, demam sumeng, hidung meler, tenggorokan gatal, meriang, masuk angin, pilek, meler, hidung mampet, mengatasi flu, gejala flu awal',
        short_answer: 'Infeksi virus akut pada saluran pernapasan atas yang bisa sembuh sendiri (self-limiting). Menyebabkan peradangan mukosa hidung dan faring.',
        important_points: JSON.stringify([
            'Istirahat cukup dan jaga hidrasi tubuh (minum air hangat).',
            'Obat simtomatik: Parasetamol 3x sehari untuk demam/nyeri, Cetirizin/CTM 2x sehari jika hidung tersumbat berat.'
        ]),
        when_to_see_doctor: 'Segera periksakan ke dokter/faskes jika timbul sesak napas atau napas berbunyi, demam tinggi >39°C lebih dari 3 hari, atau gejala tidak membaik setelah 7-10 hari atau memburuk secara signifikan.',
        content_full: 'Nasofaringitis akut adalah peradangan pada saluran pernapasan atas yang paling sering disebabkan oleh rhinovirus. Terapi bersifat simtomatik dan suportif karena infeksi virus ini bersifat self-limiting.',
        category_id: 1,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Sesak napas atau napas berbunyi; Demam tinggi >39°C lebih dari 3 hari; Gejala tidak membaik setelah 7-10 hari atau memburuk secara signifikan.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 2,
        title: 'Tekanan Darah Tinggi / Hipertensi (Skrining)',
        topic_keywords: 'tekanan darah tinggi, tensi tinggi, tensi rendah, skrining tensi, cek tensi tinggi, darah tinggi tanpa gejala, hasil tensimeter naik, skrining darah tinggi, tensi naik',
        short_answer: 'Temuan tekanan darah di luar rentang normal saat pemeriksaan rutin tanpa riwayat atau kriteria diagnostik hipertensi organ sasaran. Perlu pemantauan berkala.',
        important_points: JSON.stringify([
            'Evaluasi ulang tensi dengan teknik yang benar setelah istirahat 5-10 menit.',
            'Batasi asupan garam dan kafein sebelum pemeriksaan.',
            'Lakukan pemantauan mandiri selama 1 minggu.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika tensi sistolik >180 atau diastolik >120 (Krisis Hipertensi), disertai sakit kepala hebat, pandangan kabur, nyeri dada, atau sesak napas mendadak.',
        content_full: 'Tekanan darah tinggi tanpa gejala sering terdeteksi saat pemeriksaan skrining. Diperlukan konfirmasi pengukuran ulang beberapa kali dalam kondisi tenang sebelum menegakkan diagnosis hipertensi tetap.',
        category_id: 4,
        source_id: 4,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Tensi sistolik >180 atau diastolik >120 (Krisis Hipertensi); Disertai sakit kepala hebat, pandangan kabur, atau nyeri dada; Sesak napas mendadak.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 3,
        title: 'Hipertensi Esensial (Primer)',
        topic_keywords: 'hipertensi esensial, hipertensi primer, tekanan darah tinggi, tensi diatas 140 90, tengkuk terasa berat, leher belakang tegang kaku, kepala belakang kencang berat, darah tinggi menahun, pusing tengkuk',
        short_answer: 'Peningkatan tekanan darah arterial kronis (>=140/90 mmHg) persisten tanpa penyebab lain yang mendasari. Berisiko menyebabkan komplikasi organ (jantung, otak, ginjal).',
        important_points: JSON.stringify([
            'Modifikasi gaya hidup: Diet rendah garam (DASH), olahraga teratur, turunkan berat badan.',
            'Cari tenaga kesehatan / medis terdekat untuk evaluasi berkala.',
            'Farmakologis: obat antihipertensi rutin (amlodipin 5 mg 1x sehari / candesartan 8 mg) jika belum pernah berkonsultasi dengan dokter.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika timbul nyeri dada khas seperti tertekan/tertindih, kelemahan separuh badan mendadak atau bicara pelo, serta nyeri kepala hebat menetap disertai mual muntah.',
        content_full: 'Hipertensi esensial mencakup lebih dari 90% kasus hipertensi. Kontrol tekanan darah jangka panjang sangat penting untuk mencegah stroke, gagal jantung, dan penyakit ginjal kronis.',
        category_id: 4,
        source_id: 4,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Nyeri dada khas seperti tertekan/tertindih; Kelemahan separuh badan mendadak atau bicara pelo; Nyeri kepala hebat menetap disertai mual muntah.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 4,
        title: 'Mialgia (Nyeri Otot)',
        topic_keywords: 'mialgia, nyeri otot, otot pegal, badan pegal linu, pundak kaku, paha sakit, otot sakit setelah aktivitas fisik, badan kaku, nyeri fisik, pegal pegal linu, kram otot, otot tegang',
        short_answer: 'Nyeri pada otot yang disebabkan oleh ketegangan, penggunaan berlebihan (overuse), mikrotrauma, atau respon radang sistemik ringan.',
        important_points: JSON.stringify([
            'Istirahatkan otot yang sakit, kompres hangat atau dingin.',
            'Lakukan peregangan ringan (stretching).',
            'Farmakologis: Parasetamol 3x sehari untuk meredakan nyeri.'
        ]),
        when_to_see_doctor: 'Segera ke fasilitas medis jika kelemahan otot berat hingga tidak bisa bergerak, urin berwarna gelap cokelat/seperti teh (curiga rhabdomyolysis), atau bengkak dan kemerahan lokal yang makin meluas.',
        content_full: 'Mialgia biasanya bersifat jinak dan sembuh dengan istirahat dan peregangan. Namun, nyeri otot berat disertai kelemahan ekstremitas dan perubahan warna urin memerlukan perhatian medis segera.',
        category_id: 7,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Kelemahan otot berat hingga tidak bisa bergerak; Urin berwarna gelap cokelat/seperti teh (curiga rhabdomyolysis); Bengkak dan kemerahan lokal yang makin meluas.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 5,
        title: 'Penyakit HIV (Infeksi Vaskular & Parasitik)',
        topic_keywords: 'hiv, infeksi vaskular parasitik, demam kronis berulang, demam hilang timbul sebulan, penurunan berat badan drastis, lidah putih, sariawan jamur lidah, diare lama sebulan, infeksi oportunistik, candida mulut',
        short_answer: 'Infeksi Human Immunodeficiency Virus yang menginfeksi sel imun (CD4), menyebabkan penurunan daya tahan tubuh dan rentan terhadap infeksi oportunistik.',
        important_points: JSON.stringify([
            'Segera berkonsultasi ke tenaga kesehatan / medis terdekat atau klinik VCT untuk pemeriksaan darah khusus.',
            'Inisiasi terapi Antiretroviral (ARV) sedini mungkin untuk menjaga kadar CD4 dan menekan replikasi virus.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika timbul sesak napas berat (curiga pneumonia PCP/TB), penurunan kesadaran atau kejang, serta nyeri kepala hebat disertai kaku kuduk.',
        content_full: 'HIV menargetkan limfosit CD4 sehingga menurunkan imunitas seluler. Deteksi dini dan kepatuhan konsumsi ARV harian memungkinkan penderita hidup produktif.',
        category_id: 2,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Sesak napas berat (curiga pneumonia PCP/TB); Penurunan kesadaran atau kejang; Nyeri kepala hebat disertai kaku kuduk.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 6,
        title: 'Demam Tanpa Penyebab Yang Jelas',
        topic_keywords: 'demam tanpa penyebab jelas, suhu diatas 37.5, badan menggigil, lemas meriang, sumeng, demam meriang panas, suhu tubuh tinggi belum jelas, panas dingin badan, demam naik turun',
        short_answer: 'Peningkatan suhu tubuh di atas nilai normal (>37.5°C) di mana penyebab spesifiknya belum teridentifikasi pada evaluasi awal dan memerlukan observasi lanjutan.',
        important_points: JSON.stringify([
            'Kompres hangat pada lipatan tubuh (aksila/inguinal) dan jaga asupan cairan cukup.',
            'Farmakologis: Parasetamol 500 mg tiap 6-8 jam bila suhu meningkat.',
            'Pantau pola demam dan tanda vital harian.'
        ]),
        when_to_see_doctor: 'Segera ke IGD jika demam >39°C yang tidak turun dengan antipiretik, muncul bintik merah/perdarahan pada kulit (petechiae), atau kejang / penurunan kesadaran / gelisah.',
        content_full: 'Demam merupakan tanda aktivasi respon pirogenik imun. Observasi kurva demam dan gejala penyerta seperti petekie atau muntah penting untuk mendeteksi infeksi dengue, tifoid, atau infeksi lainnya.',
        category_id: 2,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Demam >39°C yang tidak turun dengan antipiretik; Muncul bintik merah/perdarahan pada kulit (petechiae); Kejang atau penurunan kesadaran/gelisah.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 7,
        title: 'Diabetes Melitus Tipe 2 dengan Komplikasi',
        topic_keywords: 'diabetes melitus komplikasi, dm tipe 2 komplikasi, kencing manis luka lama, banyak pipis makan minum, luka sulit sembuh, kaki baal tebal, kaki kesemutan, neuropati diabetik, gangren kaki, lemas mengantuk diabetes',
        short_answer: 'Gangguan metabolik kronis akibat resistensi insulin disertai adanya komplikasi vaskular/neuropati yang memerlukan penanganan terpadu.',
        important_points: JSON.stringify([
            'Pemantauan kadar gula darah mandiri secara berkala.',
            'Segera cari tenaga kesehatan / medis terdekat untuk berkonsultasi mengenai pengobatan terpadu.',
            'Farmakologis: Obat Anti-Hiperglikemia Oral (Metformin, Glibenklamid) atau Insulin sesuai anjuran tenaga medis.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika kadar gula darah >300 mg/dL atau <70 mg/dL, napas cepat dan dalam (Kussmaul) atau berbau buah (aseton), serta luka membusuk/gangren pada kaki yang meluas cepat.',
        content_full: 'DM Tipe 2 dengan komplikasi menunjukkan keterlibatan mikrovaskular atau makrovaskular seperti neuropati diabetik, retinopati, nefropati, atau luka kaki diabetik.',
        category_id: 6,
        source_id: 3,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Kadar gula darah >300 mg/dL atau <70 mg/dL; Napas cepat dan dalam (Kussmaul) atau berbau buah (aseton); Luka membusuk/gangren pada kaki yang meluas cepat.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 8,
        title: 'Gonartrosis (Osteoartritis Lutut)',
        topic_keywords: 'gonartrosis, osteoartritis lutut, radang sendi lutut, nyeri lutut jalan jauh tangga, kaku sendi pagi hari, bunyi krek saat ditekuk, krepitasi lutut, susah berdiri, lutut bengkak, nyeri sendi lutut',
        short_answer: 'Penyakit degeneratif sendi lutut yang ditandai dengan kerusakan tulang rawan sendi, pembentukan osteofit, dan penyempitan celah sendi.',
        important_points: JSON.stringify([
            'Kurangi beban sendi: Turunkan berat badan, hindari berlutut/jongkok lama.',
            'Lakukan latihan penguatan otot kuadrisep paha berintensitas rendah.',
            'Farmakologis: Parasetamol/NSAID topikal atau oral saat nyeri kambuh.'
        ]),
        when_to_see_doctor: 'Segera ke IGD/faskes jika sendi lutut bengkak hebat, merah, dan panas (curiga arthritis septik), tidak mampu menumpu beban sama sekali mendadak, atau kelainan bentuk sendi memburuk cepat.',
        content_full: 'Gonartrosis adalah jenis osteoartritis paling umum pada sendi penyangga beban. Penurunan berat badan dan fisioterapi merupakan pilar utama penanganan non-farmakologis.',
        category_id: 7,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Sendi lutut bengkak hebat, merah, dan panas (curiga arthritis septik); Tidak mampu menumpu beban sama sekali mendadak; Kelainan bentuk sendi yang makin memburuk secara cepat.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 9,
        title: 'Dispepsia Non-Ulser',
        topic_keywords: 'dispepsia non-ulser, dispepsia, nyeri ulu hati, rasa terbakar ulu hati, cepat kenyang, kembung begah mual setelah makan, maag fungsional, lambung perih begah, perut tidak nyaman setelah makan',
        short_answer: 'Kumpulan gejala rasa tidak nyaman pada perut bagian atas tanpa adanya kelainan struktural pada pemeriksaan endoskopi rutin.',
        important_points: JSON.stringify([
            'Modifikasi pola makan: Porsi kecil tapi sering, hindari pedas, asam, kopi, dan stres.',
            'Hindari berbaring dalam 2 jam setelah makan.',
            'Farmakologis: Antasida, H2 blocker (Ranitidin), atau PPI (Omeprazole).'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika muntah hitam seperti bubuk kopi atau BAB berwarna hitam pekat (melena), penurunan berat badan drastis tanpa sebab jelas, atau sulit menelan (disfagia) / nyeri menelan.',
        content_full: 'Dispepsia non-ulser (dispepsia fungsional) mencakup sindrom distres postprandial dan sindrom nyeri epigastrium tanpa bukti ulkus peptikum nyata.',
        category_id: 5,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Muntah hitam seperti bubuk kopi atau BAB berwarna hitam pekat (melena); Penurunan berat badan drastis tanpa sebab jelas; Sulit menelan (disfagia) atau nyeri menelan.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 10,
        title: 'Diabetes Melitus Tipe 2 Tanpa Komplikasi',
        topic_keywords: 'diabetes tipe 2 tanpa komplikasi, sering kencing poliuria, sering haus polidipsia, sering lapar polifagia, bb turun tanpa sebab, kencing manis lemas, haus terus lapar terus, kencing malam hari',
        short_answer: 'Gangguan metabolik kronis yang ditandai dengan tingginya gula dalam darah akibat hormon insulin tidak diserap tubuh atau hormon insulin tidak dibuat oleh pankreas.',
        important_points: JSON.stringify([
            'Perubahan pola hidup: Makan rendah gula, olahraga 150 menit/minggu.',
            'Pemantauan kadar gula darah mandiri secara berkala.',
            'Segera cari tenaga kesehatan / medis terdekat untuk berkonsultasi mengenai obat anti-hiperglikemia oral (Metformin, Glibenklamid) atau insulin.'
        ]),
        when_to_see_doctor: 'Segera ke IGD jika timbul gejala gula rendah berat (gemetar, keringat dingin, bingung), kadar gula darah puasa persisten >200 mg/dL, atau adanya luka pada bagian tubuh yang tidak kunjung sembuh.',
        content_full: 'Diagnosis dini DM Tipe 2 melalui trias klasik (poliuria, polidipsia, polifagia) dan pemeriksaan gula darah memungkinkan intervensi gaya hidup mencegah terjadinya komplikasi.',
        category_id: 6,
        source_id: 3,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Gejala gula rendah berat (gemetar, keringat dingin, bingung); Kadar gula darah puasa persisten >200 mg/dL; Adanya luka pada bagian tubuh yang tidak kunjung sembuh.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 11,
        title: 'Faringitis Akut (Sakit Tenggorokan)',
        topic_keywords: 'faringitis akut, sakit tenggorokan, nyeri menelan, tenggorokan merah, bercak putih tenggorokan, leher agak bengkak, demam menelan, radang tenggorokan, tenggorokan sakit menelan',
        short_answer: 'Peradangan mukosa faring yang kebanyakan disebabkan oleh infeksi virus tetapi juga mungkin akibat bakteri.',
        important_points: JSON.stringify([
            'Kumur air garam hangat, hindari makanan iritatif/es.',
            'Perbanyak konsumsi cairan hangat.',
            'Farmakologis: Analgesik/Antipiretik (Parasetamol/Ibuprofen).',
            'Konsultasi dengan tenaga kesehatan / medis terdekat apakah perlu antibiotik.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika kesulitan bernapas atau suara serak berat, sulit membuka mulut (trismus), sulit menelan ludah, atau pembengkakan leher yang tidak rata kiri dan kanan.',
        content_full: 'Faringitis akut ditandai eritema dinding posterior faring. Mayoritas kasus beretiologi virus dan tidak membutuhkan antibiotik kecuali terbukti infeksi Streptococcus grup A.',
        category_id: 1,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Kesulitan bernapas atau suara serak berat; Sulit membuka mulut (trismus) atau sulit menelan ludah; Pembengkakan leher yang tidak rata kiri dan kanan.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 12,
        title: 'Eksem (Dermatitis)',
        topic_keywords: 'eksem, eksim, dermatitis, kulit kemerahan, gatal hebat kulit, kulit kering bersisik, bentol berair, digaruk makin perih, bintik berair merah, alergi kulit gatal',
        short_answer: 'Peradangan non-infeksius pada kulit yang ditandai dengan kemerahan, gatal, dan lentingan atau bercak akibat berbagai macam faktor.',
        important_points: JSON.stringify([
            'Gunakan pelembab kulit (emolien) secara teratur, hindari sabun berbahan keras.',
            'Hindari garukan berlebih untuk mencegah infeksi sekunder.',
            'Konsultasi dengan tenaga kesehatan / medis untuk penggunaan obat salep khusus.'
        ]),
        when_to_see_doctor: 'Segera ke IGD jika ruam meluas ke seluruh tubuh disertai demam, kulit melepuh luas atau terkelupas (curiga reaksi obat berat/SJS), tanda infeksi lebih berat berupa nanah dan nyeri hebat, atau bercak putih mati rasa.',
        content_full: 'Eksem mencakup dermatitis atopik dan kontak. Kunci utama adalah menjaga sawar kulit (skin barrier) dengan pelembap emolien dan menghindari pencetus alergen/iritan.',
        category_id: 8,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Ruam meluas ke seluruh tubuh disertai demam; Kulit melepuh luas atau terkelupas (curiga reaksi obat berat/SJS); Tanda infeksi lebih berat berupa nanah dan nyeri hebat; Bercak putih mati rasa.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 13,
        title: 'Nyeri Punggung Bawah (Low Back Pain)',
        topic_keywords: 'nyeri punggung bawah, low back pain, lbp, pinggang bawah pegal sakit, kaku membungkuk, sakit berdiri lama, sakit habis angkat benda berat, pinggang encok, sakit pinggang bawah',
        short_answer: 'Nyeri yang dirasakan di daerah punggung bawah atau area atas pantat akibat ketegangan otot, ligamen, atau kelainan sendi/diskus intervertebralis.',
        important_points: JSON.stringify([
            'Latihan penguatan otot punggung (core training) dan edukasi posisi ergonomis.',
            'Kompres hangat pada area pinggang yang kaku.',
            'Farmakologis: Parasetamol 500 mg 3x sehari.',
            'Jika masih dirasa nyeri perlu tenaga kesehatan / medis untuk konsultasi mengenai pengobatan.'
        ]),
        when_to_see_doctor: 'Segera ke IGD jika nyeri menjalar ke kaki disertai kesemutan/kelemahan otot, gangguan Buang Air Besar atau Buang Air Kecil atau kebas area selangkangan (saddle anesthesia), atau riwayat trauma berat / kanker.',
        content_full: 'Low back pain mekanik umumnya disebabkan oleh spasme otot paraspinal. Evaluasi tanda bahaya (red flags) seperti cauda equina syndrome sangat penting.',
        category_id: 7,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Nyeri menjalar ke kaki disertai kesemutan/kelemahan otot; Gangguan Buang Air Besar atau Buang Air Kecil atau kebas area selangkangan; Riwayat trauma berat atau riwayat kanker.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 14,
        title: 'Gastritis dan Duodenitis',
        topic_keywords: 'gastritis dan duodenitis, gastritis, duodenitis, nyeri perih ulu hati melilit, ulu hati terbakar, telat makan perih, makan pedas asam perih, mual kembung penuh lambung, sakit maag asam lambung',
        short_answer: 'Peradangan pada bagian lambung dan usus dua belas jari yang disebabkan oleh asam lambung berlebih, penggunaan NSAID kronis, atau infeksi H. pylori.',
        important_points: JSON.stringify([
            'Makan teratur porsi kecil, hindari kopi, alkohol, makanan pedas dan berlemak.',
            'Hentikan penggunaan obat anti-nyeri NSAID tanpa resep.',
            'Konsultasi dengan tenaga kesehatan / medis mengenai pengobatan penetral atau penekan asam lambung.'
        ]),
        when_to_see_doctor: 'Segera ke IGD jika BAB berwarna hitam seperti ter (melena) atau muntah darah, nyeri perut hebat mendadak yang tembus ke punggung, serta anemia berat (pucat, lemas, pusing berputar).',
        content_full: 'Gastritis dan duodenitis melibatkan erosi mukosa lambung dan duodenum. Terapi meliputi modifikasi diet serta obat penekan asam seperti antagonis H2 atau PPI.',
        category_id: 5,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'BAB berwarna hitam seperti ter (melena) atau muntah darah; Nyeri perut hebat mendadak yang tembus ke punggung; Anemia berat (pucat, lemas, pusing berputar).',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 15,
        title: 'Infeksi Saluran Napas Atas Akut (ISPA)',
        topic_keywords: 'ispa, infeksi saluran napas atas akut, batuk pilek serentak, nyeri tenggorokan demam meriang, demam ringan sumeng batuk pilek, infeksi hidung faring laring, batuk pilek meriang',
        short_answer: 'Infeksi akut yang melibatkan beberapa organ saluran pernapasan atas sekaligus (hidung, faring, laring) yang umumnya disebabkan oleh virus.',
        important_points: JSON.stringify([
            'Istirahat cukup, minum air putih hangat, konsumsi vitamin C.',
            'Parasetamol 500 mg 3x sehari jika demam/meriang.',
            'Konsultasi dengan tenaga kesehatan / medis mengenai pengobatan.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika timbul sesak napas atau retraksi dinding dada, demam tinggi persisten >3 hari, atau sianosis (kebiruan pada bibir atau kuku).',
        content_full: 'ISPA adalah spektrum infeksi mukosa pernapasan dari rongga hidung hingga pita suara. Kebanyakan kasus sembuh secara spontan dalam 7-10 hari dengan perawatan suportif.',
        category_id: 1,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Sesak napas atau retraksi dinding dada; Demam tinggi persisten >3 hari; Sianosis (kebiruan pada bibir atau kuku).',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 16,
        title: 'Sakit Kepala Tipe Tegang (Tension-Type Headache)',
        topic_keywords: 'sakit kepala tipe tegang, tension-type headache, tension headache, kepala diikat kencang dahi leher, cengkeram kedua sisi kepala, kaku otot leher, sakit kepala tegang, pusing tegang leher',
        short_answer: 'Kumpulan gangguan sakit kepala primer non-migrain yang umumnya terkait dengan stres, ketegangan otot leher, atau kelelahan mata.',
        important_points: JSON.stringify([
            'Istirahat di ruangan tenang, kelola stres, dan pijat ringan otot leher/bahu.',
            'Hidrasi dan batasi penggunaan gadget berlebih.',
            'Farmakologis: Parasetamol 500 mg 3x sehari.'
        ]),
        when_to_see_doctor: 'Segera ke IGD jika sakit kepala timbul mendadak dan sangat hebat, disertai demam tinggi, kaku kuduk, atau kejang, serta disertai kelemahan anggota gerak atau kebingungan.',
        content_full: 'Tension-type headache (TTH) adalah tipe sakit kepala primer paling umum, bercirikan nyeri tumpul konstriktif seperti diikat pita kencang di sekeliling kepala tanpa mual muntah berat.',
        category_id: 3,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Sakit kepala timbul mendadak dan sangat hebat; Disertai demam tinggi, kaku kuduk, atau kejang; Disertai kelemahan anggota gerak atau kebingungan.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 17,
        title: 'Tonsilitis Akut (Amandel)',
        topic_keywords: 'tonsilitis akut, radang amandel, amandel membesar bengkak merah, bercak putih amandel, amandel ada warna putih kuning, nyeri menelan berat amandel, demam tinggi amandel, amandel bengkak',
        short_answer: 'Peradangan akut pada amandel akibat infeksi virus atau bakteri (Streptococcus), sering terjadi pada anak-anak dan remaja.',
        important_points: JSON.stringify([
            'Istirahat, makan makanan bertekstur lunak dan tidak merangsang.',
            'Kumur antiseptik/air garam hangat.',
            'Parasetamol 500 mg 3x sehari jika demam.',
            'Konsultasi ke tenaga kesehatan / medis untuk pengobatan lebih lanjut.'
        ]),
        when_to_see_doctor: 'Segera ke IGD jika kesulitan bernapas atau ngorok hebat saat tidur, tidak bisa menelan makanan/cairan sama sekali, atau pembengkakan leher hebat atau abses peritonsil.',
        content_full: 'Tonsilitis akut ditandai pembesaran tonsil dengan eksudat folikular atau membranosa. Perlunya antibiotik ditentukan berdasarkan kriteria Centor / McIsaac.',
        category_id: 1,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Kesulitan bernapas atau ngorok hebat saat tidur; Tidak bisa menelan makanan/cairan sama sekali; Pembengkakan leher hebat atau abses peritonsil.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 18,
        title: 'Konjungtivitis (Mata Merah)',
        topic_keywords: 'konjungtivitis, mata merah, belekan mata, belek kuning jernih, mata gatal terasa ganjal ganjil, mata berair bangun tidur lengket kotoran, radang konjungtiva, mata belekan lengket',
        short_answer: 'Peradangan pada lapisan konjungtiva mata akibat infeksi virus, bakteri, atau reaksi alergi. Sangat menular jika disebabkan oleh infeksi.',
        important_points: JSON.stringify([
            'Jaga kebersihan mata, hindari mengucek mata, dan cuci tangan teratur.',
            'Kompres dingin/hangat sesuai penyebab.',
            'Perlu konsultasi tenaga kesehatan / medis untuk pengobatan lebih lanjut.',
            'Farmakologis: Tetes mata antibiotik (bakteri) atau Tetes mata antihistamin/air mata buatan sesuai dengan anjuran dokter.'
        ]),
        when_to_see_doctor: 'Segera periksakan ke dokter spesialis mata / IGD jika penglihatan kabur mendadak, nyeri mata berat atau silau berlebih (fotofobia), atau terdapat kekeruhan pada kornea.',
        content_full: 'Konjungtivitis menghasilkan hiperemia konjungtiva bulbi dan palpebra dengan sekret serosa atau mukopurulen. Pencegahan penularan keluarga sangat penting.',
        category_id: 8,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Penglihatan kabur mendadak; Nyeri mata berat atau silau berlebih; Terdapat kekeruhan pada kornea.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 19,
        title: 'Batuk',
        topic_keywords: 'batuk berdahak, batuk kering, gatal di tenggorokan batuk, batuk terus menerus 4 hari, dada pegal batuk tanpa sesak, obat batuk, batuk akut, mengatasi batuk',
        short_answer: 'Refleks pertahanan saluran napas untuk membersihkan sekret atau iritan. Merupakan gejala dari berbagai kondisi respiratori.',
        important_points: JSON.stringify([
            'Minum air hangat, hindari es, makanan berminyak, dan asap rokok.',
            'Madu dan lemon untuk meredakan iritasi tenggorokan.',
            'Farmakologis: Ekspektoran (Guaifenesin) untuk batuk berdahak, Antitusif (Dextromethorphan) untuk batuk kering.'
        ]),
        when_to_see_doctor: 'Segera ke fasilitas kesehatan jika batuk berdarah (hemoptisis), batuk menetap lebih dari 2-3 minggu (curiga TB/keganasan), atau disertai penurunan berat badan drastis dan keringat malam.',
        content_full: 'Batuk akut (<3 minggu) paling sering berhubungan dengan infeksi virus saluran napas atas. Batuk berdarah atau berlangsung kronis memerlukan evaluasi rontgen toraks.',
        category_id: 1,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Batuk berdarah (hemoptisis); Batuk menetap lebih dari 2-3 minggu (curiga TB/keganasan); Disertai penurunan berat badan drastis dan keringat malam.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 20,
        title: 'Sakit Kepala (Cephalgia)',
        topic_keywords: 'sakit kepala, pusing, pusing cekot-cekot sejak pagi, nyeri di kepala, rasa tidak nyaman di kepala, kepala sakit cekot cekot, sakit kepala biasa, migrain umum',
        short_answer: 'Sintom nyeri pada regio kepala yang dapat bersifat primer (TTH, migrain) atau sekunder akibat penyakit sistemik/lokal lain.',
        important_points: JSON.stringify([
            'Istirahat cukup di ruangan redup dan tenang.',
            'Pastikan kecukupan cairan dan pola makan teratur.',
            'Farmakologis: Parasetamol 500 mg.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika nyeri kepala memberat progresif dari hari ke hari, terjadi pasca trauma kepala berat, atau disertai defisit neurologis fokal (mulut merot, bicara pelo).',
        content_full: 'Sakit kepala adalah keluhan neurologis yang sangat sering dijumpai. Penting untuk membedakan sakit kepala primer jinak dari penyebab sekunder berbahaya.',
        category_id: 3,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Nyeri kepala memberat progresif dari hari ke hari; Terjadi pasca trauma kepala berat; Disertai defisit neurologis fokal (mulut merot, bicara pelo).',
        validated_by: 'Admin Medis TeleHealth'
    },

    // --- 2. Tabel Diagnosis Gawat Darurat (15 Item) ---
    {
        id: 21,
        title: 'Nyeri Dada Tidak Spesifik (Chest Pain Akut)',
        topic_keywords: 'nyeri dada tidak spesifik, chest pain, dada tertindih beban berat agak sesak, nyeri dada tumpul tajam, sensasi tertekan dada bernapas aktivitas, dada sesak setengah jam, nyeri dada darurat',
        short_answer: 'Gejala nyeri dada yang memerlukan evaluasi cepat untuk menyingkirkan sindrom koroner akut, diseksi aorta, atau emboli paru.',
        important_points: JSON.stringify([
            'Gawat Darurat! Segera ke IGD RS terdekat.',
            'Posisikan pasien istirahat total (tirah baring) setengah duduk.',
            'Jangan memberikan makanan/minuman berlebih.'
        ]),
        when_to_see_doctor: 'KONDISI GAWAT DARURAT SEGERA KE IGD: Nyeri dada menjalar ke lengan kiri, leher, atau rahang; Disertai keringat dingin, mual, dan sesak napas berat; Riwayat penyakit jantung koroner atau faktor risiko tinggi.',
        content_full: 'Nyeri dada akut merupakan kegawatdaruratan medis sampai terbukti bukan berasal dari sindrom koroner akut, pneumotoraks tension, tamponade kardiak, atau emboli paru.',
        category_id: 4,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Nyeri dada menjalar ke lengan kiri, leher, atau rahang; Disertai keringat dingin, mual, dan sesak napas berat; Riwayat penyakit jantung koroner atau faktor risiko tinggi.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 22,
        title: 'Dispnea (Sesak Napas Akut)',
        topic_keywords: 'dispnea, sesak napas akut, sangat sesak napas, tidak bisa menarik udara paru-paru, laju napas meningkat, napas cuping hidung, otot bantu napas, sianosis sesak, napas tersengal darurat',
        short_answer: 'Ketidakmampuan bernapas secara adekuat yang menandakan gangguan oksigenasi atau ventilasi berat (kardiak/pulmonal).',
        important_points: JSON.stringify([
            'Gawat Darurat! Segera bawa ke IGD Rumah Sakit terdekat.',
            'Posisikan setengah duduk (Fowler) untuk membantu ekspansi paru.',
            'Longgarkan pakaian yang ketat di area leher dan dada.'
        ]),
        when_to_see_doctor: 'KONDISI GAWAT DARURAT SEGERA KE IGD: Bibir dan ujung jari kebiruan (sianosis); Penurunan kesadaran atau pasien tampak sangat gelisah; Tidak bisa mengucapkan satu kalimat utuh karena sesak.',
        content_full: 'Dispnea akut mengindikasikan hipoksemia berat atau kegagalan pertukaran gas alveolar, membutuhkan terapi oksigen segera dan evaluasi jalan napas.',
        category_id: 1,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Bibir dan ujung jari kebiruan (sianosis); Penurunan kesadaran atau pasien tampak sangat gelisah; Tidak bisa mengucapkan satu kalimat utuh karena sesak.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 23,
        title: 'Koma / Penurunan Kesadaran',
        topic_keywords: 'koma, penurunan kesadaran, tidak bisa dibangunkan sama sekali, napas perlahan tidak sadar, tidak merespon panggilan atau rangsangan nyeri, pingsan lama, tidak sadar diri',
        short_answer: 'Kondisi ketidaksadaran menetap akibat disfungsi serebral difus atau gangguan batang otak yang mengancam jiwa.',
        important_points: JSON.stringify([
            'Gawat Darurat Utama! Segera panggil ambulans / IGD.',
            'Amankan jalan napas (posisi miring mantap jika muntah).',
            'Cek napas dan nadi; siap lakukan RJP jika henti napas/nadi.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS DARURAT SEGERA KE IGD: Henti napas atau pola napas ireguler; Manifestasi kejang berulang; Pupil anisokor (besar sebelah) atau tidak merespon cahaya.',
        content_full: 'Koma adalah keadaan tidak responsif terhadap stimulus verbal maupun nyeri. Prioritas pertama adalah survei primer ABC (Airway, Breathing, Circulation).',
        category_id: 3,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Henti napas atau pola napas ireguler; Manifestasi kejang berulang; Pupil anisokor (besar sebelah) atau tidak merespon cahaya.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 24,
        title: 'Kejang / Konvulsi',
        topic_keywords: 'kejang, konvulsi, mendadak kejang-kejang, mulut berbusa kejang, tidak sadarkan diri kejang, kekakuan tubuh mendadak, hentakan otot seluruh tubuh, mata mendelik, lidah tergigit, ayan, pingsan kejang',
        short_answer: 'Aktivitas listrik otak yang tidak normal dan berlebihan, memicu gangguan motorik, sensorik, atau kesadaran mendadak.',
        important_points: JSON.stringify([
            'Gawat Darurat! Longgarkan pakaian, baringkan di tempat aman.',
            'JANGAN memasukkan benda apapun ke dalam mulut pasien.',
            'Miringkan posisi tubuh pasien setelah kejang berhenti agar cairan tidak menyumbat jalan napas.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS DARURAT SEGERA KE IGD: Kejang berlangsung lebih dari 5 menit (Status Epileptikus); Kejang berulang tanpa pemulihan kesadaran di antaranya; Disertai demam sangat tinggi atau cedera kepala.',
        content_full: 'Kejang berkelanjutan (>5 menit) berisiko mengalami status epileptikus yang mengancam kerusakan neuron otak permanen dan memerlukan benzodiazepin IV segera di IGD.',
        category_id: 3,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Kejang berlangsung lebih dari 5 menit (Status Epileptikus); Kejang berulang tanpa pemulihan kesadaran di antaranya; Disertai demam sangat tinggi atau cedera kepala.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 25,
        title: 'Infark Miokard Akut (Serangan Jantung)',
        topic_keywords: 'infark miokard akut, serangan jantung, dada kiri diremas ditekan hebat, menjalar ke lengan dan leher, keringat dingin membasuhi baju, nyeri dada lebih 20 menit, tembus ke belakang punggung, gelisah serangan jantung',
        short_answer: 'Nekrosis otot jantung akibat oklusi mendadak pada arteri koroner. Merupakan salah satu penyebab kematian mendadak tertinggi.',
        important_points: JSON.stringify([
            'Gawat Darurat Utama! Segera ke IGD fasilitas yang memiliki faskes PCI/Layanan Jantung.',
            'Tirah baring total, berikan Aspirin kunyah jika tersedia dan dianjurkan petugas.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Henti jantung mendadak; Tekanan darah drop drastis (syok kardiogenik); Aritmia/jantung berdebar sangat cepat dan tidak teratur.',
        content_full: 'Infark miokard akut (STEMI/NSTEMI) membutuhkan revaskularisasi koroner segera (trombolitik atau intervensi koroner perkutan/PCI) dalam jendela waktu emas.',
        category_id: 4,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Henti jantung mendadak; Tekanan darah drop drastis (syok kardiogenik); Aritmia/jantung berdebar sangat cepat dan tidak teratur.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 26,
        title: 'Stroke Akut (Iskemik / Perdarahan)',
        topic_keywords: 'stroke akut, stroke iskemik, stroke perdarahan, tangan kaki kanan lemas tidak bisa diangkat, mulut merot mencong, bicara pelo mendadak, kelemahan separuh badan mendadak, lumpuh sebelah',
        short_answer: 'Defisit neurologis fokal akut akibat penyumbatan atau pecahnya pembuluh darah otak. Golden period tindakan <4.5 jam.',
        important_points: JSON.stringify([
            'Gawat Darurat Utama! Segera ke RS dengan fasilitas CT Scan.',
            'Catat WAKTU PASTI onset gejala muncul.',
            'Jangan berikan obat penurun tensi atau makanan/minuman oral.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Penurunan kesadaran secara cepat; Muntah menyembur atau kejang; Nyeri kepala hebat yang timbul mendadak.',
        content_full: 'Stroke akut harus ditangani dalam periode emas (<4.5 jam) untuk terapi trombolisis alteplase pada stroke iskemik atau dekompresi bedah pada stroke hemoragik.',
        category_id: 3,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Penurunan kesadaran secara cepat; Muntah menyembur atau kejang; Nyeri kepala hebat yang timbul mendadak.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 27,
        title: 'Gagal Napas Akut',
        topic_keywords: 'gagal napas akut, saturasi oksigen dibawah 90, napas cepat dangkal lebih 30 kali, bibir mulai biru, megap-megap kehabisan udara, dada naik turun cepat, bibir biru, ujung tangan biru sianosis',
        short_answer: 'Kegagalan sistem respirasi dalam mempertahankan pertukaran gas O2 dan CO2 yang adekuat untuk memenuhi kebutuhan metabolik.',
        important_points: JSON.stringify([
            'Gawat Darurat Utama! Segera evakuasi ke IGD RS.',
            'Berikan bantuan ventilasi/oksigenasi tekanan tinggi segera.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Henti napas (apnea); Sianosis berat seluruh tubuh; Gelisah hebat diikuti letargi/koma.',
        content_full: 'Gagal napas akut tipe 1 (hipoksemik) atau tipe 2 (hiperkapnik) memerlukan intubasi endotrakeal atau ventilasi mekanik non-invasif darurat di ruang resusitasi/ICU.',
        category_id: 1,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Henti napas (apnea); Sianosis berat seluruh tubuh; Gelisah hebat diikuti letargi/koma.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 28,
        title: 'Sepsis',
        topic_keywords: 'sepsis, badan menggigil hebat demam tinggi, denyut jantung kencang nafas cepat, linglung disorientasi, tekanan darah turun infeksi, badan pasien menggigil linglung',
        short_answer: 'Disfungsi organ yang mengancam jiwa yang disebabkan oleh respon imun tubuh yang tidak teratur terhadap infeksi.',
        important_points: JSON.stringify([
            'Gawat Darurat! Perlu perawatan intensif (ICU/HCU) dan antibiotik IV spektrum luas segera di IGD.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Tekanan darah drop tidak respon cairan (Syok Septik); Produksi urin sangat sedikit/tidak ada (akut oliguria); Kesadaran makin menurun/delirium.',
        content_full: 'Penatalaksanaan sepsis berpatokan pada Hour-1 Bundle: resusitasi cairan kristaloid 30 mL/kg, kultur darah, antibiotik empiris spektrum luas, dan vasopresor bila terjadi hipotensi.',
        category_id: 2,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Tekanan darah drop tidak respon cairan (Syok Septik); Produksi urin sangat sedikit/tidak ada (akut oliguria); Kesadaran makin menurun/delirium.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 29,
        title: 'Syok (Unspecified)',
        topic_keywords: 'syok, tekanan darah dibawah 90, ujung jari tangan kaki dingin basah, nadi cepat lemah halus, kulit dingin pucat basah, lemas berat tidak bisa berdiri, tensi drop drastis',
        short_answer: 'Kegagalan sirkulasi sistemik akut yang mengakibatkan perfusi jaringan dan oksigenasi selular tidak adekuat.',
        important_points: JSON.stringify([
            'Gawat Darurat Utama! Baringkan terlentang dengan posisi kaki lebih tinggi (posisi Trendelenburg).',
            'Segera bawa ke IGD untuk resusitasi cairan intravena.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Penurunan kesadaran total; Anuria (tidak ada urin); Henti jantung.',
        content_full: 'Syok ditandai hipoperfusi jaringan dan asidosis laktat. Identifikasi dini etiologi syok (hipovolemik, kardiogenik, septik, anafilaktik) sangat penting untuk terapi resusitasi yang tepat.',
        category_id: 4,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Penurunan kesadaran total; Anuria (tidak ada urin); Henti jantung.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 30,
        title: 'Hipoglikemia Akut',
        topic_keywords: 'hipoglikemia akut, gula darah dibawah 70, mendadak gemetar hebat keringat dingin linglung, pusing bingung jantung berdebar diabetes, syok gula darah rendah',
        short_answer: 'Kadar glukosa darah berada di bawah tingkat normal (<70 mg/dL), memicu respon simpatis dan neuroglikopenia yang mengancam otak.',
        important_points: JSON.stringify([
            'Jika SADAR: Berikan minum air gula/teh manis (15-20 gram glukosa).',
            'Jika TIDAK SADAR: JANGAN masukkan cairan ke mulut. Bawa segera ke IGD untuk IV Dextrose 40%.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Kejang hipoglikemia; Penurunan kesadaran / koma hipoglikemik; Gula darah tidak naik setelah pemberian gula oral.',
        content_full: 'Hipoglikemia berat yang tidak segera dikoreksi dapat mengakibatkan ensefalopati hipoglikemik dan kerusakan otak ireversibel.',
        category_id: 6,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Kejang hipoglikemia; Penurunan kesadaran / koma hipoglikemik; Gula darah tidak naik setelah pemberian gula oral.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 31,
        title: 'Ketoasidosis Diabetikum (KAD)',
        topic_keywords: 'ketoasidosis diabetikum, kad, gula darah tinggi diatas 250, napas berbau manis buah aseton, napas kussmaul cepat dalam, muntah terus gula darah tinggi, dehidrasi diabetes',
        short_answer: 'Komplikasi akut diabetes melitus akibat defisiensi insulin berat yang memicu akumulasi badan keton dan asidosis metabolik.',
        important_points: JSON.stringify([
            'Gawat Darurat! Segera ke IGD untuk rehidrasi cairan IV masif dan infus insulin kontinu.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Penurunan kesadaran / koma ketoasidosis; Dehidrasi berat dengan syok; Gangguan elektrolit berat.',
        content_full: 'KAD adalah trias hiperglikemia, asidosis metabolik, dan ketonemia. Protokol penanganan meliputi rehidrasi cairan NaCl 0.9%, koreksi kalium, dan drip insulin reguler.',
        category_id: 6,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Penurunan kesadaran / koma ketoasidosis; Dehidrasi berat dengan syok; Gangguan elektrolit berat.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 32,
        title: 'Perdarahan Saluran Cerna Akut',
        topic_keywords: 'perdarahan saluran cerna akut, muntah darah segar, muntah cairan hitam bubuk kopi, bab berwarna hitam aspal, melena, buang air besar hitam lengket pucat lemas, pendarahan lambung',
        short_answer: 'Perdarahan akut pada saluran cerna atas atau bawah yang berisiko memicu anemia akut dan syok hipovolemik.',
        important_points: JSON.stringify([
            'Gawat Darurat! Puasakan pasien total (jangan beri makan/minum).',
            'Bawa ke IGD untuk pemasangan NGT, resusitasi cairan, dan persiapan transfusi/endoskopi.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Perdarahan masif terus menerus; Pingsan / syok hipovolemik (tensi drop, nadi cepat); Pucat ekstrem disertai sesak napas.',
        content_full: 'Perdarahan saluran cerna atas (ruptur varises esofagus atau ulkus peptikum) memerlukan resusitasi hemodinamik segera, asam traneksamat, PPI dosis tinggi, dan endoskopi hemostatik.',
        category_id: 5,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Perdarahan masif terus menerus; Pingsan / syok hipovolemik (tensi drop, nadi cepat); Pucat ekstrem disertai sesak napas.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 33,
        title: 'Gagal Ginjal Akut (AKI)',
        topic_keywords: 'gagal ginjal akut, aki, kencing sedikit pipis sedikit, tidak bisa pipis kencing tidak keluar, kaki wajah bengkak kencing macet, mual muntah sesak ginjal, kencing tidak keluar kemarin',
        short_answer: 'Penurunan fungsi ginjal secara mendadak yang menyebabkan retensi sisa metabolik nitrogen dan gangguan keseimbangan cairan/elektrolit.',
        important_points: JSON.stringify([
            'Gawat Darurat! Segera ke fasilitas kesehatan untuk evaluasi fungsi ginjal dan hidrasi terkontrol.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Sesak napas berat akibat edem paru (penumpukan cairan di paru); Kadar Kalium sangat tinggi (Hiperkalemia) berisiko henti jantung; Penurunan kesadaran uremik.',
        content_full: 'Acute Kidney Injury (AKI) dapat bersifat prerenal, renal (intrinsik), atau postrenal. Indikasi hemodialisis cito meliputi edema paru refrakter, hiperkalemia berat, dan asidosis metabolik.',
        category_id: 8,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Sesak napas berat akibat edem paru (penumpukan cairan di paru); Kadar Kalium sangat tinggi (Hiperkalemia) berisiko henti jantung; Penurunan kesadaran uremik.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 34,
        title: 'Cedera Kepala Berat / Intrakranial',
        topic_keywords: 'cedera kepala berat, intrakranial, jatuh membentur kepala pingsan, pingsan 10 menit setelah kecelakaan, muntah menyembur bingung kepala, hilang ingatan jatuh kepala, gegar otak berat',
        short_answer: 'Kerusakan struktur otak akibat gaya mekanis luar yang memicu perdarahan intrakranial atau edema serebral.',
        important_points: JSON.stringify([
            'Gawat Darurat Utama! Imobilisasi leher (pasang cervical collar jika ada suspect fraktur servikal).',
            'Bawa segera ke IGD RS dengan CT Scan.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Pupil mata tidak sama besar (anisokor); Keluar cairan bening/darah dari hidung atau telinga; Kejang post-trauma atau GCS terus menurun.',
        content_full: 'Cedera kepala dengan GCS <= 8 atau tanda fraktur basis cranii memerlukan proteksi jalan napas via intubasi, CT scan kepala segera, dan intervensi bedah saraf.',
        category_id: 3,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Pupil mata tidak sama besar (anisokor); Keluar cairan bening/darah dari hidung atau telinga; Kejang post-trauma atau GCS terus menurun.',
        validated_by: 'Admin Medis TeleHealth'
    },
    {
        id: 35,
        title: 'Akut Abdomen',
        topic_keywords: 'akut abdomen, sakit perut hebat sekali tidak bisa disentuh, perut kaku seperti papan, tegang kaku tidak bisa kentut, mual muntah berat perut sakit, perut keras papan disentuh',
        short_answer: 'Kondisi intraabdominal akut yang memerlukan tindakan bedah darurat segera (misal: perforasi gaster, peritonitis, ileus strangulasi).',
        important_points: JSON.stringify([
            'Gawat Darurat! Puasakan pasien total (jangan diberi makan/minum/obat cacing/pencahar).',
            'Segera konsultasi Bedah di IGD RS terdekat.'
        ]),
        when_to_see_doctor: 'KONDISI KRITIS SEGERA KE IGD: Tanda peritonitis (perut kaku papan / rebound tenderness); Demam tinggi disertai syok septik; Muntah faekal (berbau kotoran).',
        content_full: 'Akut abdomen ditandai tanda rangsang peritoneal (defans muskular kaku papan). Memerlukan dekompresi NGT, resusitasi cairan, antibiotik bedah, dan laparotomi eksplorasi segera.',
        category_id: 5,
        source_id: 2,
        status: 'ACTIVE',
        is_emergency: true,
        red_flags: 'Tanda peritonitis (perut kaku papan / rebound tenderness); Demam tinggi disertai syok septik; Muntah faekal (berbau kotoran).',
        validated_by: 'Admin Medis TeleHealth'
    },

    // --- 3. Tambahan Topik Medis Bermanfaat ---
    {
        id: 36,
        title: 'Keracunan Makanan (Food Poisoning)',
        topic_keywords: 'keracunan makanan, keracunan, makanan basi, sakit perut sehabis makan, mual muntah sehabis makan basi, diare muntah berak, intoksikasi makanan, muntaber, keracunan udang makanan kaleng',
        short_answer: 'Kondisi gangguan pencernaan akut akibat mengonsumsi makanan atau minuman yang terkontaminasi oleh bakteri, toksin mikroba, virus, atau zat kimia beracun.',
        important_points: JSON.stringify([
            'Cegah dehidrasi dengan segera meminum larutan oralit atau cairan elektrolit sedikit demi sedikit secara sering.',
            'Konsumsi makanan lunak yang mudah dicerna (bubur polos, pisang, roti tawar) setelah frekuensi muntah berkurang.',
            'Dapat mengonsumsi tablet karbon aktif (norit) sesuai dosis kemasan bila baru saja menelan makanan yang dicurigai terkontaminasi.'
        ]),
        when_to_see_doctor: 'Segera ke IGD terdekat jika muntah terus-menerus hingga tidak ada cairan yang masuk sama sekali, diare berdarah pekat, demam tinggi >38.5°C, pusing lemas berat berkunang-kunang (dehidrasi berat), atau timbul gangguan penglihatan / kelemahan otot (toksin saraf).',
        content_full: 'Keracunan makanan paling sering dipicu enterotoksin Staphylococcus aureus, Salmonella, atau Bacillus cereus. Manajemen utama terpusat pada hidrasi cairan elektrolit agresif.',
        category_id: 5,
        source_id: 1,
        status: 'ACTIVE',
        is_emergency: false,
        red_flags: 'Muntah terus menerus hingga cairan tidak bisa masuk; Diare berdarah pekat; Demam tinggi >38.5°C; Tanda dehidrasi berat dan penurunan kesadaran.',
        validated_by: 'Admin Medis TeleHealth'
    }
];

module.exports = {
    DEFAULT_CATEGORIES,
    DEFAULT_SOURCES,
    DEFAULT_KNOWLEDGE
};
