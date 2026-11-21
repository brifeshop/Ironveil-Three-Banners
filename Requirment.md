# Requirement — Ironveil: Three Banners (v10)

**Status:** Dokumen acuan tunggal (final).
**Tipe:** Modular Web App (ES Modules) — Simulator Perang Faksi Otonom (GM Observer).
**Hosting:** Netlify (statis, HTTPS). **Repo:** GitHub `brifeshop/Ironveil-Three-Banners`.
**Bahasa UI:** Bahasa Indonesia. **Identifier teknis:** Inggris.
**Catatan:** Nilai `[TUNING]` wajib dikalibrasi lewat headless simulation sebelum dikunci. Tanpa tanda = keputusan desain final.

---

## 1. Ringkasan Eksekutif & Pilar Pengalaman

Simulator perang faksi otonom berbasis web. Tiga ras — **Axion Empire**, **Belvian Union**, **Cyra Alliance** — berkembang, berpolitik, berperang, dan membangun sejarah tanpa input pemain. Pengguna berperan sebagai **GM/Observer** yang memantau radar taktis, mengatur waktu, mengintervensi dunia, dan membaca cerita yang lahir dari simulasi.

| Pilar | Pertanyaan yang harus bisa dijawab pengguna setelah 15 menit menonton |
|---|---|
| **Tonton** | "Siapa yang sedang menang dan kenapa?" |
| **Cerita** | "Siapa karakter yang saya pedulikan, dan apa yang terjadi padanya?" |
| **Intervensi** | "Apa yang terjadi kalau saya memicu ini?" |

**Kriteria keberhasilan:** dalam sesi 30 menit sim-time pada `5x`, minimal **3 peristiwa dramatis berbeda jenis** tercatat di Kronik.

---

## 2. Arsitektur & NFR

### 2.1. Dasar
1. **Modular Web App:** HTML + CSS (Tailwind CDN + kustom) + JS ES Modules. Tidak ada backend. Development di VS Code; deploy statis di Netlify.
2. **SafeStorage:** `localStorage` per origin (tidak sinkron antar perangkat), fallback RAM, auto-save tiap 15 detik waktu nyata, manual save/load, validasi skema `v10`, migrasi v8/v9 → v10 (idempotent; jika gagal, tawarkan purge).
3. **Defensive Guard:** null/undefined guard; error 1 entitas tidak menghentikan loop; entitas dikarantina + dicatat di Log Sistem.
4. **UI:** dark-mode `#050911` / panel `#0b121f`, responsif desktop & seluler (optimasi seluler P2).
5. **Nama orisinal:** tidak ada referensi RF Online di kode, komentar, atau UI. Semua string nama di `src/config.js` (`GAME_TITLE`, `RACE_NAMES`, `RELIC_NAMES`).

### 2.2. Time Engine (Wajib)
- **Fixed timestep:** `TICK_MS = 100` (10 tick/detik pada `1x`).
- Loop `requestAnimationFrame` hanya untuk render. Logika memakai accumulator:
  `accum += deltaReal * speed; while (accum >= TICK_MS) { step(); accum -= TICK_MS; }`
