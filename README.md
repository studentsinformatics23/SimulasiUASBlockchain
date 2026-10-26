# Simulasi Verifikasi Kredensial Akademik (Blockchain UAS)

**Mata Kuliah:** Blockchain (KP70067008) — Universitas Siliwangi  
**Tahun Akademik:** 2026/2027 Ganjil  
**Use Case:** Simulasi Penerbitan, Pencabutan, dan Verifikasi Kredensial Akademik di Jaringan Lokal Hardhat  
**Status Proyek:** Lengkap (Memenuhi Spesifikasi Tugas Anggota A, B, C, dan D)

---

## 📌 Ringkasan Sistem & Latar Belakang

Sistem ini memecahkan permasalahan pemalsuan ijazah dan inefisiensi verifikasi keaslian dokumen akademik melalui pemanfaatan smart contract berbasis Ethereum/EVM di jaringan lokal (Hardhat). 

### Prinsip Utama Desain (Kepatuhan UU No. 27/2022 - UU PDP):
1. **Penyimpanan On-Chain Minimalis**: Hanya menyimpan sidik jari kriptografis berkas (`bytes32 docHash`), stempel waktu (*issuedAt*, *expiresAt*), status kredensial (*valid, revoked, expired*), serta alamat kriptografis penerbit dan pemilik.
2. **Kerahasiaan Data Off-Chain**: Seluruh Data Pribadi Spesifik/Umum (Nama, NIM, IPK, Transkrip Lengkap, dan Berkas PDF Asli) tersimpan aman di server kampus atau perangkat mahasiswa (*off-chain*) dan tidak diunggah ke blockchain guna mencegah *blockchain bloat* serta mematuhi hak privasi data (*Right to be Forgotten*).
3. **Persetujuan Pemilik Sah (*Holder Consent*)**: Mahasiswa memiliki kendali penuh atas izin keterbukaan datanya dengan mencatat jejak audit persetujuan on-chain melalui fungsi `grantAccess`.

---

## 🏛️ Arsitektur Sistem

Diagram arsitektur sistem memisahkan 4 lapisan utama:
1. **Lapisan Klien / Pengguna**: Portal Admin, Portal Issuer (Fakultas), Portal Mahasiswa (Holder), dan Portal Publik (Verifier) yang diimplementasikan pada [`frontend/index.html`](frontend/index.html).
2. **Lapisan Web3 Bridge**: MetaMask / Provider lokal untuk transaksi berizin dan `eth_call` read-only bebas gas fee untuk verifikasi publik.
3. **Lapisan Blockchain**: Smart contract `AcademicCredential.sol` berbasis OpenZeppelin `AccessControl` dan `Pausable` pada jaringan lokal Hardhat.
4. **Lapisan Off-Chain**: Repositori kampus terenkripsi dan *client-side hasher* (SHA-256 / Keccak-256).

> Berkas diagram visual lengkap format SVG tersedia di: [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg)  
> Dokumen spesifikasi teknis dan matriks enterprise (P4) lengkap tersedia di: [`docs/ARCHITECTURE_DESIGN.md`](docs/ARCHITECTURE_DESIGN.md)

---

## 📜 Antarmuka Smart Contract (`AcademicCredential.sol`)

Sesuai kesepakatan bersama pada *Brief Case*:

| Nama Fungsi | Pemanggil (Wewenang) | Keterangan & Dampak State |
| :--- | :--- | :--- |
| `addIssuer(address issuer)` | Admin (`DEFAULT_ADMIN_ROLE`) | Mendaftarkan institusi/fakultas baru sebagai penerbit. |
| `removeIssuer(address issuer)` | Admin (`DEFAULT_ADMIN_ROLE`) | Mencabut hak penerbit institusi/fakultas. |
| `addRevoker(address revoker)` | Admin (`DEFAULT_ADMIN_ROLE`) | Mendaftarkan akun berwenang pencabut kredensial. |
| `removeRevoker(address revoker)`| Admin (`DEFAULT_ADMIN_ROLE`) | Mencabut hak akun pencabut kredensial. |
| `issueCredential(...)` | Issuer (`ISSUER_ROLE`) | Menerbitkan 1 kredensial akademik (`id, holder, docHash, expiresAt`). |
| `issueBatch(...)` | Issuer (`ISSUER_ROLE`) | Menerbitkan batch kredensial (dibatasi `MAX_BATCH_SIZE = 50` untuk proteksi gas limit DoS). |
| `revokeCredential(id, reason)` | Revoker / Issuer | Mencabut kredensial bermasalah beserta alasan pencabutan terstruktur. |
| `grantAccess(id, verifier)` | Holder (Mahasiswa pemilik) | Mencatat jejak audit persetujuan verifikasi data pribadi. |
| `hasAccess(id, verifier)` | Publik (`view`) | Memeriksa apakah mahasiswa telah memberikan izin kepada verifier. |
| `verifyCredential(id, docHash)`| Publik (`view`) | Mengembalikan tuple status validitas: `(isValid, status, issuer, holder, expiresAt)`. |
| `pause()` / `unpause()` | Admin (`DEFAULT_ADMIN_ROLE`) | Mekanisme jeda darurat keamanan transaksi. |

