# Dokumen Desain Arsitektur & Spesifikasi Smart Contract (Tugas Anggota A)
**Mata Kuliah:** Blockchain (KP70067008), Universitas Siliwangi  
**Tahun Akademik:** 2026/2027 Ganjil  
**Use Case:** Simulasi Verifikasi Kredensial Akademik (Local Network)  
**Penanggung Jawab:** Anggota A (Smart Contract & Arsitektur)

---

## 1. Pendahuluan & Identifikasi Masalah
Institusi pendidikan tinggi menghadapi tantangan integritas dalam penerbitan dan verifikasi ijazah/transkrip akademik. Praktik pemalsuan ijazah dan proses verifikasi manual konvensional yang memakan waktu lama serta membebani staf administrasi kampus menjadi masalah kritis. 

Solusi prototipe ini mengimplementasikan pencatatan sidik jari digital (*fingerprint*) kredensial akademik pada blockchain lokal untuk menyediakan:
1. **Integritas Dokumen**: Pembuktian keaslian berkas tanpa menyentuh pihak kampus satu per satu.
2. **Keterlacakan Status**: Transparansi status aktif, pencabutan (*revocation*), atau kedaluwarsa secara seketika (*real-time*).
3. **Kepatuhan Privasi (UU No. 27/2022 - UU PDP)**: Pemisahan tegas antara rekaman publik integritas (*on-chain*) dan Data Pribadi Spesifik/Umum (*off-chain*).

---

## 2. Aktor, Hak Akses, & Trust Boundary

Sistem mendefinisikan 5 entitas utama:
1. **Admin (`DEFAULT_ADMIN_ROLE`)**:
   - Pihak pengelola sistem universitas / dekanat.
   - Wewenang: Menambah dan mencabut peran Issuer (`addIssuer`, `removeIssuer`) serta Revoker (`addRevoker`, `removeRevoker`), dan fungsi pause darurat.
2. **Issuer (`ISSUER_ROLE`)**:
   - Bagian Akademik Fakultas / Universitas.
   - Wewenang: Menerbitkan kredensial tunggal (`issueCredential`), massal (`issueBatch`), serta mencabut kredensial yang bermasalah.
3. **Revoker (`REVOKER_ROLE`)**:
   - Komite Etik / Satuan Pengawas Internal (SPI) / Bagian Hukum Kampus.
   - Wewenang: Mencabut kredensial (`revokeCredential`) beserta alasan terstruktur (misal: pencabutan gelar atas pelanggaran akademik).
4. **Holder**:
   - Mahasiswa pemilik kredensial.
   - Wewenang: Memegang berkas asli secara off-chain dan memberikan persetujuan akses formal kepada verifier (`grantAccess`).
5. **Verifier**:
   - Pihak ketiga (perusahaan, rekruter, instansi pendidikan).
   - Wewenang: Memverifikasi status dan keabsahan berkas secara independen (`verifyCredential`) dan mengecek status izin akses (`hasAccess`).

---

## 3. Keputusan Desain: On-Chain vs. Off-Chain (Data Boundary)

| Kategori Data | Lokasi Penyimpanan | Alasan Teknis & Pertimbangan Regulasi |
| :--- | :--- | :--- |
| **Sidik Jari Dokumen (`docHash`)** | On-Chain (`bytes32`) | Sidik jari kriptografis (SHA-256 / Keccak-256) membuktikan integritas matematis tanpa mengungkapkan isi dokumen (*zero leakage*). |
| **Status & Waktu Kredensial** | On-Chain (`enum`, `uint256`) | Status keabsahan (Valid, Revoked, Expired) dan timestamp penerbitan wajib *immutable* dan dapat diverifikasi publik tanpa ketergantungan server terpusat. |
| **Alamat Identitas (Issuer & Holder)** | On-Chain (`address`) | Menjamin sifat *non-repudiation* (tidak dapat disangkal) mengenai pihak yang berwenang menerbitkan dan subjek pemilik sah. |
| **Consent Log (`hasAccess`)** | On-Chain (`mapping`) | Jejak audit persetujuan eksplisit pemilik data (*Holder consent trail*) sesuai prinsip akuntabilitas UU PDP Pasal 20. |
| **Data Pribadi (Nama, NIM, IPK, dll.)** | Off-Chain | *Personally Identifiable Information* (PII) dilarang disimpan permanen di blockchain publik guna menjamin kerahasiaan dan hak penghapusan data (*Right to be Forgotten*). |
| **File Fisik PDF Ijazah** | Off-Chain (Repositori Kampus / Arsip Mahasiswa) | Mencegah *blockchain bloat* dan menghemat biaya gas; blockchain hanya menyimpan bukti integritas, bukan media penyimpanan berkas mentah. |

