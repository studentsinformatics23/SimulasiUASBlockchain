# Draf Naskah Slide Presentasi & Panduan Video Demo (Tugas Anggota C)
**Mata Kuliah:** Blockchain (KP70067008), Universitas Siliwangi  
**Tahun Akademik:** 2026/2027 Ganjil  
**Use Case:** Simulasi Verifikasi Kredensial Akademik (Local Network Hardhat)  
**Penanggung Jawab:** Anggota C (Frontend & Presentasi)

---

## 📽️ Bagian 1: Struktur Slide Presentasi (Tepat 10 Slide)

### Slide 1: Judul & Identitas Tim
* **Judul**: Simulasi Verifikasi Kredensial Akademik Berbasis Smart Contract & DApp
* **Sub-judul**: Solusi Kredensial Tepercaya, Efisien, dan Patuh Privasi UU PDP
* **Mata Kuliah**: Blockchain (KP70067008) — Universitas Siliwangi (TA 2026/2027)
* **Anggota Tim & Pembagian Peran**:
  - Anggota A: Smart Contract & Arsitektur Sistem (P1, P4)
  - Anggota B: Pengujian Komprehensif, Deployment, & Debugging (P2, P3)
  - Anggota C: Pengembangan Frontend DApp & Presentasi (P2, P4, P5)
  - Anggota D: Audit Keamanan, Tata Kelola, & Etika Regulasi (P3, P4, P5)

### Slide 2: Latar Belakang & Masalah
* **Isu Utama**:
  1. Tingginya risiko pemalsuan ijazah dan sertifikat akademik fisik.
  2. Lambatnya proses verifikasi manual oleh pihak perusahaan (memerlukan surat konfirmasi ke kampus).
  3. Kerapuhan sistem database sentral terhadap manipulasi data internal (*single point of failure*).
* **Solusi**: Pemanfaatan teknologi smart contract untuk pembuktian keaslian terdesentralisasi (*tamper-proof*).

### Slide 3: Desain Arsitektur & Prinsip On-Chain vs Off-Chain
* **Prinsip Utama (Kepatuhan UU PDP No. 27/2022)**:
  - **On-Chain**: Hanya menyimpan *cryptographic hash* dokumen (`bytes32 docHash`), timestamp, status validitas, dan alamat dompet penerbit/pemilik.
  - **Off-Chain**: Seluruh berkas fisik (PDF) dan data identitas pribadi (Nama, NIM, IPK) disimpan di repositori kampus / mahasiswa.
* **Diagram Alur Lapisan**: Client Layer (DApp) ➔ Web3 Bridge (MetaMask) ➔ EVM Ledger (Hardhat) ➔ Off-chain Storage.

### Slide 4: Implementasi Smart Contract (`AcademicCredential.sol`)
* **Role-Based Access Control (RBAC)**:
  - `DEFAULT_ADMIN_ROLE`: Pengelola sistem (tambah/hapus Issuer & Revoker, pause darurat).
  - `ISSUER_ROLE`: Fakultas/Akademik (menerbitkan kredensial tunggal & batch hingga 50 data).
  - `REVOKER_ROLE`: Komite Etik / Satuan Pengawas Internal (mencabut kredensial bermasalah).
* **Holder Consent**: Mahasiswa memegang wewenang izin verifikasi melalui `grantAccess`.
* **Zero Gas Verification**: Verifikasi publik menggunakan fungsi `view` (`verifyCredential`) tanpa gas fee.

### Slide 5: Pengembangan Antarmuka Frontend DApp
* **Teknologi**: HTML5, Vanilla CSS Responsive, Modern Ethers.js v6, Web3 Browser Provider.
* **Fitur 4 Portal Utama**:
  1. *Portal Admin*: Manajemen hak akses peran institusi dan jeda darurat.
  2. *Portal Issuer*: Penerbitan kredensial dengan fitur *client-side document hashing* (Keccak-256).
  3. *Portal Holder*: Penampil daftar kredensial pribadi & pemberian izin akses verifikasi.
  4. *Portal Verifier*: Validasi keaslian berkas instan dengan indikator status warna interaktif.
* **Log Transaksi & Event**: Menampilkan Tx Hash, block number, gas used, dan decoded event receipt.

### Slide 6: Pengujian Unit & Metrik Code Coverage
* **Framework**: Hardhat Test Suite & Chai Matchers.
* **Statistik Pengujian**:
  - **39 Skenario Pengujian Lulus 100% (Passing)** mencakup tes positif, negatif, batas batasan gas batch, dan kontrol hak akses.
* **Hasil Coverage**:
  - Statement Coverage: **100%**
  - Line Coverage: **100%**
  - Function Coverage: **100%**
  - Branch Coverage: **89.71%**