### Status Kredensial (`enum CredentialStatus`):
- `0`: `NotFound` — Kredensial tidak ditemukan pada ledger.
- `1`: `Valid` — Kredensial aktif, belum kedaluwarsa, dan hash dokumen asli cocok 100%.
- `2`: `HashMismatch` — ID kredensial terdaftar, namun isi dokumen fisik tidak cocok (indikasi manipulasi/pemalsuan).
- `3`: `Revoked` — Kredensial telah dicabut oleh universitas/komite etik.
- `4`: `Expired` — Kredensial telah melewati batas masa berlaku.

---

## 🚀 Panduan Instalasi & Reproduksi Pengujian

Langkah-langkah untuk menjalankan repositori ini secara lokal:

### 1. Prasyarat
- Node.js (v18 ke atas)
- npm (v9 ke atas)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Kompilasi Smart Contract
```bash
npx hardhat compile
```
*Output: `Compiled 7 Solidity files successfully (evm target: paris)`*

### 4. Menjalankan Unit Testing
```bash
npx hardhat test
```
*Hasil: Seluruh 39 skenario pengujian (role management, single issue, batch issue, gas limit safety, revocation, holder consent, verifikasi publik, validasi hash input, dan pause) lulus 100%.*

### 5. Memeriksa Laporan Test Coverage
```bash
npx hardhat coverage
```
**Hasil Pengujian Aktual**

Pengujian smart contract `AcademicCredential.sol` menghasilkan cakupan sebagai berikut:

| Metrik | Coverage |
|---|---:|
| Statements | 100% |
| Branches | 89.71% |
| Functions | 100% |
| Lines | 100% |

Hasil ini menunjukkan bahwa seluruh statement, fungsi, dan baris kode telah tercakup oleh pengujian yang dijalankan.

Jumlah pengujian unit yang berhasil dijalankan: **39 passing**.

### 6. Menjalankan Local Blockchain & Deploy Kontrak
Jalankan node Hardhat lokal pada terminal pertama:
```bash
npx hardhat node
```

Jalankan script deployment pada terminal kedua:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Script ini akan mencetak Contract Address, Transaction Hash, daftar akun uji coba dummy, dan otomatis menerbitkan 1 kredensial contoh untuk kebutuhan pengujian frontend.*

### 7. Menjalankan Antarmuka Frontend DApp
Buka file antarmuka web langsung pada browser yang telah terpasang ekstensi MetaMask:
```bash
# Buka file frontend/index.html di browser
frontend/index.html
```

---

## 📊 Matriks Evaluasi Arsitektur Enterprise (Bagian Project 4)

Ringkasan komparasi arsitektural antara **Ethereum/EVM Publik**, **Hyperledger Fabric**, dan **Database Tradisional**:

| Aspek | Ethereum Publik | Hyperledger Fabric | Database Tradisional (RDBMS) |
| :--- | :--- | :--- | :--- |
| **Identitas** | Pseudonim / Terbuka | Berizin ketat (X.509 PKI / MSP) | Sentralistis (OAuth / LDAP Kampus) |
| **Konsensus** | Proof of Stake (Probabilistik) | Raft / BFT (Deterministik instan) | ACID Transactions (2PC) |
| **Privasi Data** | Transparan on-chain (Wajib Off-chain PII) | Sangat tinggi (Private Channels) | Enkripsi disk & Row-Level Security |
| **Throughput** | 15–30 TPS (L1) | 2.000–5.000+ TPS | > 10.000–50.000+ TPS |
| **Biaya** | Gas fee dinamis per transaksi | Bebas gas, biaya pemeliharaan node | Sangat ekonomis & terprediksi |
| **Rekomendasi** | Verifikasi ijazah lintas negara tanpa pihak sentral terpercaya | Konsorsium perguruan tinggi nasional (LLDIKTI / Kemendikbud) | Sistem Informasi Akademik internal 1 institusi |

