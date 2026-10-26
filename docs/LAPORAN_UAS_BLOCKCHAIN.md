**UNIVERSITAS SILIWANGI**  
**FAKULTAS TEKNIK**  
**PROGRAM STUDI INFORMATIKA**

# **LAPORAN KEGIATAN BLOCKCHAIN (UAS KELOMPOK)**

Tahun Akademik 2026/2027 Semester Ganjil

| Identitas | Isian |
| :--- | :--- |
| **Jenis laporan** | UAS kelompok |
| **Judul kasus atau proyek** | Rancang Bangun Sistem Simulasi Verifikasi Kredensial Akademik Berbasis Smart Contract Solidity dan Antarmuka DApp pada Jaringan Lokal Hardhat yang Patuh Regulasi Privasi Data |
| **Nama dan NPM** | Hidayatullah — NPM: 237006000 (Anggota C / Mahasiswa) |
| **Anggota dan peran (UAS)** | 1. **Pandu Dwi Ashidiq** — NPM: 237006001 — Anggota A: Smart Contract & Arsitektur Sistem (Commit: `ca41dda`, `91ff362`)<br>2. **Faris Izza** — NPM: 237006002 — Anggota B: Testing, Deployment, & Debugging (Commit: `fee55d1`, `7abf57d`, `462ac63`, `3591bce`)<br>3. **Hidayatullah** — NPM: 237006003 — Anggota C: Frontend DApp & Presentasi (Commit: `36ea563`, `c8b87e9`, `7bb5b8d`, `9df8517`)<br>4. **Rifqal Munzammil** — NPM: 237006004 — Anggota D: Audit Keamanan & Tata Kelola (Commit: `9128dae`) |
| **Kelas / semester** | Informatika / 7 |
| **Mata kuliah / kode** | Blockchain / KP70067008 |
| **Dosen pengampu** | Dr. Ir. Nur Widiyasono, M.Kom. |
| **Tanggal kegiatan** | 26 Oktober 2026 |

---

# **Ringkasan Kegiatan**

Praktik pemalsuan ijazah dan lambatnya verifikasi manual dokumen kelulusan konvensional menjadi permasalahan mendasar dalam tata kelola administrasi akademik perguruan tinggi. Di sisi lain, sistem basis data terpusat rentan terhadap manipulasi internal (*single point of failure*) serta berisiko melanggar ketentuan kerahasiaan data pribadi apabila informasi mahasiswa dipublikasikan secara terbuka. Kegiatan proyek ini bertujuan merancang dan mengimplementasikan sistem simulasi verifikasi kredensial akademik terdesentralisasi menggunakan smart contract Solidity (`AcademicCredential.sol`) pada jaringan lokal Hardhat EVM (Chain ID: 31337) yang diintegrasikan dengan aplikasi web terdesentralisasi (DApp) berbasis Ethers.js v6. Metode yang diterapkan memisahkan secara ketat batas penyimpanan data: data sensitif (*Personally Identifiable Information* - PII) dan berkas fisik ijazah disimpan secara *off-chain*, sementara hanya sidik jari digital dokumen berupa hash kriptografis Keccak-256 32-byte (`docHash`), status validitas, dan jejak persetujuan pemilik (*Holder Consent*) yang dicatat secara *on-chain*.

Hasil pengujian menunjukkan sistem berhasil memverifikasi integritas dokumen secara instan dan bebas biaya gas (*zero gas fee*) melalui pemanggilan fungsi `view`. Pengujian unit mencakup 39 skenario dengan tingkat keberhasilan 100% (*passing*) serta capaian cakupan kode 100% pada *statements*, *lines*, dan *functions*, serta 89,71% pada *branches*. Audit keamanan berbasis metodologi STRIDE berhasil memitigasi kerentanan *Gas Limit Denial of Service* dengan membatasi *batch issuance* maksimal 50 data, menegakkan kontrol akses bertingkat (*Role-Based Access Control*), dan mengimplementasikan mekanisme jeda darurat (*Pausable*). Rekomendasi akhir menyarankan pemanfaatan Layer-2 Rollup untuk implementasi publik berskala nasional guna meminimalkan biaya transaksi, serta penggunaan *Multi-Signature Wallet* untuk desentralisasi wewenang institusi. Keterbatasan sistem saat ini berada pada pengujian jaringan simulasi lokal dan belum dihubungkan langsung ke pangkalan data PDDIKTI secara otomatis.

---

# **1 Pendahuluan**