---

## 4. Diagram Arsitektur & Alur Transaksi

### 4.1. Diagram Arsitektur Sistem
```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|  [Portal Admin]      [Portal Issuer]       [Portal Holder]    [Portal Verifier] |
+---------------------------------------------------------------------------------+
                                      |
                           (MetaMask / Web3 Provider)
                                      |
+---------------------------------------------------------------------------------+
|                       BLOCKCHAIN LAYER (Hardhat Local Node)                     |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                 Smart Contract: AcademicCredential.sol                    |  |
|  |  - AccessControl (Admin, Issuer, Revoker)                                 |  |
|  |  - Core Functions: issueCredential, issueBatch, revokeCredential          |  |
|  |  - Holder Consent: grantAccess, hasAccess                                 |  |
|  |  - Public View: verifyCredential                                          |  |
|  +---------------------------------------------------------------------------+  |
|                                      |                                          |
|        [World State Storage] <-------+-------> [Event Logs & Receipts]          |
|        (Credentials, Status, Roles)             (Audit Trail)                   |
+---------------------------------------------------------------------------------+
                                       ^
                                       | docHash (bytes32)
+---------------------------------------------------------------------------------+
|                              OFF-CHAIN LAYER                                    |
|  +------------------------------------+   +----------------------------------+  |
|  | Kampus Backend / Secure Storage    |   | Client-side SHA-256 Hasher       |  |
|  | (Data Mahasiswa, NIM, PDF Ijazah)  |   | (Menghitung hash dari file asli) |  |
|  +------------------------------------+   +----------------------------------+  |
+---------------------------------------------------------------------------------+
```

### 4.2. Alur Transaksi (Sequence Flow)
1. **Penerbitan Ijazah (Issuance)**:
   - Admin mendaftarkan akun fakultas melalui `addIssuer(address)`.
   - Fakultas membuat dokumen ijazah PDF, menghitung sidik jari `docHash = keccak256(pdfBuffer)`.
   - Fakultas memanggil `issueCredential(id, holder, docHash, expiresAt)`. Kontrak memancarkan event `CredentialIssued`.
2. **Persetujuan Akses (Grant Access)**:
   - Mahasiswa (Holder) yang melamar pekerjaan memanggil `grantAccess(id, verifierAddress)`.
   - Kontrak mencatat `hasAccess[id][verifier] = true` dan memancarkan event `AccessGranted`.
3. **Verifikasi Publik (Verification)**:
   - Verifier menerima file ijazah PDF dari pelamar, menghitung hash dokumen secara lokal di browser.
   - Verifier memanggil `verifyCredential(id, docHash)` (eksekusi read-only gratis via RPC).
   - Kontrak mengembalikan tuple `(bool isValid, CredentialStatus status, address issuer, address holder, uint256 expiresAt)`.

---

## 5. Model Data & Antarmuka Kontrak (Smart Contract Interface)

### 5.1. Struct dan Enum
```solidity
enum CredentialStatus {
    NotFound,     // 0: ID tidak terdaftar
    Valid,        // 1: Aktif dan hash cocok
    HashMismatch, // 2: ID terdaftar namun hash dokumen tidak cocok
    Revoked,      // 3: Kredensial telah dicabut
    Expired       // 4: Kredensial telah kedaluwarsa
}

struct Credential {
    string id;              // ID unik human-readable (contoh: "UNSIL/INF/2026/001")
    address issuer;         // Penerbit kredensial
    address holder;         // Mahasiswa pemilik kredensial
    bytes32 docHash;        // Hash dokumen PDF asli
    uint256 issuedAt;       // Stempel waktu penerbitan
    uint256 expiresAt;      // Stempel waktu kedaluwarsa (0 = seumur hidup)
    bool isRevoked;         // Penanda pencabutan
    string revokeReason;    // Alasan pencabutan
}

struct CredentialInput {
    string id;
    address holder;
    bytes32 docHash;
    uint256 expiresAt;
}
```

### 5.2. Antarmuka Fungsi Utama
- `function addIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE)`
- `function removeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE)`
- `function addRevoker(address revoker) external onlyRole(DEFAULT_ADMIN_ROLE)`
- `function removeRevoker(address revoker) external onlyRole(DEFAULT_ADMIN_ROLE)`
- `function issueCredential(string calldata id, address holder, bytes32 docHash, uint256 expiresAt) external onlyRole(ISSUER_ROLE)`
- `function issueBatch(CredentialInput[] calldata credentials) external onlyRole(ISSUER_ROLE)` (Maksimal 50 item)
- `function revokeCredential(string calldata id, string calldata reason) external` (Dipanggil oleh `ISSUER_ROLE` atau `REVOKER_ROLE`)
- `function grantAccess(string calldata id, address verifier) external` (Hanya dipanggil oleh `holder`)
- `function hasAccess(string calldata id, address verifier) external view returns (bool)`
- `function verifyCredential(string calldata id, bytes32 docHash) external view returns (bool isValid, CredentialStatus status, address issuer, address holder, uint256 expiresAt)`

