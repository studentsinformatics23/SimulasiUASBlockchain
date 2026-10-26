# Laporan Audit Keamanan, Tata Kelola, & Etika Regulasi (Tugas Anggota D)
**Mata Kuliah:** Blockchain (KP70067008), Universitas Siliwangi  
**Tahun Akademik:** 2026/2027 Ganjil  
**Use Case:** Simulasi Verifikasi Kredensial Akademik (Smart Contract Hardhat)  
**Penanggung Jawab:** Anggota D (Audit Keamanan & Tata Kelola)

---

## 1. Threat Model (STRIDE Methodology)

| Kategori Ancaman (STRIDE) | Skenario Ancaman pada Sistem | Permukaan Serangan (*Attack Surface*) | Status Mitigasi |
| :--- | :--- | :--- | :--- |
| **Spoofing (Pemalsuan Identitas)** | Penyerang mengaku sebagai pihak fakultas berwenang dan menerbitkan ijazah palsu. | Fungsi `issueCredential` dan `issueBatch`. | **Termitigasi**: Kontrol akses ketat OpenZeppelin `onlyRole(ISSUER_ROLE)`. |
| **Tampering (Manipulasi Data)** | Pengguna mengubah berkas fisik ijazah (misal: menaikkan IPK) lalu meminta validasi. | Fungsi `verifyCredential(id, docHash)`. | **Termitigasi**: Integritas terjamin oleh pencocokan hash kriptografis `bytes32 docHash` (Keccak-256). |
| **Repudiation (Penyangkalan)** | Pihak kampus menyangkal pernah menerbitkan atau mencabut kredensial tertentu. | Riwayat event log blockchain. | **Termitigasi**: Pancaran event `CredentialIssued` dan `CredentialRevoked` bersifat permanen dan memuat alamat dompet penandatangan. |
| **Information Disclosure (Kebocoran Data)** | Publik membaca data pribadi sensitif mahasiswa melalui penjelajah blok (*block explorer*). | Variabel state on-chain. | **Termitigasi**: Seluruh PII (Nama, NIM, IPK) disimpan off-chain. On-chain hanya menyimpan hash satu arah. |
| **Denial of Service (Penyumbatan Gas)** | Penyerang mengirimkan ratusan ribu kredensial sekaligus dalam 1 array batch untuk melampaui batas gas blok. | Fungsi `issueBatch`. | **Termitigasi**: Pembatasan ketat `MAX_BATCH_SIZE = 50`. |
| **Elevation of Privilege (Eskalasi Wewenang)** | Akun non-admin mendaftarkan dirinya sendiri sebagai admin atau issuer. | Fungsi `addIssuer` dan `addRevoker`. | **Termitigasi**: Terproteksi oleh `onlyRole(DEFAULT_ADMIN_ROLE)`. |

---

## 2. Pemeriksaan Kerentanan & Matriks Audit Keamanan

| ID Temuan | Kategori Kerentanan | Tingkat Risiko | Deskripsi Temuan & Bukti | Langkah Mitigasi | Status Verifikasi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Gas Limit DoS** | **High** | Pemanggilan `issueBatch` tanpa batas ukuran array berpotensi menyebabkan transaksi kehabisan gas (*out of gas*) dan menggagalkan seluruh blok. | Diterapkan konstanta `MAX_BATCH_SIZE = 50`. Transaksi di-*revert* dengan error `InvalidBatchSize` jika melebihi batas. | ✅ **Verified (Lulus Retest)** |
| **SEC-02** | **Broken Access Control** | **Critical** | Akun tidak sah mencoba memanggil fungsi administrasi atau pencabutan kredensial milik penerbit lain. | Diterapkan modifier `onlyRole` serta validasi kepemilikan kredensial pada pencabutan (`NotCredentialIssuer`). | ✅ **Verified (Lulus Retest)** |
| **SEC-03** | **Input Validation Zero Value** | **Medium** | Input parameter `address(0)` atau `docHash == bytes32(0)` dapat menyebabkan data yatim (*orphan data*) yang tidak dapat diverifikasi. | Penambahan pemeriksaan `InvalidAddress` dan `EmptyDocumentHash` pada awal fungsi. | ✅ **Verified (Lulus Retest)** |
| **SEC-04** | **Replay & Timestamp Tampering** | **Low** | Penerbitan kredensial dengan tanggal kedaluwarsa yang sudah lewat (*past timestamp*). | Validasi `if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpirationTime()`. | ✅ **Verified (Lulus Retest)** |
| **SEC-05** | **Emergency Control** | **Medium** | Ketiadaan mekanisme penghentian darurat jika terjadi anomali atau kunci privat admin terkompromi. | Diimplementasikan modul OpenZeppelin `Pausable` dengan fungsi `pause()` dan `unpause()`. | ✅ **Verified (Lulus Retest)** |