- Kecepatan `2x/5x/10x` = lebih banyak tick per frame, bukan delta lebih besar. Hasil identik di FPS berapa pun.
- **Batas catch-up per frame:** `MAX_TICKS_PER_FRAME = 50`.
- **Tab tersembunyi:** saat `document.hidden`, jalankan tick via `setInterval` (1 detik). Saat kembali, catch-up maks `CATCHUP_MAX_SIM_SECONDS = 600` dengan mode ringkas, lalu tampilkan modal "Selama Anda Pergi".
- **Seeded RNG:** PRNG mulberry32 dengan seed disimpan di save. Wajib untuk determinisme (AC #4) dan kalibrasi.

### 2.3. Performa & Plafon Populasi
- `MAX_POP_PER_RACE = 120` (total 360). Rekrutmen dan tombol GM `+` berhenti di plafon; Kas penuh dialihkan ke Dana Perang.
- Target: ≥50 FPS render, tick ≤8 ms pada 360 karakter + 480 monster.
- Optimasi wajib: spatial hashing (sel 4×4), `MAX_LOG = 500`, `MAX_CHAT = 200`, Kronik dipadatkan.
- Soak test: `10x` selama 2 jam waktu nyata tanpa crash, heap growth <30%, FPS turun <20%.

### 2.4. Aksesibilitas (P2)
- Mode Hemat (radar 15 FPS, animasi dimatikan) — P2.
- Kurangi Gerak (`prefers-reduced-motion`) — P2.

---

## 3. UI/UX — Radar Titik & Tata Letak

Tema Tactical Sci-Fi Dark Mode. Entitas direpresentasikan sebagai **titik/lingkaran di kanvas radar** (bukan sprite/3D).

### 3.1. Layar Pembuka
- Ringkasan dunia, deteksi save, tombol **▶ Mulai Simulasi Baru** dan **📂 Lanjutkan Save**.
- Opsi awal: **Seed dunia** (acak/manual), **Tingkat Drama** (Tenang/Normal/Dramatis), **Ukuran populasi awal** (30 default).

### 3.2. Header Atas (Sticky Command Bar)
- Lencana **Era** aktif dan nama **Musim**.
- Ikon **🔔 Sorotan**: toast peristiwa penting; klik → lompat kamera.
- Tombol GM dikelompokkan dalam menu.

### 3.3. Radar & Inspeksi

**Render:**
- Satu `<canvas>` per peta aktif, **multi-layer**: background statis, entitas, efek, overlay UI.
- Hit-testing manual (bukan DOM per entitas) untuk performa 360+480 entitas.
- `devicePixelRatio` untuk ketajaman.

**Representasi entitas:**

| Entitas | Visual |
|---|---|
| Karakter | Lingkaran warna ras. **Bentuk per peran:** SER=segitiga, DEF=kotak, SUP=belah ketupat. |
| Monster | Titik kecil. Warna per tier: abu (Ring 1–2), oranye (Ring 3), merah (Ring 4), ungu (Boss). |
| Boss | Lingkaran besar + cincin berdenyut. |
| Chip War | Ikon hex besar di Crag Mine. |
| Status | Ikon 💀 (Buronan), 🔗 (Regu), garis rivalitas antar-Nemesis di peta sama. |
| Efek | Garis laser serangan, floating text damage, lingkaran aggro, radar sweep (default desktop). |

**Kamera:** Bebas, **Ikuti Karakter**, **Auto-Sorotan** (berdasar skor ketegangan). Zoom 2× hanya di mode Ikuti Karakter. Default: fit seluruh peta 64×36.

**Label:** nama hanya saat hover/klik atau di Inspektur Fokus. Trail pergerakan: opsional, **off by default**.

**Tombol Perpindahan Peta (wajib):**
- **6 tombol tab peta selalu terlihat di atas panel radar — tanpa perlu scroll.**
- Urutan: Base Axion, Base Belvian, Base Cyra, Ether, Elan Plateau, Crag Mine.
- Indikator status: badge "War" di Crag Mine saat War aktif, badge "Boss" di Ether/Elan saat Boss hidup.
- **Shortcut keyboard 1–6**.
- Klik → kamera pindah instan (fade maks 150ms, tidak memblokir).

**Panel Bawah Radar:**
- **Inspektur Fokus:** kepribadian, peran, regu, Nemesis, Rank Veteran, riwayat 5 peristiwa terakhir, **tombol GM: ⚡ Beri Buff, 💰 Beri Emas**.
- **Log Dunia:** filter Semua / War-CP / PvP-Relic / Ekonomi-Dewan / Boss-Drop / Drama.

### 3.4. Sidebar Kanan
1. Kartu Ringkasan 3 Ras & Kas: treasury, Dana Perang, Skor Kekuatan. **Tombol 🏦 Isi Kas Ras (GM)**.
2. Panel Tab:
   - 🏛️ Dewan & Buff (5 kursi + efek + sisa masa jabatan).
   - 🏆 Hall of Fame (Top 8 CP/PvP/Kill).
   - 📜 Kronik (lini masa, pencarian, ekspor).
   - ⚔️ Rivalitas (rivalitas aktif, Buronan, Regu terkuat).
   - 🎯 Prediksi (papan skor tebakan GM).
3. Live Character Chat: filter Semua/Ras/War/Regu; input Broadcast GM (📢).

### 3.5. Ringkasan "Selama Anda Pergi"
Modal setelah catch-up tab/save-load: hasil War, perubahan Dewan, tumbangnya karakter besar, 3 sorotan teratas.

---

## 4. Kebutuhan Fungsional

### 4.1. Karakter: Ras, Peran, Kepribadian, Statistik

- **3 Ras:** Axion Empire (`#ef4444`, Axion Siege Core), Belvian Union (`#38bdf8`, Belvian Aegis Core), Cyra Alliance (`#a855f7`, Cyra Astral Core).
- **Relic = tier senjata tertinggi.** Tidak ada senjata/drop lain yang melampaui Relic +7.
- **Start:** 30 karakter (10/ras), Lv 1–3, 0 CP, 0 PvP, Novice Set.
- **Batas Level:** 1–50.
- **Nama:** pool nama + seed, tidak duplikat dalam satu ras.

**Peran:**
| Peran | Kode | Statistik relatif | Kursi Dewan |
|---|---|---|---|
| Penyerang | SER | ATK ×1.2, DEF ×0.9 | Dewan SER |
| Penahan | DEF | ATK ×0.9, DEF ×1.25, HP ×1.15 | Dewan DEF |
| Pendukung | SUP | ATK ×0.8, heal/buff kecil ke Regu | Dewan Support |

**Kepribadian (1 utama + opsional 1 sekunder):**
| Arketipe | Kecenderungan AI |
|---|---|
| Ambisius | Mengejar CP/Dewan, ikut War meski berisiko |
| Prajurit Setia | Selalu ikut War, membela Regu |
| Pemburu | Fokus PvP, mengejar Buronan & Boss |
| Pedagang | Menimbun Emas, menghindari risiko, menyumbang Kas |
| Pendendam | Bobot besar mengejar Nemesis |
| Pengecut Berhati Baja | Menghindari duel tidak adil, bertahan sampai akhir di War |

- Distribusi acak berbobot; tidak boleh satu ras punya satu arketipe >40%.
- Kepribadian tetap seumur hidup (kecuali Ascension).

**Statistik dasar [TUNING]:**
HP(L) = 120 + 35·L (× pengali peran)
ATK(L) = 10 + 4·L (× pengali peran, × Relic)
DEF(L) = 5 + 2.5·L (× pengali peran)
Damage = max(1, ATK · U(0.9,1.1) − 0.5·DEF_target)
Kritikal: 5%, ×1.5
Potion: pulih 40% HP maks, cooldown 20 detik sim; AI pakai saat HP <35% (Pengecut: <50%)

text

### 4.2. Level, EXP & Target Pacing
EXP_butuh(L → L+1) = round(60 · L^1.7) [TUNING]
EXP_kill = 30 + 6·Lm^1.4 [TUNING]

text
| Rentang | Target waktu (aktif grinding) |
|---|---|
| Lv 1 → 10 | ≤ 1 hari sim |
| Lv 10 → 30 | 2–4 hari sim |
| Lv 30 → 40 | 3–5 hari sim |
| Lv 40 → 50 | 5–8 hari sim |

**Aturan kalibrasi wajib:** headless sim 100 hari tanpa render; ≥60% karakter capai Lv 36 dalam 12 hari sim. Jika tidak, ubah koefisien, bukan aturan.

### 4.3. Peta, Monster, Ekonomi

**4.3.1. Peta & Monster**
- 6 zona: Base Axion, Base Belvian, Base Cyra, Ether, Elan Plateau, Crag Mine.
- Koordinat `64×36` unit. Jangkar markas `(14,14)`, NPC PvP `(22,20)`.
- Radius ring dari jangkar **[TUNING]:** Ring 1: 3–10, Ring 2: 10–20, Ring 3: 20–32, Ring 4: 32–46.
- Monster per markas: 4 ring × 10 = 40, `BASE_MONSTER_SCALE = 1.1`.
  - Ring 1: Lv 2–6; Ring 2: Lv 8–16; Ring 3: Lv 18–28; Ring 4: Lv 30–39.
- Respawn monster: 20 detik sim di titik spawn asal. **[TUNING]**
- Ether (Lv 40–44), Elan Plateau (Lv 45–50), Crag Mine (Lv 30–40): masing-masing 40 monster.
- Patroli radius 4 unit; Social Aggro radius 6 unit.
- Tol Zona: Lv 36–44 → Ether; Lv 41+ → Elan; tarif 100.000 sekali jalan. **100% masuk Kas Ras.**

**Scaling Monster Lv 40+ (anti-solo):**
HP_monster = base × (1 + 0.15·(L−40)) untuk L≥40 [TUNING]
DEF_monster = base × (1 + 0.10·(L−40)) untuk L≥40 [TUNING]
Enrage: HP <30% → +20% ATK untuk L≥45 [TUNING]
Social Aggro radius: 8 unit di zona Lv 40+

text
**Target desain [TUNING]:** 1 karakter Lv 50 + Relic +7 butuh ≥8–12 detik membunuh 1 monster Lv 45.

**4.3.2. Aturan ±5 Level:** selisih >5 → EXP 0, Drop 10%.

**4.3.3. Ekonomi [TUNING]**
Emas_kill(Lm) = round(4 · Lm^1.5)
Nilai_loot = Emas_kill(Lm) × U(0.8, 1.4)
Pajak_Kas = 35% dari penjualan loot bag

text
- **Potion wajib:** harga tetap per level; dibeli di Safe Zone. Gold sink utama.
- Target kalibrasi: karakter Lv 36 grinding Ring 4 mampu beli tol 100.000 dalam 1,5–3 hari sim.
- Target rekrutmen: ras dengan 40 karakter aktif merekrut +1 dalam 1–2 hari sim.
- Pengeluaran rutin: potion, tol, tempa Relic.
- Dana Perang: jika populasi di plafon dan Kas ≥1.000.000 → potong 1.000.000 menjadi +1 Dana Perang (bonus kecil di War).

**4.3.4. Kematian & Respawn**
- Mati → respawn di Safe Zone markas setelah **15 detik sim**.
- **Respawn HP = 30% HP maks** (bukan penuh).
- Kehilangan **5% EXP level berjalan** (tidak turun level) dan sebagian potion.
- **Harus beli potion** di Safe Zone untuk memulihkan HP penuh.
- **Potion Darurat:** jika emas = 0 dan HP <30%, beri 1 potion gratis per hari sim.
- Kematian di War **tanpa** penalti EXP (penalti CP/PvP tetap berlaku, §4.7.1).

### 4.4. Rivalitas, Buronan, Regu

**4.4.1. Nemesis & Dendam**
- Dibunuh musuh sama ≥2× dalam 3 hari sim → Nemesis (maks 1 aktif).
- Bobot target AI Pendendam ×3, lain ×1.5 menuju Nemesis di peta sama.
- Membunuh Nemesis: +300 PvP Point + Kronik "Balas Dendam".
- Rivalitas berakhir setelah Nemesis terbunuh atau 5 hari sim tanpa kontak.

**4.4.2. Buronan (anti-snowball)**
- 5 kill beruntun tanpa mati → Buronan (💀). Membunuh Buronan: +1.000 PvP + 25% emas. Hilang saat mati.

**4.4.3. Regu (Squad)**
- AI membentuk regu 3–5 karakter satu ras, peta sama, level dekat, arketipe cocok.
- Nama otomatis, Loyalitas 0–100, berbagi aggro.
- Bonus: +5% EXP saat ≥3 anggota ≤8 unit; +1 SUP aktif → heal kecil.
- Bubar jika Loyalitas <20.
- Mentor: Lv 40+ Prajurit Setia → Lv ≤10 satu ras, +10% EXP keduanya. Tercatat di Kronik.

**4.4.4. Pengkhianatan (Defect) — P2**
- Maks 1 pembelot per 5 hari sim. Membawa CP & Nemesis. Peristiwa besar.

### 4.5. Chip War — State Machine

**4.5.1. Jadwal:** pergantian hari (600 detik sim pada `1x`) memulai siklus. Peserta: Lv 30+ hidup. Lokasi: Crag Mine.

**4.5.2. State Machine**
[DAMAI] → (hari berganti) → [PERSIAPAN 15s] → [PERTEMPURAN 120s] → [PENYELESAIAN 10s] → [DAMAI]
│
└─(batal §4.5.4)→ [DITUNDA] → [DAMAI]

text
- PERSIAPAN: teleport peserta ke titik masuk ras; chip aktif.
- PERTEMPURAN: 3 Control Chip aktif. Berakhir saat 120 detik habis atau hanya 1 chip tersisa.
- PENYELESAIAN: hitung peringkat, bagikan CP, tetapkan Juara Bertahan, Pemilu jika jatuh tempo, peserta kembali.

**4.5.3. Chip — Spesifikasi Final**
HP_chip = 30.000 [TUNING]
DEF_chip = DEF armor terkuat di game [TUNING]
(diturunkan dari konstanta armor terkuat — satu sumber kebenaran)
Regen_chip = 0.5% HP/detik setelah 3 detik tidak diserang [TUNING]

text
- **Tanpa** damage reduction khusus atau damage cap. Semua lewat rumus damage standar (§4.1.3).
- Tujuan: solo Lv 50 + Relic +7 tidak bisa hancurkan chip dalam 120 detik; 5 karakter bisa <90 detik.
- **Kondisi menang/seri/hancur:**
  - Chip hancur (HP=0) → ras tereliminasi dari War (karakter tetap PvP).
  - Peringkat: (1) ras chip hidup urut HP% menurun; (2) ras tereliminasi urut waktu eliminasi menurun.
  - Peringkat 1: +5.000 CP/peserta; Peringkat 2: +3.000; Peringkat 3: +1.000.
  - **Seri:** dua ras teratas selisih HP chip ≤2 poin persen → keduanya +3.000 CP, tanpa Juara Bertahan baru.
  - **Last Hit:** pukulan penghancur terakhir chip → +2.000 PvP. Jika efek area, diberikan ke kontributor damage terbaru dalam 3 detik.

**4.5.4. Peserta Minimum & War Awal**
- War Ditunda jika <2 ras punya ≥3 peserta Lv 30+. Tidak ada CP; Chat komentar.
- Tepat 2 ras → War 1v1 tanpa aliansi.
- Ras dengan 1–2 peserta tidak ikut (chip tidak aktif).
- War pertama: tanpa Juara Bertahan, free-for-all 3 arah.
- Semua mulai Lv 1–3 → War bermakna setelah beberapa hari sim ("Era Tenang").

**4.5.5. Aliansi 2-vs-1**
- Setelah ada Juara Bertahan: dua penantang bersekutu menyerang chip Juara.
- Chip sekutu tidak dapat saling diserang.
- Jika chip Juara hancur → aliansi bubar, dua ras sisa saling serang.
- Last Hit dihitung per chip; tidak ada pembagian ganda.

**4.5.6. Penyeimbang**
- Beban Mahkota: chip Juara +0% HP, tapi diserang 2 ras.
- Semangat Juang: peringkat 3 dua War berturut-turut → +8% ATK, +10% regen chip War berikutnya (tidak ditumpuk).
- Dana Perang: +1% HP chip per unit (maks +10%).
- Morale ras 0–100%; <30% → partisipasi War turun 20%. **[TUNING]**

### 4.6. Dewan & Politik

**4.6.1. Pencalonan**
- **10.000 CP adalah syarat kepemilikan, bukan biaya** (CP tidak dikurangi).
- Kandidat: peran sesuai + CP ≥10.000. Archon & Warchon terbuka semua peran.
- Pemilu berkala tiap 3 menit sim atau manual GM; tidak saat War (ditunda ke PENYELESAIAN).
- Tanpa kandidat → kursi kosong (`-`).

**4.6.2. Mekanisme**
Skor = CP_akumulatif·0.6 + Reputasi·0.3 + Dukungan_Regu·0.1

text
- Incumbent +5%. Masa jabatan 3 siklus.

**4.6.3. Buff Kursi [TUNING]**
| Kursi | Efek |
|---|---|
| Archon | +5% EXP seluruh ras; +5% Morale awal War |
| Warchon | +5% ATK peserta War |
| Dewan SER | +6% ATK peran SER |
| Dewan DEF | +6% DEF & HP peran DEF |
| Dewan Support | +10% efektivitas potion; +5% Emas dari Pajak Kas |

Kursi kosong = tidak ada buff. Tidak ditumpuk antar-kursi sama.

**4.6.4. Drama Politik**
- Kampanye 30 detik sim sebelum pemilu (debat di Chat ras, sesuai kepribadian).
- Skandal: 3% per pemilu per pejabat Pedagang/Ambisius → Reputasi turun + Kronik.
- Mosi Tidak Percaya: kalah peringkat 3 dua War berturut-turut **dan** Morale <40% → Archon digulingkan lewat voting Dewan.

### 4.7. PvP Point & Relic

**4.7.1. Perolehan PvP Point**
- Bunuh musuh (War/Open PvP): **+100 PvP (baseline)**.
- Last Hit chip: +2.000.
- Bonus Dendam +300, Buronan +1.000.
- Underdog: bunuh musuh CP ≥1.5× CP sendiri → +25% PvP (dari baseline + transfer).
- Anti-farm: bunuh musuh sama >3× dalam 60 detik sim → **0 PvP (baseline & transfer)**; korban tetap −150.
- **Transfer CP & PvP saat PvP kill:**
  - Baseline: pembunuh +100 PvP; korban −150 PvP (min 0).
  - Transfer: korban −15% CP & −15% PvP (dari nilai saat ini, setelah baseline; min 0).
    Pembunuh +10% CP & +10% PvP dari nilai korban sebelum dikurangi (= 2/3 dari yang hilang).
  - Net: CP −5%, PvP −50 baseline −5% transfer.
  - Berlaku di War dan Open PvP; tidak berlaku untuk kill monster.

**4.7.2. Open PvP**
- Di Crag Mine (luar War) dan markas lawan. **Dilarang** di Ether & Elan (zona netral Boss).
- Markas sendiri = Safe Zone. Safe Zone radius 8 dari `(14,14)` melarang PvP semua ras.

**4.7.3. Relic [TUNING]**
- Harga: 5.000 PvP di NPC `(22,20)`; sekali per karakter.
- `ATK_mult = 1.5 + 0.08·n` (n=0–7) → maks ≈2.06×. **Relic = tier senjata tertinggi.**
- Tempa +1…+7: `PvP = 500·n`, `Emas = 50.000·n`, `Talic = n`. Sukses 100% (n≤3), 80% (4–5), 60% (6–7); gagal tidak turun level, bahan hangus.
- Penyeimbang: Relic vs DEF dengan Dewan DEF aktif → damage −8%.
- Batas: maks 25% populasi aktif per ras (≤30 Relic/ras).

### 4.8. Boss, Talic & Event

- **Boss Penjaga** (tetap di Ether & Elan, respawn 1 hari sim) dan **Boss Event** (dipicu Direktur/GM di Ether/Elan/markas; **tidak pernah di Crag Mine**).
- Dropdown "+ Boss" GM menolak `crag_mine` (disabled + tooltip).
- **Talic hanya dari Boss** dan hadiah War. Monster reguler tidak menjatuhkan Talic.
- Pembagian: maks 8 karakter damage tertinggi. `Talic_total = 4 + (Level_Boss−40)` (Penjaga) atau `8 + ...` (Event). **[TUNING]**
- Kontes antar-ras: kontribusi damage terbesar → +2% Morale + Kronik "Penakluk Boss".
- Boss berfase 3 (100–66–33%): fase 2 panggil minion, fase 3 enrage +25% ATK.

### 4.9. Endgame: Ascension, Veteran, Musim

- **Ascension:** Lv 50 + CP ≥20.000 → Lv 1, reset EXP/Emas/PvP; **Relic, tempa, CP dipertahankan**. Rank Veteran 1–5 (+3% ATK/HP per rank, gelar, efek kosmetik). Kepribadian sekunder opsional. Kronik "Lahir Kembali".
- Rank 5 dapat **Pensiun** → Legenda (Hall of Legends, bonus pasif kecil ke Regu keturunan).
- **Musim:** tiap 20 hari sim; rekap skor ras, simpan Hall of Fame musim ke Kronik, Era baru dinamai otomatis. Statistik karakter tidak direset.

### 4.10. Direktur Drama

**Ketegangan (0–100):**
Ketegangan = 0.3·(kekalahan beruntun) + 0.2·(Morale terendah)

0.2·(selisih Skor Kekuatan) + 0.15·(Buronan aktif)

0.15·(lama tanpa peristiwa besar)

text
**[TUNING]** — bobot awal.

**Pemicu:**
- Ketegangan <25 selama >3 hari sim → peristiwa positif/netral.
- Ketegangan >80 → pendingin (Gencatan Senjata, Bantuan Logistik), atau biarkan jika Tingkat Drama = Dramatis.
- Cooldown: maks 1 peristiwa per 2 hari sim; jenis sama tidak berulang dalam 5 hari sim.
- Semua tercatat **[Direktur]**.

**Katalog (P1, dikurangi di P0):** Boss Event, Badai Meteor, Festival Talic, Pasar Gelap, Wabah Potion, Gencatan Senjata.

### 4.11. Kronik, Era, Highlight

- Skor Kepentingan ≥40 masuk Kronik. Contoh: War 80, Archon tumbang 90, Relic pertama 60, Balas Dendam 50, Boss tumbang 55, Ascension 45, pembelot 85.
- Entri: waktu sim, jenis, ringkasan 1 kalimat (Bahasa Indonesia), karakter terkait (klik → kamera).
- Pemadatan: entri >100 hari sim digabung per Musim (maks 2.000 entri).
- Hall of Legends: Legenda, Archon terlama, Last Hit terbanyak, kill streak, War tertipis.
- Highlight Reel: "Ringkasan Hari ini" — 5 peristiwa skor tertinggi/1 hari sim, tombol play kamera (data posisi tersimpan).
- Ekspor: `.md` (naratif) dan `.json` (data).
- Replay: **P2**.

### 4.12. Prediksi GM

- Sebelum War (PERSIAPAN): tebak ras pemenang dan opsional Last Hit.
- Poin: +10 pemenang, +25 Seri, +40 Last Hit; salah 0.
- Papan skor & streak disimpan. Tidak memengaruhi simulasi.

### 4.13. Chat Berkonteks & Anti-Repetitif

- Pool kalimat per (situasi × kepribadian), minimal 6 varian per kombinasi inti.
- Slot dinamis: nama monster, level, Nemesis, Regu, Boss, hasil War terakhir.
- Memori pendek: rujuk 1 peristiwa terakhir karakter.
- Anti-repetisi: template sama tidak dalam 30 pesan terakhir; 1 karakter maks 1 pesan per 8 detik sim; situasi tidak berulang >1×/karakter/hari sim.
- Bobot siaran: pesan penting (Archon terpilih, Boss tumbang, Last Hit) selalu tampil dengan penandaan.
- Kanal Regu dan Broadcast GM (📢).

### 4.14. Alat GM

**Kontrol waktu:** `❚❚`, `1x`, `2x`, `5x`, `10x`.

**Intervensi populasi:** `+`/`−` per ras (plafon, minimal 5 karakter/ras).

**Picu War / Pemilu / Boss Event** (validasi aturan; Boss tidak di Crag Mine).

**Konsol Takdir Dasar (P0):**
- **⚡ Beri Buff (1 karakter):** +25% ATK / +25% DEF / +50% HP maks / Heal penuh. **Durasi 1 hari sim.** Maks 1 buff aktif per karakter. Tercatat `[GM]`.
- **💰 Beri Emas (1 karakter):** maks **100.000 per aksi**, konfirmasi. Tercatat `[GM]`.
- **🏦 Isi Kas Ras:** maks **100.000 per aksi**, konfirmasi. Tercatat `[GM]`.

**Konsol Takdir Lanjutan (P2):** Buronan manual, beri Relic, picu Ascension. Tercatat `[GM]`.

**Save/Load/Reset:** Reset dengan konfirmasi dua langkah.

---

## 5. Model Data

```js
Character: { id, name, race, role, archetype, archetypeSecondary, level, exp,
             hp, cp, pvp, gold, potions, relic:{owned, tier}, vetRank,
             loyalty, squadId, nemesisId, wanted, killStreak, gmBuff:{type,expiresAt},
             history[5], pos:{x,y,map}, state }
Race:      { id, treasury, warFund, morale, wins, council[5], championFlag }
World:     { schema:10, seed, simTick, day, season, era, warState, chips[3],
             director:{tension, cooldowns}, chronicle[], predictions:{score,streak},
             gmLog[] }
Migrasi v8/v9 → v10 idempotent.

gmLog[] mencatat semua aksi GM (untuk Kronik [GM] dan debugging).

6. Acceptance Criteria
Inisialisasi & Struktur

Start awal: 30 karakter Lv 1–3, 0 CP, 0 PvP, Dewan kosong, ≥3 arketipe/ras, tidak ada nama duplikat.

Zonasi monster: 40/markas (10/ring), patroli + Social Aggro; Crag/Ether/Elan 40 monster.

Monster reguler tidak pernah drop Talic; selisih >5 level → 0 EXP, 10% drop.

Waktu & Stabilitas

10x, seed sama → hash state identik di FPS 30 vs 60 (setelah 1.000 tick).

Tab tersembunyi 5 menit → modal "Selama Anda Pergi" + dunia maju ≤600 detik sim.

Soak 2 jam 10x: tanpa crash, heap growth <30%, FPS turun <20%.

360 karakter + 480 monster: ≥50 FPS render, tick ≤8 ms.

Injeksi null di 1 entitas → loop lanjut, entitas dikarantina & tercatat.

War & Politik

War pertama 3 arah; <2 ras ≥3 peserta Lv 30+ → DITUNDA, tanpa CP.

Chip hancur → ras tereliminasi; peringkat sesuai §4.5.3; selisih ≤2% → Seri.

Aliansi: chip sekutu tidak bisa saling serang; chip Juara hancur → aliansi bubar.

Last Hit +2.000 hanya saat hancurkan chip, bukan bunuh pemain.

CP <10.000 tidak bisa daftar; CP tidak berkurang; kursi kosong jika tidak ada kandidat.

Mosi Tidak Percaya hanya setelah 2× peringkat 3 + Morale <40%.

PvP, Relic, Boss

Relic 5.000 PvP; ATK maks ≈2.06× di +7; tidak ada ras >25% pemilik Relic.

5 kill beruntun → Buronan; membunuh Buronan +1.000 PvP.

Boss Event/Penjaga tidak pernah di crag_mine; dropdown GM menolak.

Talic hanya dari Boss & hadiah War; 10.000 kill monster reguler → 0 Talic.

PvP kill: pembunuh +100 PvP baseline; korban −150 PvP (min 0); transfer korban −15% CP & PvP, pembunuh +10% dari nilai korban (2/3 yang hilang); net CP −5%, PvP −50 baseline −5% transfer.

Anti-farm: bunuh musuh sama >3×/60 detik → pembunuh 0 (baseline & transfer); korban tetap −150.

Transfer CP/PvP tidak berlaku untuk kill monster; tidak membuat nilai negatif.

Cerita & Keterlibatan

5x selama 30 menit sim → Kronik ≥3 peristiwa dramatis berbeda jenis.

Tidak ada chat sama dalam 30 pesan; tidak ada karakter >1 pesan/8 detik sim.

Direktur Drama ≤1 peristiwa/2 hari sim; tiap pemicu [Direktur].

Ascension: Lv 50 + CP ≥20.000 → Lv 1, CP & Relic dipertahankan, Rank Veteran +3%.

Persistensi

Save → Load state identik (hash sama) termasuk Kronik, Prediksi, seed.

Load save v8/v9 → dunia v10 valid atau pesan jelas + purge aman.

Chip & Ekonomi (tambahan v10)

AC-W1: 1 karakter Lv 50 + Relic +7 tidak dapat menghancurkan chip (HP 30.000, DEF armor terkuat) sendirian dalam 120 detik.

AC-W2: 5 karakter Lv 50 + Relic +7 dapat menghancurkan chip dalam <90 detik.

Mati → respawn 15 detik sim dengan HP 30%; harus beli potion untuk penuh.

Potion Darurat hanya terpicu jika emas = 0 dan HP <30%; maks 1×/hari sim.

Buff GM berdurasi 1 hari sim, maks 1 aktif/karakter, tercatat [GM].

Beri Emas & Isi Kas Ras maks 100.000/aksi, konfirmasi, tercatat [GM].

6 tombol peta selalu terlihat tanpa scroll; shortcut 1–6 berfungsi.

Monster Lv 45+ enrage di HP <30%; Social Aggro radius 8 di zona Lv 40+.

7. Fase Pengembangan
Fase	Isi	Gate keluar
P0 — Fondasi	Time engine + RNG; plafon populasi; rumus + kalibrasi headless; state machine War; klarifikasi CP; kematian/respawn (HP 30%, potion darurat); chip (HP 30.000 + DEF armor terkuat + regen); monster Lv 40+ scaling + enrage; PvP baseline + transfer; Konsol Takdir dasar; radar titik + 6 tombol peta; AC 1–21, 26–35	Simulasi stabil & seimbang; AC chip lolos
P1 — Cerita	Kepribadian & peran penuh; Nemesis, Buronan, Regu; penyeimbang Relic; Direktur Drama (katalog dikurangi); Kronik dasar; Chat anti-repetitif; AC 22–24	Sesi 30 menit menghasilkan cerita
P2 — Pendalaman	Defect; Ascension penuh & Musim; Replay UI; Prediksi; Konsol Takdir lanjutan; Mode Hemat; optimasi seluler	Retensi jangka panjang
Aturan gate: jangan lanjut fase berikutnya sebelum gate fase sebelumnya lulus.

8. Peta Modul untuk VS Code
text
ironveil-three-banners/
├── index.html
├── requirement.md
├── README.md
├── .gitignore
├── netlify.toml
└── src/
    ├── main.js
    ├── config.js
    ├── core/
    │   ├── rng.js
    │   ├── time-engine.js
    │   ├── storage.js
    │   └── world.js
    ├── entities/
    │   ├── characters.js
    │   ├── monsters.js
    │   └── combat.js
    ├── systems/
    │   ├── war.js
    │   ├── council.js
    │   ├── pvp.js
    │   ├── relic.js
    │   ├── boss.js
    │   ├── squad.js
    │   ├── director.js
    │   └── chronicle.js
    ├── ui/
    │   ├── radar.js
    │   ├── sidebar.js
    │   ├── inspector.js
    │   ├── chat.js
    │   └── gm-console.js
    └── sim/
        └── headless.js
Urutan implementasi P0:

config.js → core/rng.js → core/time-engine.js → core/world.js.

entities/characters.js + entities/monsters.js + entities/combat.js.

sim/headless.js + kalibrasi EXP/emas/pacing.

systems/war.js + chip (AC-W1/W2).

systems/council.js + systems/pvp.js (baseline + transfer).

ui/gm-console.js dasar.

ui/radar.js + 6 tombol peta.

core/storage.js + migrasi.

Uji semua AC P0.

9. Asumsi & Risiko
Asumsi final:

Tol masuk Kas Ras.

CP adalah syarat, bukan biaya.

Open PvP dilarang di Ether/Elan dan Safe Zone markas.

Kematian tidak menurunkan level; respawn HP 30%.

Ascension mempertahankan CP dan Relic.

Seri bila selisih HP chip ≤2 poin persen.

Proyek publik (GitHub + Netlify) — nama orisinal wajib.

Target utama desktop; responsif Tailwind; Mode Hemat P2.

localStorage per perangkat; tidak sinkron antar perangkat.

PvP kill: baseline +100/−150 PvP; transfer −15% CP & PvP korban, +10% ke pembunuh (2/3 yang hilang); net CP −5%, PvP sink. Min 0. Anti-farm mematikan baseline & transfer pembunuh, korban tetap −150.

Risiko:

Risiko	Dampak	Mitigasi
Scope creep	Tinggi	Fase P0/P1/P2 + gate
Koefisien [TUNING] salah	Tinggi	Headless sim 100 hari sebelum P1
Chat repetitif	Sedang	Pool ≥6 varian, memori, anti-repetisi
Direktur terasa curang	Sedang	Label [Direktur], Tingkat Drama bisa dimatikan
File tersebar membingungkan	Sedang	Struktur folder = peta mental (§8)
localStorage hilang saat ganti domain	Rendah	Dokumentasikan; ekspor save manual
10. Pertanyaan Terbuka
Tidak ada yang memblokir P0. Bisa dijawab sambil coding:

Nama Era otomatis: pola "Era {kata sifat} {ras dominan}" — daftar kata sifat di config.js.

Buff GM "Heal penuh": aksi instan (tidak memakai slot buff), tercatat [GM].

Format ekspor Kronik .md: per hari sim, dengan header.

text

---

Dokumen final siap disimpan. Ringkasan perubahan dari versi sebelumnya:
- **§4.7.1** — PvP kill sekarang punya **baseline +100/−150** dan **transfer −15%/+10%** (2/3 dari yang hilang).
- **§6 AC 19–21** — acceptance PvP baru.
- **§9 poin 10** — asumsi PvP final.
- **§7 P0** — PvP baseline + transfer masuk P0.

Silakan review di VS Code. Kalau sudah oke, kita mulai **modul P0 pertama** (`config.js`, `rng.js`, `time-engine.js`, `index.html`, `main.js`).