---

## 6. Evaluasi Arsitektur Enterprise & Matriks Perbandingan (Bagian Project 4)

Dalam konteks sistem verifikasi kredensial akademik, perbandingan arsitektural antara **Ethereum / EVM Publik**, **Hyperledger Fabric (Permissioned Enterprise)**, dan **Database Tradisional (PostgreSQL / RDBMS)** dijabarkan pada matriks berikut:

| Kriteria Evaluasi | Ethereum / EVM Publik | Hyperledger Fabric (Enterprise) | Database Tradisional (RDBMS) |
| :--- | :--- | :--- | :--- |
| **1. Identitas & Partisipasi** | Terbuka / Tanpa Izin (*Permissionless*), akun berupa pasangan *public/private key* pseudonim. | Berizin ketat (*Permissioned*), identitas dikelola otoritas sertifikat (CA) berbasis X.509 PKI & Membership Service Provider (MSP). | Sentralistis, autentikasi berbasis User/Password, OAuth, JWT, atau LDAP kampus. |
| **2. Mekanisme Konsensus & Finalitas** | Proof of Stake (PoS), finalitas membutuhkan konfirmasi beberapa blok (*probabilistic/slot finality*). | Konsensus deterministik (Raft/BFT), finalitas transaksi instan (*no fork*). | ACID Transactions, *two-phase commit* (2PC) pada replikasi cluster. |
| **3. Privasi Data & UU PDP** | Seluruh data on-chain bersifat transparan publik; memerlukan teknik hashing & penyimpanan off-chain ketat. | Privasi tinggi melalui saluran partisi (*Channels*) dan koleksi data privat (*Private Data Collections*). | Kontrol akses berbasis baris/kolom (RBAC/RLS) dan enkripsi disk (*at-rest* & *in-transit*). |
| **4. Throughput & Skalabilitas** | Rendah-Sedang (15–30 TPS di Layer-1 Ethereum, ratusan TPS di Layer-2 Rollups). | Sangat Tinggi (2.000–5.000+ TPS), arsitektur *Execute-Order-Validate*. | Ekstrem (> 10.000–50.000+ TPS), latency sub-milidetik. |
| **5. Tata Kelola & Upgrade** | Desentralisasi konsensus komunitas, upgrade melalui proxy pattern (*transparent/UUPS*) atau migrasi kontrak baru. | Konsorsium anggota jaringan, upgrade chaincode diatur oleh kebijakan *lifecycle endorsement policy*. | Terpusat penuh pada administrator database kampus (DBA) / tim DevOps. |
| **6. Biaya Operasional** | Biaya gas dinamis fluktuatif per setiap interaksi transaksi; mahal jika di L1 publik nyata. | Tanpa biaya gas per tx; biaya berupa beban server, pemeliharaan node peers, orderer, dan sertifikat CA. | Biaya lisensi/hosting server cloud atau on-premise standar, paling ekonomis dan terprediksi. |
| **7. Rekomendasi Kondisi Penggunaan** | **Tepat untuk:** Ekosistem verifikasi global lintas batas negara di mana tidak ada otoritas sentral yang dipercayai oleh semua pihak (misal: verifikasi ijazah internasional). | **Tepat untuk:** Konsorsium antar-universitas nasional (misal aliansi kampus di bawah Kemendikbudristek/LLDIKTI) dengan kebutuhan privasi data ketat dan throughput tinggi. | **Tepat untuk:** Sistem informasi akademik internal satu kampus di mana kepercayaan sentral penuh dipegang oleh pihak rektorat dan tidak memerlukan pembuktian publik independen. |

---

## 7. Kesimpulan & Penyerahan ke Anggota Lain
Rancangan arsitektur dan smart contract ini telah mengunci antarmuka kontrak, batas keamanan data, penanganan error, serta mitigasi DoS gas limit (maksimal batch 50 item). Kontrak ini siap digunakan oleh:
- **Anggota B**: Untuk menyusun unit test skenario positif, negatif, batas (*boundary*), dan kontrol akses, serta deployment script.
- **Anggota C**: Untuk mengintegrasikan frontend web dengan ABI dan antarmuka fungsi yang telah dibakukan.
- **Anggota D**: Untuk melakukan audit keamanan (analisis threat model, pemeriksaan reentrancy, access control, input validation, dan tata kelola).