## **1.1 Latar belakang dan tujuan**
Integritas kredensial akademik seperti ijazah dan transkrip nilai merupakan fondasi kepercayaan dunia industri terhadap lulusan perguruan tinggi. Namun, proses verifikasi ijazah saat ini masih didominasi mekanisme manual melalui surat konfirmasi resmi, legalisir basah, atau portal berbasis database sentral yang rentan terhadap pemalsuan data, serangan siber, dan kolusi internal. 

Proyek ini bertujuan untuk:
1. Merancang arsitektur smart contract berbasis Ethereum Virtual Machine (EVM) dengan kontrol akses bertingkat (*Admin*, *Issuer*, *Revoker*) dan fitur persetujuan eksplisit pemilik data (*Holder Consent*).
2. Membangun antarmuka DApp modern yang menghubungkan dompet kripto (*wallet*) dengan smart contract untuk 4 peran pemangku kepentingan.
3. Menjamin kepatuhan sistem terhadap **Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)** melalui pendekatan *client-side hashing* dan pemisahan *on-chain/off-chain*.
4. Menguji keandalan kode melalui 39 unit test, mengukur metrik *coverage*, mendokumentasikan kasus debugging, dan melakukan audit keamanan menyeluruh.

Pertanyaan teknis utama yang dijawab dalam proyek ini adalah bagaimana membuktikan keaslian dokumen akademik secara independen tanpa biaya transaksi gas (*zero gas fee*) oleh publik, sekaligus mencegah kebocoran data pribadi mahasiswa pada buku besar (*ledger*) publik.

## **1.2 Ruang lingkup**
Ruang lingkup kegiatan mencakup:
1. **Dataset Simulasi**: Data kredensial akademik dummy mahasiswa Universitas Siliwangi (contoh ID: `UNSIL/INF/2026/001`, `UNSIL/INF/2026/002`) dengan file dokumen simulasi berformat teks dan PDF.
2. **Jaringan Blockchain**: Jaringan lokal Hardhat Network (Chain ID: 31337, RPC: `http://127.0.0.1:8545`).
3. **Smart Contract**: Berbasis Solidity versi 0.8.20 dengan pustaka standar OpenZeppelin (`AccessControl`, `Pausable`).
4. **Antarmuka Pengguna**: Single-page application (SPA) HTML5/Vanilla JavaScript menggunakan pustaka Ethers.js v6.13.4 yang terhubung ke Web3 Provider (MetaMask).
5. **Batasan Kegiatan**: Seluruh pengujian dan simulasi dilakukan pada lingkungan lokal *non-production*, tidak menggunakan saldo ETH bernilai riil, dan data pribadi mahasiswa tidak diunggah ke internet publik.

---

# **2 Data, Alat, dan Reproduksibilitas**

| Komponen | Keterangan / rujukan |
| :--- | :--- |
| **Dataset atau use case** | Simulasi Verifikasi Kredensial Akademik Universitas Siliwangi TA 2026/2027 (Data dummy berupa ID kredensial, alamat wallet mahasiswa, dan hash dokumen PDF/teks). |
| **Lingkungan** | Sistem Operasi: Windows 11; Node.js v18+; Hardhat Local Network; Chain ID: `31337`; RPC Endpoint: `http://127.0.0.1:8545/`. |
| **Alat dan versi** | Solidity Compiler: `0.8.20` (target EVM: Paris); Hardhat: `v2.29.1`; OpenZeppelin Contracts: `v5.x`; Ethers.js: `v6.13.4`; Chai: `v4.5.0`; Mocha Test Runner; python-docx & python-pptx. |
| **Repositori / commit** | Repositori GitHub: `https://github.com/studentsinformatics23/SimulasiUASBlockchain.git`; Commit rujukan final: `9df8517`. |
| **Artefak awal** | Smart Contract: [`contracts/AcademicCredential.sol`](contracts/AcademicCredential.sol); Antarmuka DApp: [`frontend/index.html`](frontend/index.html); Unit Test: [`test/AcademicCredential.test.js`](test/AcademicCredential.test.js); Diagram: [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg). |
| **Langkah reproduksi** | 1. Instalasi dependensi: `npm install`<br>2. Kompilasi smart contract: `npx hardhat compile`<br>3. Eksekusi pengujian: `npx hardhat test`<br>4. Periksa cakupan kode: `npx hardhat coverage`<br>5. Jalankan local chain: `npx hardhat node` (Terminal 1)<br>6. Deployment kontrak: `npx hardhat run scripts/deploy.js --network localhost` (Terminal 2)<br>7. Jalankan frontend: Buka file `frontend/index.html` pada browser yang terhubung ke ekstensi MetaMask (jaringan Hardhat 31337). |

---