---

## 📁 Daftar Berkas Akhir Proyek UAS (Status Pemenuhan)

Mengacu pada lembar *Pembagian Tugas UAS Blockchain*:

| No | Berkas yang Dipersyaratkan | Lokasi di Repositori / Keterangan | Status |
| :---: | :--- | :--- | :---: |
| 1 | **README_Final** | [`README.md`](README.md) (Panduan lengkap instalasi, arsitektur, dan struktur proyek) | ✅ Siap |
| 2 | **Laporan_UAS_Blockchain.pdf** | Disusun terpisah oleh tim menggunakan bahan dari folder `docs/` | ⏳ Siap Dihimpun |
| 3 | **Source code smart contract dan frontend** | [`contracts/AcademicCredential.sol`](contracts/AcademicCredential.sol) & [`frontend/index.html`](frontend/index.html) | ✅ Lengkap |
| 4 | **Folder test dan hasil pengujian** | [`test/AcademicCredential.test.js`](test/AcademicCredential.test.js) (39 passing) & Coverage | ✅ Lengkap |
| 5 | **Deployment_Record** | [`docs/DEPLOYMENT_RECORD.md`](docs/DEPLOYMENT_RECORD.md) (Contract address & tx hash) | ✅ Lengkap |
| 6 | **Security_Audit.pdf dan bukti perbaikan** | [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) & 4 test perbaikan audit | ✅ Siap cetak PDF |
| 7 | **Architecture_Diagram** | [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg) & [`docs/ARCHITECTURE_DESIGN.md`](docs/ARCHITECTURE_DESIGN.md) | ✅ Lengkap |
| 8 | **Slide presentasi (maks 10 slide)** | [`docs/SLIDE_PRESENTASI.md`](docs/SLIDE_PRESENTASI.md) (Draf materi lengkap 10 slide) | ✅ Siap ekspor |
| 9 | **Video_Demo.mp4** | Panduan skenario rekaman demo di [`docs/SLIDE_PRESENTASI.md`](docs/SLIDE_PRESENTASI.md) | ⏳ Siap direkam |
| 10 | **Riwayat commit yang dapat ditelusuri** | Git commit log tercatat rapi per peran/kontributor | ✅ Lengkap |

---

## 👥 Struktur Kolaborasi & Beban Kerja Tim

- **Anggota A (Smart Contract & Arsitektur)**: Perancangan smart contract, diagram arsitektur, batasan on-chain/off-chain, serta evaluasi perbandingan enterprise (P1 & P4). Berkas: [`docs/ARCHITECTURE_DESIGN.md`](docs/ARCHITECTURE_DESIGN.md) & [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg).
- **Anggota B (Testing, Deployment, & Perbaikan)**: Penyusunan 39 unit test, pelaporan coverage, deployment record, dan dokumentasi debugging (P2 & P3). Berkas: [`test/AcademicCredential.test.js`](test/AcademicCredential.test.js), [`docs/DEPLOYMENT_RECORD.md`](docs/DEPLOYMENT_RECORD.md), & [`docs/DEBUGGING_RECORD.md`](docs/DEBUGGING_RECORD.md).
- **Anggota C (Frontend & Presentasi)**: Pembuatan frontend DApp (portal Admin, Issuer, Holder, Verifier), evaluasi privasi & skalabilitas P4, serta draf 10 slide presentasi & demo (P2, P4, & P5). Berkas: [`frontend/index.html`](frontend/index.html), [`docs/EVALUASI_PRIVASI_SKALABILITAS.md`](docs/EVALUASI_PRIVASI_SKALABILITAS.md), & [`docs/SLIDE_PRESENTASI.md`](docs/SLIDE_PRESENTASI.md).
- **Anggota D (Audit Keamanan & Tata Kelola)**: Threat model STRIDE, audit kerentanan, re-testing, tata kelola kunci privat, kepatuhan UU PDP, dan etika regulasi (P3, P4, & P5). Berkas: [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md).