### Slide 7: Hasil Deployment & Catatan Debugging
* **Lingkungan**: Jaringan Hardhat Local Node (Chain ID: 31337).
* **Contract Address Terverifikasi**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`.
* **Catatan Kasus Debugging Utama**:
  - Penanganan konversi tipe data Ethers.js v6 BigInt vs Number pada timestamp kedaluwarsa serta format byte padding Keccak-256 pada kalkulasi hash berkas di browser.

### Slide 8: Audit Keamanan & Mitigasi Kerentanan
* **Threat Modeling (STRIDE)**: Analisis ancaman spoofing, tampering, denial of service, dan privilege escalation.
* **Mitigasi Teknis yang Diterapkan**:
  1. *Pencegahan Gas Limit DoS*: Pembatasan `MAX_BATCH_SIZE = 50`.
  2. *Akses Ketat*: Guard modifier `onlyRole` dari OpenZeppelin.
  3. *Emergency Break*: Fitur `Pausable` untuk membekukan transaksi saat terjadi insiden.
  4. *Retesting*: Penambahan 4 skenario test audit memastikan verifikasi perbaikan 100% aman.

### Slide 9: Evaluasi Arsitektur Enterprise (Ethereum vs Fabric vs DB)
* **Ethereum / EVM**: Terbaik untuk pembuktian global independen tanpa pihak sentral terpercaya.
* **Hyperledger Fabric**: Solusi ideal untuk konsorsium universitas nasional (LLDIKTI / Kemendikbud) dengan privasi saluran (*private data collection*) dan throughput tinggi (>3000 TPS).
* **Database Tradisional (PostgreSQL)**: Tetap relevan untuk operasi sistem informasi akademik internal kampus berkecepatan tinggi.

### Slide 10: Kesimpulan, Roadmap, & Tanya Jawab
* **Kesimpulan**: Sistem berhasil menyimulasikan siklus penuh kredensial akademik yang aman, transparan, dan patuh regulasi pelindungan data pribadi.
* **Roadmap Pengembangan**:
  1. Migrasi ke Layer-2 Rollup (Arbitrum / Base) untuk efisiensi biaya produksi nyata.
  2. Implementasi W3C Verifiable Credentials (DID) & Zero-Knowledge Proofs (ZKP).
* **Sesi Diskusi & Tanya Jawab (Q&A)**.

---

## 📹 Bagian 2: Panduan & Skenario Video Demo Cadangan (`Video_Demo.mp4`)

**Durasi Disarankan:** 3 – 5 Menit  
**Alat Perekam:** OBS Studio / Screen Recorder bawaan OS  

### Urutan Skenario Demo:
1. **Menit 00:00 - 00:45 | Setup & Koneksi Wallet**:
   - Tunjukkan node lokal berjalan (`npx hardhat node`).
   - Buka `frontend/index.html` di browser.
   - Klik tombol **Hubungkan Wallet** (MetaMask terhubung ke Hardhat Local 31337).
   - Tunjukkan badge peran Admin / Issuer / Revoker menyala hijau sesuai akun yang aktif.
2. **Menit 00:45 - 01:45 | Portal Issuer (Penerbitan Kredensial)**:
   - Pilih tab **Issuer**.
   - Masukkan ID: `UNSIL/INF/2026/001`, isi alamat wallet mahasiswa, dan pilih file contoh ijazah PDF.
   - Klik **Terbitkan Kredensial**.
   - Tunjukkan kotak **Log Transaksi**: tampil Transaction Hash, Block Number, dan Event `CredentialIssued`.
3. **Menit 01:45 - 02:30 | Portal Holder (Persetujuan Akses)**:
   - Ganti akun dompet ke akun Mahasiswa.
   - Buka tab **Holder**, klik **Muat kredensial saya** (tabel kredensial muncul).
   - Masukkan alamat verifier dan klik **Beri Persetujuan Akses** (memicu event `AccessGranted`).
4. **Menit 02:30 - 03:30 | Portal Verifier (Verifikasi Publik Tanpa Gas)**:
   - Buka tab **Verifier**.
   - Masukkan ID dan unggah berkas ijazah yang sama: Klik **Verifikasi** ➔ Muncul kotak hijau: **KREDENSIAL VALID**.
   - Coba modifikasi isi dokumen / pilih dokumen lain: Klik **Verifikasi** ➔ Muncul kotak merah: **TIDAK VALID - Hash tidak cocok**.
   - Klik tombol **Cek izin akses saya** ➔ Muncul notifikasi konfirmasi izin dari holder.
5. **Menit 03:30 - 04:30 | Portal Admin & Pencabutan (Revocation)**:
   - Peragakan pencabutan kredensial (`revokeCredential`) dengan alasan pelanggaran akademik.
   - Lakukan verifikasi ulang ➔ Status seketika berubah menjadi **Dicabut (Revoked)**.