# **3 Catatan Pelaksanaan**

| Tanggal/tahap | Kegiatan yang dilakukan | Hasil dan rujukan bukti |
| :--- | :--- | :--- |
| 26 Okt 2026 / Tahap 1 | Inisialisasi repositori Git, perancangan arsitektur sistem on-chain vs off-chain, dan pembuatan diagram SVG. | [B-01] Berkas [`docs/ARCHITECTURE_DESIGN.md`](docs/ARCHITECTURE_DESIGN.md) & [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg); Commit `ca41dda`. |
| 26 Okt 2026 / Tahap 2 | Penulisan kode smart contract `AcademicCredential.sol` dengan OpenZeppelin AccessControl dan Pausable. | [B-02] Berkas [`contracts/AcademicCredential.sol`](contracts/AcademicCredential.sol); Kompilasi sukses 7 file Solidity; Commit `91ff362`. |
| 26 Okt 2026 / Tahap 3 | Penyusunan test suite komprehensif, eksekusi 39 pengujian unit (positif, negatif, batas, hak akses). | [B-03] Berkas [`test/AcademicCredential.test.js`](test/AcademicCredential.test.js); Hasil terminal: Seluruh 39 unit test lulus 100% (*passing*); Commit `fee55d1`. |
| 26 Okt 2026 / Tahap 4 | Pengujian cakupan kode menggunakan `hardhat-coverage` dan pencatatan metrik. | [B-04] Laporan Coverage: Statements 100%, Lines 100%, Functions 100%, Branches 89,71%; Commit `7abf57d`. |
| 26 Okt 2026 / Tahap 5 | Deployment kontrak ke Hardhat Local Network, pencatatan alamat kontrak dan transaction hash. | [B-05] Berkas [`docs/DEPLOYMENT_RECORD.md`](docs/DEPLOYMENT_RECORD.md); Kontrak: `0x5FbDB2315678afecb367f032d93F642f64180aa3`; Tx: `0xad6721...`; Commit `462ac63`. |
| 26 Okt 2026 / Tahap 6 | Pengembangan antarmuka web DApp 4 portal (Admin, Issuer, Holder, Verifier) & client-side hasher. | [B-06] Berkas [`frontend/index.html`](frontend/index.html); Integrasi Ethers.js v6 & MetaMask; Commit `36ea563` & `c8b87e9`. |
| 26 Okt 2026 / Tahap 7 | Audit keamanan model STRIDE, mitigasi DoS Gas Limit batch, investigasi kasus debugging konversi `bytes32`. | [B-07] Berkas [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) & [`docs/DEBUGGING_RECORD.md`](docs/DEBUGGING_RECORD.md); Retest 4 skenario baru lulus; Commit `9128dae` & `7bb5b8d`. |
| 26 Okt 2026 / Tahap 8 | Penyusunan evaluasi privasi & skalabilitas (P4), pembuatan file PPTX presentasi (P5), dan sinkronisasi repo. | [B-08] Berkas [`docs/EVALUASI_PRIVASI_SKALABILITAS.md`](docs/EVALUASI_PRIVASI_SKALABILITAS.md) & [`docs/Presentasi_UAS_Blockchain.pptx`](docs/Presentasi_UAS_Blockchain.pptx); Commit `9df8517`. |

> **Keterangan Kode Bukti:**
> * **[B-01] Desain & Arsitektur**: Observasi pemisahan lapisan client, bridge, blockchain, dan off-chain menghasilkan jaminan kepatuhan privasi data pribadi.
> * **[B-02] Smart Contract**: Kontrak Solidity menggunakan pragma `^0.8.20` dengan custom errors menghemat konsumsi gas saat transaksi revert.
> * **[B-03] Log Testing**: Eksekusi `npx hardhat test` memvalidasi seluruh alur bisnis kredensial dari penerbitan, delegasi izin, hingga pencabutan.
> * **[B-04] Log Coverage**: Branch coverage 89,71% mencerminkan seluruh percabangan krusial logika validasi hak akses dan status kredensial telah teruji.
> * **[B-05] Catatan Deployment**: Transaksi tercatat pada Blok 1 dengan konsumsi gas stabil di bawah batas blok Hardhat.
> * **[B-06] Antarmuka Frontend**: Interaksi Web3 secara asinkron berhasil memancarkan dan menangkap event log transaksi secara langsung di layar.
> * **[B-07] Audit Keamanan**: Rekayasa parameter batas `MAX_BATCH_SIZE = 50` memutus vektor serangan kehabisan gas pada loop array dinamis.
> * **[B-08] Berkas Final P4/P5**: Dokumen evaluasi nonfungsional dan materi presentasi 10 slide siap disajikan untuk evaluasi tim.

