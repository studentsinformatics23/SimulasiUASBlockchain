# Simulasi Verifikasi Kredensial Akademik (Blockchain UAS)

**Mata Kuliah:** Blockchain (KP70067008) — Universitas Siliwangi  
**Tahun Akademik:** 2026/2027 Ganjil  
**Use Case:** Simulasi Penerbitan, Pencabutan, dan Verifikasi Kredensial Akademik di Jaringan Lokal Hardhat  
**Penanggung Jawab Bagian Ini:** Anggota A (Smart Contract & Arsitektur)

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
1. **Lapisan Klien / Pengguna**: Portal Admin, Portal Issuer (Fakultas), Portal Mahasiswa (Holder), dan Portal Publik (Verifier) yang diimplementasikan oleh Anggota C.
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

Bagi anggota tim (**Anggota B, C, dan D**), berikut langkah-langkah untuk menjalankan repositori ini secara lokal:

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
*Hasil: Seluruh 35 skenario pengujian (role management, single issue, batch issue, gas limit safety, revocation, holder consent, verifikasi publik, dan pause) lulus 100%.*

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

Hasil ini menunjukkan bahwa seluruh statement, fungsi, dan baris kode telah tercakup oleh pengujian yang dijalankan. Branch coverage sebesar 89.71% menunjukkan bahwa masih terdapat beberapa jalur keputusan yang belum tercakup.

Jumlah pengujian unit yang berhasil dijalankan: **35 passing**.

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

## 👥 Struktur Kolaborasi Tim

- **Anggota A (Selesai)**: Perancangan smart contract, arsitektur sistem, batasan on-chain/off-chain, serta evaluasi perbandingan enterprise (P1 & P4).
- **Anggota B**: Penyusunan pengujian komprehensif, pelaporan coverage, deployment record, dan dokumentasi debugging (P2 & P3).
- **Anggota C**: Pengembangan antarmuka frontend DApp (portal Admin, Issuer, Holder, Verifier) serta slide showcase (P2, P4, & P5).
- **Anggota D**: Audit keamanan smart contract, analisis tata kelola, dan re-testing (P3, P4, & P5).
