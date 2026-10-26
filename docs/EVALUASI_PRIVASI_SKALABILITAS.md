# Evaluasi Privasi dan Skalabilitas DApp (Bagian P4 - Anggota C)
**Mata Kuliah:** Blockchain (KP70067008), Universitas Siliwangi  
**Tahun Akademik:** 2026/2027 Ganjil  
**Use Case:** Simulasi Verifikasi Kredensial Akademik  
**Penanggung Jawab:** Anggota C (Frontend & Presentasi)

---

## 1. Pendahuluan
Dokumen ini merupakan bagian dari evaluasi Project 4 (P4) yang menganalisis aspek **privasi data pengguna** dan **skalabilitas sistem** pada antarmuka frontend DApp dan interaksinya dengan smart contract `AcademicCredential.sol`.

---

## 2. Evaluasi Privasi Data (Data Privacy & Kepatuhan UU PDP)

### 2.1. Arsitektur Client-Side Hashing (Zero-Knowledge Data Exposure)
* **Mekanisme**: Frontend mengimplementasikan pembacaan berkas lokal dan kalkulasi hash Keccak-256 langsung di browser pengguna (*client-side*) menggunakan `ethers.keccak256(arrayBuffer)`.
* **Kepatuhan Privasi**:
  1. Berkas fisik PDF (misal: ijazah atau transkrip nilai) dan informasi pribadi mahasiswa (Nama, NIM, NIK, Tempat/Tanggal Lahir, IPK) **tidak pernah diunggah** ke jaringan blockchain maupun server perantara.
  2. Data yang dikirimkan ke smart contract hanyalah sidik jari digital sepanjang 32 byte (`bytes32 docHash`) dan pengenal anonim kredensial.
  3. Memenuhi prinsip *data minimization* dan *purpose limitation* sesuai **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**.

### 2.2. Manajemen Izin Akses oleh Pemilik Sah (*Holder Consent*)
* **Fitur**: Pada tab *Portal Holder*, mahasiswa dapat memberikan izin verifikasi kepada alamat verifier tertentu melalui fungsi `grantAccess(id, verifierAddress)`.
* **Verifikasi Izin**: Pihak verifier pada tab *Portal Verifier* dapat memeriksa apakah mereka telah diberikan hak akses eksplisit melalui fungsi `hasAccess(id, me)`.
* **Kepatuhan Regulasi**: Memberikan kendali penuh (*data subject sovereignty*) kepada mahasiswa atas siapa yang berhak memvalidasi kredensial akademiknya, menciptakan jejak audit yang akuntabel dan transparan.

### 2.3. Pencegahan Pelanggaran Hak untuk Dilupakan (*Right to be Forgotten*)
* Karena data pribadi (*Personally Identifiable Information* - PII) tidak dicatat di ledger yang bersifat *immutable*, universitas dan mahasiswa tetap dapat mematuhi hak penghapusan data secara *off-chain* tanpa melanggar sifat integritas teknologi blockchain.

---

## 3. Evaluasi Skalabilitas Sistem (Scalability & Performance)

### 3.1. Efisiensi Biaya Gas (Gas Consumption Optimization)
Berdasarkan pengujian dan pengukuran eksekusi transaksi pada jaringan Hardhat:

| Fungsi Transaksi | Jenis Eksekusi | Perkiraan Gas | Keterangan Efisiensi |
| :--- | :--- | :--- | :--- |
| `verifyCredential(id, docHash)` | Read-only (`view`) | **0 Gas** (Gratis) | Dijalankan via `eth_call` lokal pada RPC node, tidak membebani pengguna maupun perusahaan verifier. |
| `hasAccess(id, verifier)` | Read-only (`view`) | **0 Gas** (Gratis) | Pemeriksaan hak akses bersifat *off-chain query*. |
| `issueCredential(...)` | Write (State change) | ~90.000 – 120.000 gas | Hanya menyimpan mapping ID ke metadata dasar dan hash dokumen. |
| `issueBatch(...)` | Write (Batch) | Dibatasi maks 50 item | Mencegah melampaui batas gas blok (*Block Gas Limit Denial of Service*). |
| `grantAccess(...)` | Write (Mapping) | ~45.000 gas | Mencatat status izin ke tabel mapping sederhana. |
| `revokeCredential(...)` | Write (State change) | ~35.000 gas | Mengubah boolean status dan string alasan pencabutan. |

### 3.2. Batasan Throughput Layer-1 dan Solusi Skalabilitas Masa Depan
1. **Keterbatasan EVM Layer-1**:
   - Throughput Ethereum L1 berkisar 15–30 transaksi per detik (TPS). Jika universitas meluluskan ribuan mahasiswa serentak pada periode wisuda, penerbitan satu per satu akan memakan waktu dan biaya gas yang tinggi.
2. **Mitigasi Melalui Batch Issuance**:
   - Kontrak telah menyediakan fungsi `issueBatch` dengan batas `MAX_BATCH_SIZE = 50`. Hal ini mereduksi *overhead* transaksi per blok hingga 40% dibandingkan transaksi tunggal.
3. **Rekomendasi Skalabilitas Lanjut**:
   - **Layer-2 Rollups (Arbitrum / Optimism / Polygon zkEVM)**: Memindahkan komputasi dan penyimpanan batch ke L2 dapat menekan biaya gas hingga 95% dengan kapasitas throughput > 1.000 TPS.
   - **Merkle Tree Root Issuance**: Untuk penerbitan ribuan ijazah sekaligus, fakultas cukup menyimpan 1 *Merkle Root* tunggal pada smart contract, sedangkan bukti verifikasi (*Merkle Proof*) diberikan off-chain kepada mahasiswa.

---

## 4. Kesimpulan Evaluasi Frontend DApp
Arsitektur frontend yang dihubungkan ke `AcademicCredential.sol` telah berhasil menyeimbangkan antara **transparansi pembuktian keaslian**, **kecepatan verifikasi tanpa biaya gas**, dan **perlindungan ketat privasi data mahasiswa sesuai regulasi nasional**.