---

# **5 Bagian Khusus UAS**

## **5.1 Desain solusi dan smart contract (Project 1)**

### 5.1.1 Stakeholder dan Kebutuhan Trust
Sistem melibatkan 5 entitas pemangku kepentingan:
1. **Admin Kampus (`DEFAULT_ADMIN_ROLE`)**: Memegang wewenang pendaftaran dan pencabutan peran Issuer/Revoker, serta penghentian operasional darurat (*emergency pause*).
2. **Issuer (Fakultas/Bagian Akademik)**: Memegang `ISSUER_ROLE` untuk menerbitkan kredensial tunggal maupun batch, serta mencabut kredensial yang diterbitkannya jika terjadi kesalahan administrasi.
3. **Revoker (Komite Etik / SPI)**: Memegang `REVOKER_ROLE` untuk mencabut kredensial atas dasar pelanggaran akademik, pemalsuan data, atau keputusan rektorat.
4. **Holder (Mahasiswa)**: Memiliki hak mutlak (*self-sovereignty*) atas izin akses data pribadi dengan memberikan persetujuan on-chain (`grantAccess`) kepada pihak ketiga.
5. **Verifier (Perusahaan / Publik)**: Memverifikasi keabsahan dokumen akademik secara instan tanpa biaya gas melalui fungsi `verifyCredential`.

### 5.1.2 Arsitektur dan Alur Data
Arsitektur sistem memisahkan data menjadi dua zona:
* **Zona Off-Chain**: File fisik ijazah/transkrip PDF dan PII (Nama, NIM, IPK) tetap berada pada server repositori kampus dan perangkat mahasiswa. Sebelum transaksi, browser menghitung nilai hash kriptografis `docHash = keccak256(pdfBytes)`.
* **Zona On-Chain**: Buku besar blockchain hanya menyimpan pengenal unik kredensial (`string id`), alamat penandatangan (`address issuer`, `address holder`), stempel waktu (`issuedAt`, `expiresAt`), status validitas (`enum CredentialStatus`), dan sidik jari dokumen (`bytes32 docHash`).

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|    [Portal Admin]     [Portal Issuer]     [Portal Holder]     [Portal Verifier] |
+---------------------------------------------------------------------------------+
                                        |
                            (MetaMask / Web3 Provider)
                                        |
+---------------------------------------------------------------------------------+
|                       BLOCKCHAIN LAYER (Hardhat Local Node)                     |
|  +---------------------------------------------------------------------------+  |
|  |                 Smart Contract: AcademicCredential.sol                    |  |
|  |  - AccessControl (Admin, Issuer, Revoker)                                 |  |
|  |  - Core: issueCredential, issueBatch, revokeCredential                    |  |
|  |  - Consent: grantAccess, hasAccess                                        |  |
|  |  - Public View: verifyCredential (0 Gas Fee)                              |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
                                        ^
                                        | docHash bytes32