---

## 3. Hasil Retest Pasca-Perbaikan (Bukti Perbaikan)
Anggota B telah menambahkan skenario pengujian unit tambahan untuk memverifikasi temuan audit di atas.
* **Hasil Pengujian**: 39 skenario pengujian (`test/AcademicCredential.test.js`) berhasil dijalankan dengan status **100% Passing**.
* **Cakupan Kode (Coverage)**:
  - Statement Coverage: **100%**
  - Function Coverage: **100%**
  - Line Coverage: **100%**
  - Branch Coverage: **89.71%**

---

## 4. Analisis Tata Kelola & Rekomendasi Arsitektur (Bagian P4)

### 4.1. Tata Kelola Kunci Privat (*Key Management Governance*)
1. Akun `DEFAULT_ADMIN_ROLE` universitas tidak boleh dikuasai oleh satu individu.
2. Direkomendasikan menggunakan kontrak **Multi-Signature Wallet (Gnosis Safe)** dengan skema persetujuan minimal 3 dari 5 pejabat kampus (misal: Rektor, Dekan, Kepala Biro Akademik, SPI, dan Kepala LP3M).

### 4.2. Kebijakan Manajemen Peran (*Role Lifecycle*)
* Hak akses fakultas (`ISSUER_ROLE`) dan auditor (`REVOKER_ROLE`) harus diaudit secara berkala tiap semester. Akun dosen/staf yang telah mutasi atau purna tugas harus segera dicabut melalui fungsi `removeIssuer` atau `removeRevoker`.

---

## 5. Aspek Etika, Regulasi, Keberlanjutan, & Roadmap

### 5.1. Kepatuhan Regulasi (UU PDP No. 27/2022)
* **Pasal 20 & 21 (Dasar Pemrosesan)**: Sistem menerapkan persetujuan eksplisit pemilik data (*Holder Consent*) melalui fungsi `grantAccess`.
* **Prinsip Kerahasiaan Data**: Kredensial on-chain tidak memuat nama lengkap mahasiswa, nilai mata kuliah, atau nomor induk kependudukan sehingga mencegah profiling data publik yang melanggar hukum.

### 5.2. Keberlanjutan Lingkungan (*Environmental Sustainability*)
* Smart contract berjalan di atas jaringan berbasis *Proof of Stake* (Ethereum PoS / EVM) yang mengonsumsi energi 99.95% lebih hemat dibandingkan konsensus Proof of Work konvensional.

### 5.3. Roadmap Jangka Panjang
1. **Fase 1 (Tahun 1)**: Deployment jaringan konsorsium lokal antar-fakultas Universitas Siliwangi.
2. **Fase 2 (Tahun 2)**: Integrasi dengan standar identitas digital terdesentralisasi W3C (*Decentralized Identifiers & Verifiable Credentials*).
3. **Fase 3 (Tahun 3)**: Interoperabilitas nasional dengan pangkalan data PDDIKTI Kemendikbudristek.