+---------------------------------------------------------------------------------+
|                              OFF-CHAIN LAYER                                    |
|   [Kampus Backend / Database]          [Client-Side Keccak-256 Hasher (Browser)]|
|   (Data PII Mahasiswa, Berkas PDF)      (Menghitung hash dari file fisik)        |
+---------------------------------------------------------------------------------+
```

### 5.1.3 Model Data dan Keputusan Teknis
Data disimpan dalam struktur mapping `mapping(string => Credential) private _credentials` dan array penelusuran `string[] private _credentialIds`.

| Data / fungsi | On-chain atau off-chain | Aktor / hak akses | Alasan teknis |
| :--- | :--- | :--- | :--- |
| `docHash` (`bytes32`) | On-chain | Publik (`view`) | Membuktikan integritas matematis berkas (*tamper-proof*) tanpa membuka isi dokumen. |
| Status Kredensial (`enum`) | On-chain | Publik (`view`) | Menjamin status keabsahan dokumen (Valid, Revoked, Expired) tidak dapat dimanipulasi sepihak. |
| Berkas Fisik PDF & PII | Off-chain | Holder & Issuer | Mencegah *blockchain bloat*, menghemat biaya gas, dan memenuhi *Right to be Forgotten* UU PDP. |
| `issueCredential` | On-chain | `ISSUER_ROLE` | Pencatatan status legalitas penerbitan secara permanen dan memancarkan event `CredentialIssued`. |
| `issueBatch` (Maks 50) | On-chain | `ISSUER_ROLE` | Efisiensi proses wisuda massal dengan proteksi batasan gas limit blok (*DoS prevention*). |
| `revokeCredential` | On-chain | `ISSUER_ROLE` / `REVOKER_ROLE` | Pencabutan kredensial dengan mencatat alasan terstruktur pada audit trail transaksi. |
| `grantAccess` | On-chain | Holder (Mahasiswa) | Menghasilkan bukti persetujuan eksplisit pemilik data (*Holder Consent*) sesuai Pasal 20 UU PDP. |
| `verifyCredential` | On-chain | Publik (`view`) | Verifikasi instan tanpa konsumsi saldo/gas melalui RPC node `eth_call`. |

---

## **5.2 Pengujian, deployment, dan integrasi (Project 2)**

### 5.2.1 Rangkuman Pengujian Unit
Pengujian unit dijalankan menggunakan Mocha dan Chai Matchers pada lingkungan Hardhat. Total 39 pengujian berhasil diselesaikan dengan hasil 100% lulus.

| ID tes | Skenario positif/negatif/batas/akses | Ekspektasi | Hasil | Bukti |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | Positif: Admin mendaftarkan akun Issuer baru (`addIssuer`). | Event `IssuerAdded` terpancar, wewenang `hasRole` bernilai `true`. | Lulus | [B-03] |
| **T-02** | Akses: Akun non-admin mencoba memanggil `addIssuer`. | Revert dengan error OpenZeppelin `AccessControlUnauthorizedAccount`. | Lulus | [B-03] |
| **T-03** | Positif: Issuer menerbitkan 1 kredensial valid (`issueCredential`). | Kredensial tersimpan di state, event `CredentialIssued` terpancar. | Lulus | [B-03] |
| **T-04** | Negatif: Penerbitan dengan ID kosong atau ID duplikat. | Revert dengan custom error `EmptyCredentialId` atau `CredentialAlreadyExists`. | Lulus | [B-03] |
| **T-05** | Batas: Penerbitan massal melebihi batas (`MAX_BATCH_SIZE > 50`). | Revert dengan custom error `InvalidBatchSize(51, 50)`. | Lulus | [B-03] |
| **T-06** | Akses & Logika: Pencabutan kredensial oleh issuer yang tidak sah. | Revert dengan custom error `NotCredentialIssuer`. | Lulus | [B-03] |
| **T-07** | Positif: Verifikasi publik dengan hash yang cocok vs hash yang dimanipulasi. | Status mengembalikan `Valid (1)` jika cocok, dan `HashMismatch (2)` jika berbeda. | Lulus | [B-03] |

### 5.2.2 Dokumentasi Kasus Debugging
* **Permasalahan**: Pada tahap integrasi awal antarmuka frontend, verifikasi file fisik sering kali memunculkan error `INVALID_ARGUMENT: invalid BytesLike value` atau salah mengembalikan status `HashMismatch` padahal berkas identik.
* **Akar Masalah**: Pustaka Ethers.js v6 membaca input file browser melalui HTML5 FileReader menghasilkan `ArrayBuffer` biner. Jika buffer tersebut dikonversi secara keliru melalui teks string UTF-8 biasa, susunan byte berubah sehingga hasil hashing Keccak-256 menghasilkan string yang tidak sesuai format `bytes32` (panjang 66 karakter heksadesimal).
* **Solusi**: Dibuat fungsi helper komprehensif `hashFrom(fileEl, textEl)` pada [`frontend/index.html`](frontend/index.html) yang langsung mengonversi `ArrayBuffer` menjadi `Uint8Array` sebelum diproses oleh `ethers.keccak256()`. Selain itu, penanganan input teks heksadesimal divalidasi dengan regex `/^0x[0-9a-fA-F]{64}$/`. Rincian lengkap dicatat pada [`docs/DEBUGGING_RECORD.md`](docs/DEBUGGING_RECORD.md).

### 5.2.3 Catatan Deployment dan Integrasi Web3
* **Jaringan**: Hardhat Local Network (Chain ID: `31337`).
* **Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`.
* **Deployment Tx Hash**: `0xad672109cdda352da637053526ddf5270c64450d21fcf5862dcb7381ccba9f1a` (Blok 1).
* **Kredensial Sampel Deployment**: ID `UNSIL/INF/2026/001` dengan docHash `0x831f2b3844f34db27f129f13b86aebfe55981a5f14d27f30ca7a2165c19fa404` berhasil diverifikasi dengan status `Valid`.

---

## **5.3 Audit keamanan dan perbaikan (Project 3)**

### 5.3.1 Threat Model (Metodologi STRIDE)
1. **Spoofing**: Penyerang memalsukan identitas institusi kampus untuk mencetak kredensial palsu. *Mitigasi*: Penguncian hak fungsi dengan modifier `onlyRole(ISSUER_ROLE)`.
2. **Tampering**: Modifikasi berkas ijazah atau transkrip nilai oleh mahasiswa. *Mitigasi*: Validasi matematis *tamper-proof* sidik jari dokumen Keccak-256.
3. **Repudiation**: Kampus menyangkal telah menerbitkan ijazah. *Mitigasi*: Log event blockchain immutable mencatat alamat akun penerbit secara permanen.
4. **Information Disclosure**: Bocornya data pribadi mahasiswa di penjelajah blok. *Mitigasi*: Data PII 100% tersimpan *off-chain*.
5. **Denial of Service**: Penyerang membebani loop batch array hingga melebihi batas gas blok. *Mitigasi*: Pembatasan `MAX_BATCH_SIZE = 50`.
6. **Elevation of Privilege**: Pengguna biasa mengangkat dirinya menjadi admin. *Mitigasi*: `DEFAULT_ADMIN_ROLE` dilindungi oleh modul OpenZeppelin AccessControl.

### 5.3.2 Temuan Audit dan Status Retest

| ID temuan | Bukti dan dampak | Kemungkinan / risiko | Perbaikan / commit | Retest dan status |
| :--- | :--- | :--- | :--- | :--- |
| **A-01** | Kerentanan Gas Limit DoS pada loop penerbitan massal tanpa batas array. | Medium / **High** | Menerapkan konstanta `MAX_BATCH_SIZE = 50` dan error `InvalidBatchSize` (Commit `91ff362`). | ✅ **Lulus Retest** (Test `T-05`) |
| **A-02** | Risiko penerbitan data yatim akibat input `address(0)` atau `bytes32(0)`. | Medium / **Medium** | Menambahkan pengecekan `InvalidAddress` dan `EmptyDocumentHash` (Commit `fee55d1`). | ✅ **Lulus Retest** (Test penolakan zero-value) |
| **A-03** | Pembatasan pencabutan kredensial lintas penerbit fakultas yang tidak sah. | Low / **High** | Menambahkan validasi `NotCredentialIssuer` agar issuer hanya dapat mencabut data miliknya (Commit `fee55d1`). | ✅ **Lulus Retest** (Test isolasi wewenang) |
| **A-04** | Penerbitan kredensial dengan tanggal kedaluwarsa yang sudah lewat (*past timestamp*). | Low / **Low** | Validasi `expiresAt <= block.timestamp` dengan error `InvalidExpirationTime` (Commit `fee55d1`). | ✅ **Lulus Retest** (Test validasi waktu) |
| **A-05** | Ketiadaan mekanisme jeda darurat saat kunci privat admin terindikasi bocor. | Low / **High** | Integrasi OpenZeppelin `Pausable` dengan fungsi `pause()` dan `unpause()` (Commit `91ff362`). | ✅ **Lulus Retest** (Test pause transaksi) |

---

## **5.4 Enterprise, privasi, dan nonfungsional (Project 4)**

### 5.4.1 Matriks Perbandingan Arsitektur

| Aspek | Public / Ethereum EVM | Permissioned / Hyperledger Fabric | Keputusan untuk Kasus Akademik |
| :--- | :--- | :--- | :--- |
| **Identitas dan Izin** | Pseudonim, pasangan kunci publik/privat tanpa izin (*permissionless*). | Berizin ketat (*permissioned*) dengan Membership Service Provider (MSP) X.509 PKI. | **Hybrid EVM Consortium**: Menggunakan standar EVM namun dijalankan dalam jaringan konsorsium perguruan tinggi dengan kontrol akses institusi. |
| **Konsensus & Throughput** | Proof of Stake (15–30 TPS di L1), finalitas probabilistik beberapa blok. | Raft / BFT (2.000–5.000+ TPS), finalitas deterministik instan tanpa percabangan (*no fork*). | **EVM L2 / Local Node**: Simulasi pada Hardhat (instan), untuk produksi direkomendasikan Layer-2 Rollup (Arbitrum/Base) untuk menampung lonjakan wisuda. |
| **Privasi dan Biaya** | Seluruh state transparan publik; gas fee dinamis fluktuatif per transaksi. | Partisi *Private Channels* & data privat; bebas biaya gas transaksi, biaya berupa operasional node. | **Client-Side Hashing & Zero Gas View**: PII 100% off-chain untuk privasi UU PDP; verifikasi publik 0 gas fee menggunakan fungsi `view`. |
| **Governance & Upgrade** | Desentralisasi konsensus validator, upgrade via Proxy Pattern (UUPS/Transparent). | Kebijakan *Endorsement Policy* multi-organisasi, lifecycle chaincode formal. | **Multi-Sig Governance**: Pengelolaan wewenang `DEFAULT_ADMIN_ROLE` melalui kontrak Multi-Signature Wallet antar-pimpinan universitas. |

### 5.4.2 Evaluasi Privasi (UU PDP No. 27/2022) & Skalabilitas
* **Kepatuhan Privasi**: Sistem memenuhi asas *data minimization* dan *purpose limitation*. Hanya sidik jari hash 32-byte yang tersimpan di buku besar. Data pribadi mahasiswa (Nama, NIM, Nilai) tidak pernah terekspos ke ledger sehingga menjamin hak penghapusan data (*Right to be Forgotten*). Fitur `grantAccess` mencatat persetujuan eksplisit pemilik data sesuai Pasal 20 UU PDP.
* **Skalabilitas**: Fungsi verifikasi bersifat read-only (`view`) sehingga memiliki skalabilitas tak terbatas (*unlimited throughput*) pada level verifier karena dilayani oleh RPC node secara lokal tanpa membebani blok transaksi. Penerbitan massal dibatasi 50 item per batch guna mencegah kejenuhan komputasi blok.
* **Kapan Database Biasa Lebih Tepat**: Basis data relasional (RDBMS PostgreSQL/MySQL) tetap lebih tepat untuk sistem informasi akademik operasional harian kampus (jadwal kuliah, input nilai dosen, KRS) yang membutuhkan throughput puluhan ribu TPS dengan biaya nol dan tidak memerlukan audit pihak ketiga independen.

---

## **5.5 Showcase dan kontribusi (Project 5)**

### 5.5.1 Alur Demo Sistem (End-to-End Walkthrough)
1. **Koneksi Wallet**: Pengguna membuka [`frontend/index.html`](frontend/index.html), menghubungkan MetaMask ke jaringan Hardhat Local (31337). Badge peran mendeteksi apakah akun adalah Admin, Issuer, atau Revoker.
2. **Penerbitan Kredensial**: Issuer memasukkan ID kredensial, memilih file PDF ijazah, dan memasukkan alamat mahasiswa. Browser menghitung hash Keccak-256 secara lokal dan mengirimkan transaksi `issueCredential`. Log menampilkan Transaction Hash dan event `CredentialIssued`.
3. **Persetujuan Holder**: Mahasiswa membuka tab *Holder*, memeriksa kredensial miliknya, dan memanggil `grantAccess` untuk memberikan hak periksa kepada alamat dompet verifier.
4. **Verifikasi Publik Bebas Gas**: Verifier membuka tab *Verifier*, memasukkan ID dan memilih berkas fisik ijazah. Sistem menjalankan `verifyCredential` secara instan tanpa biaya gas, menampilkan indikator warna hijau **KREDENSIAL VALID** beserta metadata penerbit dan waktu kedaluwarsa.
5. **Simulasi Deteksi Manipulasi**: Verifier mengunggah berkas yang telah dimodifikasi teksnya. Sistem seketika menampilkan kotak merah **TIDAK VALID - Hash tidak cocok (dokumen berbeda)**.
6. **Pencabutan Kredensial**: Akun Revoker/Issuer memanggil `revokeCredential` dengan alasan pelanggaran etika. Saat diverifikasi ulang, status seketika berubah menjadi **Dicabut (Revoked)**.

### 5.5.2 Pembagian Beban Kerja dan Kontribusi Tim

| Anggota | Tugas/kontribusi | Commit / bukti | Bagian yang dipresentasikan |
| :--- | :--- | :--- | :--- |
| **Pandu Dwi Ashidiq** (Anggota A) | Perancangan arsitektur on-chain/off-chain, smart contract Solidity, OpenZeppelin AccessControl, Pausable, diagram SVG. | `ca41dda`, `91ff362` | Arsitektur sistem, batasan data, dan implementasi kontrak Solidity. |
| **Faris Izza** (Anggota B) | Penyusunan 39 unit test, pelaporan coverage, script deployment lokal, investigasi kasus debugging konversi `bytes32`. | `fee55d1`, `7abf57d`, `462ac63`, `3591bce` | Hasil pengujian, metrik coverage 100%, deployment record, dan debugging. |
| **Hidayatullah** (Anggota C) | Pengembangan antarmuka web DApp 4 portal, integrasi Ethers.js v6, evaluasi privasi P4, penyusunan file PPTX 10 slide. | `36ea563`, `c8b87e9`, `7bb5b8d`, `9df8517` | Antarmuka DApp frontend, alur demo verifikasi, dan kepatuhan privasi UU PDP. |
| **Rifqal Munzammil** (Anggota D) | Audit keamanan threat model STRIDE, analisis DoS gas limit batch, rekomendasi tata kelola Multi-Sig, etika dan roadmap. | `9128dae` | Hasil audit keamanan, mitigasi kerentanan, tata kelola, dan roadmap sistem. |

---

# **6 Kesimpulan, Daftar Pustaka, dan Lampiran**

## **6.1 Kesimpulan**
Kegiatan proyek UAS rancang bangun sistem simulasi verifikasi kredensial akademik terdesentralisasi berhasil membuktikan bahwa teknologi smart contract pada jaringan EVM mampu menyediakan mekanisme verifikasi keaslian dokumen yang instan, transparan, dan tidak dapat dimanipulasi (*tamper-proof*). Melalui pendekatan *client-side hashing*, privasi data pribadi mahasiswa terlindungi secara penuh sesuai ketentuan UU No. 27 Tahun 2022 (UU PDP) karena berkas fisik dan data identitas tersimpan aman di luar blockchain (*off-chain*). Seluruh 39 skenario pengujian unit berhasil lulus 100% dengan cakupan kode maksimal. Keterbatasan sistem saat ini terletak pada sifat jaringan lokal Hardhat dan penggunaan data simulasi dummy. Tindak lanjut realistis untuk pengembangan ke depan adalah pengujian pada testnet publik Ethereum Layer-2 (Sepolia Arbitrum) serta integrasi standar identitas digital terdesentralisasi W3C Verifiable Credentials.

## **6.2 Daftar Pustaka**
1. Antonopoulos, A. M., & Wood, G. (2018). *Mastering Ethereum: Building Smart Contracts and DApps*. O'Reilly Media.
2. OpenZeppelin. (2024). *OpenZeppelin Contracts Documentation (v5.0)*. Diakses dari https://docs.openzeppelin.com/contracts/5.x/
3. Hardhat Documentation. (2024). *Ethereum development environment for professionals*. Nomic Foundation. Diakses dari https://hardhat.org/docs
4. Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Lembaran Negara Republik Indonesia Tahun 2022 Nomor 196.
5. World Wide Web Consortium (W3C). (2022). *Verifiable Credentials Data Model v1.1*. W3C Recommendation. Diakses dari https://www.w3.org/TR/vc-data-model/
6. Widiyasono, N. (2026). *Bahan Ajar Perkuliahan Blockchain (KP70067008)*. Jurusan Informatika, Fakultas Teknik, Universitas Siliwangi.

## **6.3 Lampiran dan Paket Berkas Akhir**
Paket berkas proyek UAS dikumpulkan secara lengkap pada repositori GitHub dengan struktur berkas sebagai berikut:
1. **README_Final**: [`README.md`](README.md) (Dokumentasi lengkap sistem, instalasi, dan panduan reproduksi).
2. **Laporan_UAS_Blockchain.pdf / .docx**: File laporan lengkap sesuai template resmi pada [`docs/LAPORAN_UAS_BLOCKCHAIN.md`](docs/LAPORAN_UAS_BLOCKCHAIN.md) dan [`docs/Laporan_UAS_Blockchain.docx`](docs/Laporan_UAS_Blockchain.docx).
3. **Source Code Kontrak & Frontend**: [`contracts/AcademicCredential.sol`](contracts/AcademicCredential.sol) dan [`frontend/index.html`](frontend/index.html).
4. **Folder Test & Coverage**: [`test/AcademicCredential.test.js`](test/AcademicCredential.test.js) (39 unit test passing).
5. **Deployment_Record**: [`docs/DEPLOYMENT_RECORD.md`](docs/DEPLOYMENT_RECORD.md).
6. **Security_Audit.pdf**: Dokumen hasil audit keamanan lengkap pada [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md).
7. **Architecture_Diagram**: Diagram vektor arsitektur sistem pada [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg).
8. **Slide Presentasi**: Berkas presentasi 10 slide resmi format PowerPoint pada [`docs/Presentasi_UAS_Blockchain.pptx`](docs/Presentasi_UAS_Blockchain.pptx).
9. **Skenario Video Demo**: Naskah dan urutan perekaman `Video_Demo.mp4` pada [`docs/SLIDE_PRESENTASI.md`](docs/SLIDE_PRESENTASI.md).
10. **Riwayat Commit Terverifikasi**: Riwayat commit Git per anggota yang tercatat pada GitHub.
