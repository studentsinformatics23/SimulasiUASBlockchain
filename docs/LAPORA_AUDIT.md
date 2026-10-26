# Laporan Audit Keamanan Smart Contract dan Tata Kelola

## 1. Ringkasan

Pemeriksaan berfokus pada pembatasan kewenangan saat menerbitkan dan mencabut kredensial, mekanisme persetujuan akses Holder, pengelolaan peran, serta risiko privasi data pada blockchain. Pada versi kode awal, fungsi pencabutan perlu membedakan kewenangan Issuer biasa dari Revoker, dan Holder belum memiliki fungsi untuk menarik kembali persetujuan akses yang telah dicatat. Perbaikan untuk kedua area tersebut telah diuji dalam test suite terbaru.

Berdasarkan hasil pengujian terbaru yang dikonfirmasi, **seluruh 39 test pada test suite berhasil lulus (`39 passing`)**. File `AcademicCredential.test.js` yang ditinjau memuat 39 kasus `it()` yang mencakup pengelolaan role, penerbitan dan pencabutan kredensial, persetujuan akses Holder, verifikasi publik, serta mekanisme emergency pause. Empat tes regresi yang ditambahkan untuk pembatasan pencabutan lintas-Issuer dan pencabutan persetujuan akses juga termasuk dalam rangkaian tersebut. Bukti deployment yang tercatat sebelumnya menunjukkan kontrak pernah berhasil di-deploy pada jaringan Hardhat lokal; status deployment ulang untuk versi terbaru dibahas terpisah pada bagian re-testing.


## 2. Metode dan cakupan

Pemeriksaan mencakup peninjauan kode Solidity, test suite Hardhat, skrip deployment, dan bukti terminal yang diberikan. Area yang diperiksa adalah:

1. **Kontrol akses:** apakah fungsi hanya dapat dijalankan oleh role yang sesuai dan apakah kewenangan Issuer dibatasi pada kredensial yang menjadi tanggung jawabnya.
2. **Validasi keadaan:** apakah kredensial harus terdaftar, belum dicabut, dan persetujuan yang hendak dicabut memang tersedia.
3. **Tata kelola:** pembagian tanggung jawab Admin, Issuer, Revoker, Holder, dan Verifier.
4. **Privasi:** risiko informasi yang tersimpan di state atau event blockchain yang dapat diamati publik.
5. **Re-testing:** penambahan tes regresi untuk memastikan perbaikan tidak membuka masalah baru.

Audit ini merupakan tinjauan kode dan pengujian unit untuk proyek akademik. Audit ini bukan audit formal independen dan tidak membuktikan kesiapan kontrak untuk digunakan pada jaringan produksi.

## 3. Bukti pengujian yang telah dilakukan

### 3.1 Pengujian unit versi setelah perubahan

Berdasarkan hasil pengujian terbaru yang dikonfirmasi, test suite berhasil dengan hasil **`39 passing`**. File tes yang ditinjau memuat 39 kasus pengujian. Skenario yang tercakup meliputi:

- Inisialisasi dan pengelolaan role Admin, Issuer, dan Revoker.
- Penerbitan kredensial tunggal dan penerbitan batch.
- Pencabutan kredensial oleh pihak yang memiliki kewenangan dan penolakan atas kondisi yang tidak valid.
- Pemberian persetujuan akses oleh Holder.
- Verifikasi publik, termasuk status valid, hash tidak cocok, revoked, expired, dan not found.
- Mekanisme emergency pause.

### 3.2 Deployment lokal

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Output terminal memperlihatkan hal-hal berikut:

| Item | Hasil berdasarkan screenshot |
|---|---|
| Jaringan | Hardhat localhost |
| RPC node | `http://127.0.0.1:8545/` |
| Status deployment | Berhasil (`Smart Contract Deployed Successfully!`) |
| Contract address | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| Block number | `1` |
| Pendaftaran role | Sample Issuer dan Sample Revoker berhasil didaftarkan |
| Kredensial contoh | `UNSIL/INF/2026/001` berhasil diterbitkan untuk pengujian |
| Status akhir skrip | Deployment selesai dan siap untuk integrasi frontend/pengujian |

Alamat kontrak dan nomor blok di atas adalah hasil dari node lokal yang terlihat pada screenshot. Hash transaksi deployment sebaiknya disalin persis dari terminal bila hendak dicantumkan karena bukti visual yang tersedia tidak cukup tajam untuk memastikan seluruh karakter hash dengan aman.

Deployment yang berhasil membuktikan skrip deployment dapat menyelesaikan langkah-langkahnya di jaringan lokal yang digunakan. Namun, alamat kontrak saja tidak membuktikan bahwa deployment tersebut berisi versi kontrak setelah perubahan audit. Setelah mengganti kode, kontrak harus di-deploy ulang dan hasilnya dicatat kembali.

### 3.3 Catatan keamanan tentang akun Hardhat lokal

Screenshot node menampilkan peringatan bahwa akun dan private key yang dibuat oleh Hardhat adalah nilai uji yang diketahui publik. Akun tersebut hanya untuk pengembangan lokal. **Jangan pernah menggunakan private key akun Hardhat bawaan pada testnet atau mainnet dan jangan menyalinnya ke konfigurasi produksi.** Jika screenshot akan disebarkan di luar laporan kelas, potong atau tutupi baris private key agar tidak mengalihkan perhatian dari bukti pengujian.

## 4. Temuan audit

### F-01 — Batas pencabutan kredensial oleh Issuer

**Prioritas:** Sedang–tinggi  
**Temuan:** Pada kode awal, pemeriksaan peran `ISSUER_ROLE` atau `REVOKER_ROLE` saja belum cukup untuk membuktikan bahwa Issuer biasa adalah penerbit kredensial yang hendak dicabut. Kondisi ini berpotensi membuat satu Issuer mencabut kredensial Issuer lain tanpa kewenangan lintas penerbit.

**Perbaikan:** Jika pemanggil memiliki `REVOKER_ROLE`, pencabutan lintas penerbit diizinkan sesuai kebijakan. Jika pemanggil hanya memiliki `ISSUER_ROLE`, kontrak memastikan `cred.issuer == msg.sender`; jika tidak, transaksi ditolak menggunakan custom error `NotCredentialIssuer`.

**Status pengujian terbaru:** Tes regresi lintas-Issuer telah dijalankan sebagai bagian dari test suite dan dinyatakan lulus dalam hasil terbaru, yaitu `39 passing`. Tes ini memeriksa bahwa Issuer kedua ditolak saat mencoba mencabut kredensial milik Issuer pertama, serta status kredensial tetap tidak dicabut.

### F-02 — Mekanisme pencabutan persetujuan akses oleh Holder

**Prioritas:** Sedang  
**Temuan:** Pada versi awal, fungsi `grantAccess` mencatat persetujuan Holder tetapi belum menyediakan mekanisme untuk menariknya kembali.

**Perbaikan:** Fungsi `revokeAccess(id, verifier)` ditambahkan dengan pemeriksaan kredensial, kewenangan Holder, alamat Verifier, dan status persetujuan. Jika berhasil, izin menjadi tidak aktif dan event `AccessRevoked` dipancarkan.

**Status pengujian terbaru:** Tes regresi pencabutan persetujuan telah dijalankan sebagai bagian dari test suite dan dinyatakan lulus dalam hasil terbaru, yaitu `39 passing`. Pengujian memeriksa bahwa Holder dapat mencabut persetujuan, event `AccessRevoked` dipancarkan, dan `hasAccess` berubah menjadi `false`; pengujian tambahan memastikan pihak selain Holder ditolak dan izin yang belum diberikan tidak dapat dicabut.

### F-03 — Persetujuan akses belum membatasi fungsi verifikasi publik

**Prioritas:** Sedang / keputusan desain  
**Temuan:** `hasAccess` mencatat status persetujuan, tetapi `verifyCredential` tetap merupakan fungsi publik dan tidak memeriksa `hasAccess`. Dengan begitu, persetujuan yang tercatat belum berfungsi sebagai pembatas akses pada pemanggilan `verifyCredential`.

**Analisis:** Hal ini tidak otomatis salah apabila tim memang menghendaki verifikasi status kredensial secara publik. Namun, laporan dan antarmuka tidak boleh mengklaim bahwa consent telah membatasi akses apabila kontrak tidak menerapkannya.

**Rekomendasi:** Kelompok perlu menetapkan apakah verifikasi status minimal tetap publik, atau apakah pemeriksaan yang lebih terperinci memerlukan izin. Bila akses harus dibatasi, logika kontrak dan tes harus diubah sesuai keputusan tersebut.

### F-04 — Kewenangan admin terpusat

**Prioritas:** Sedang  
**Temuan:** Admin dapat mengatur role serta menjalankan mekanisme `pause`/`unpause`. Konsentrasi kewenangan pada satu akun dapat memperbesar dampak jika kunci hilang atau akun diambil alih.

**Rekomendasi tata kelola:** Pisahkan akun administrasi dari akun operasional. Untuk penerapan nyata, pertimbangkan admin multisig, proses persetujuan untuk perubahan role, rotasi kunci, dan pencatatan tindakan admin.

### F-05 — Alasan pencabutan dapat terbaca publik

**Prioritas:** Sedang  
**Temuan:** Alasan pencabutan disimpan pada blockchain dan/atau dicantumkan pada event. Informasi tersebut tidak boleh dianggap rahasia.

**Rekomendasi:** Gunakan kode alasan umum. Jangan menyimpan nama lengkap, NIM, dokumen pribadi, atau rincian disipliner sensitif sebagai alasan on-chain. Simpan detail yang memerlukan pembatasan akses di sistem off-chain yang dikelola dengan baik.

### F-06 — Bukti hasil pengujian perlu disimpan secara konsisten

**Prioritas:** Dokumentasi  
**Temuan:** Laporan sebelumnya mencampurkan keterangan mengenai 35 tes baseline dengan output `39 passing`. File test suite terbaru yang ditinjau memuat 39 kasus `it()`, dan pelaksana mengonfirmasi bahwa seluruh 39 tes berhasil dijalankan.

**Dampak:** Ketidakkonsistenan angka dapat membingungkan pembaca mengenai versi kode yang diuji dan hasil yang benar-benar diperoleh.

**Rekomendasi:** Gunakan hasil terbaru secara konsisten pada ringkasan dan kesimpulan. Simpan screenshot terminal yang menampilkan `39 passing` sebagai bukti pasca-audit, dan pisahkan dari screenshot baseline jika keduanya digunakan. Ketidakkonsistenan angka pada laporan ini telah diperbaiki dalam revisi sekarang.

## 5. Perubahan dan hasil tes regresi

Empat skenario regresi berikut telah ditambahkan ke `AcademicCredential.test.js` dan termasuk dalam test suite yang menurut hasil pengujian terbaru berhasil dengan `39 passing`:

- **RT-01 — Issuer lintas penerbit:** Tes memastikan transaksi Issuer kedua ditolak dengan `NotCredentialIssuer` dan kredensial milik Issuer pertama tetap belum dicabut.
- **RT-02 — Holder mencabut persetujuan:** Tes memastikan event `AccessRevoked` muncul dan `hasAccess` menjadi `false` setelah Holder mencabut izin.
- **RT-03 — Pemanggil bukan Holder:** Tes memastikan akun lain ditolak saat mencoba mencabut persetujuan dan izin tetap aktif.
- **RT-04 — Persetujuan belum diberikan:** Tes memastikan pencabutan ditolak jika Holder belum pernah memberikan persetujuan kepada Verifier.

Tes lainnya juga tercakup dalam hasil tersebut, termasuk Issuer mencabut kredensial yang diterbitkannya sendiri, Revoker mencabut lintas penerbit, penerbitan satuan dan batch, verifikasi kredensial, pengelolaan role, serta pembatasan saat `pause` aktif.

## 6. Status re-testing

### Status berdasarkan bukti yang tersedia

| Pemeriksaan | Status | Bukti / catatan |
|---|---|---|
| Unit test versi setelah perubahan | **Lulus: 39 passing** | Hasil terbaru dikonfirmasi oleh pelaksana; simpan screenshot terminal sebagai lampiran bukti |
| RT-01 — pembatasan pencabutan lintas-Issuer | **Lulus** | Termasuk dalam test suite 39 tes; memastikan transaksi ditolak dan kredensial tetap aktif |
| RT-02 — Holder mencabut persetujuan | **Lulus** | Termasuk dalam test suite 39 tes; memeriksa event `AccessRevoked` dan `hasAccess = false` |
| RT-03 — pemanggil bukan Holder | **Lulus** | Termasuk dalam test suite 39 tes; transaksi ditolak dan izin tetap aktif |
| RT-04 — persetujuan belum diberikan | **Lulus** | Termasuk dalam test suite 39 tes; transaksi ditolak |
| Deployment Hardhat lokal yang tercatat sebelumnya | **Berhasil** | Bukti deployment terdahulu; belum otomatis membuktikan versi terbaru telah di-deploy ulang |
| Compile versi setelah perubahan | **Belum dikonfirmasi** | Jalankan `npx hardhat compile` dan simpan outputnya |
| Coverage versi setelah perubahan | **Belum dikonfirmasi** | Jalankan `npx hardhat coverage` dan simpan outputnya |
| Deployment ulang versi setelah perubahan | **Belum dikonfirmasi** | Perlu dilakukan bila demo menggunakan kontrak yang diperbarui |

### Verifikasi tambahan yang masih disarankan

Pengujian unit telah dikonfirmasi lulus dengan 39 tes. Untuk melengkapi bukti laporan, pastikan terminal berada di folder root proyek yang berisi `package.json` dan jalankan compile serta coverage pada versi kode yang sama:

```bash
npx hardhat compile
npx hardhat coverage
```

Untuk mereproduksi hasil unit test lengkap, jalankan kembali:

```bash
npx hardhat test
```

Tes tertentu juga dapat dijalankan secara terpisah bila diperlukan:

```bash
npx hardhat test --grep "Issuer tidak boleh mencabut kredensial yang diterbitkan Issuer lain"
```

```bash
npx hardhat test --grep "Holder dapat mencabut persetujuan akses"
```

Simpan output terminal aktual sebagai bukti. Status `39 passing` di laporan ini merujuk pada hasil terbaru yang dikonfirmasi pelaksana; compile, coverage, dan deployment ulang tetap perlu dicatat terpisah karena belum dikonfirmasi.

Jika demo menggunakan node lokal yang lama, deploy ulang kontrak setelah perubahan. Perbarui catatan deployment dengan contract address dan transaction hash yang baru, serta pastikan frontend menggunakan alamat kontrak yang sesuai. Alamat lokal `0x5FbDB2315678afecb367f032d93F642f64180aa3` yang terlihat di screenshot adalah bukti deployment yang dikirim, bukan otomatis alamat hasil deployment setelah perubahan audit.

## 7. Analisis tata kelola

**Admin.** Memiliki kewenangan pengaturan role dan penghentian sementara operasi. Risiko utama adalah konsentrasi kewenangan serta kehilangan atau kompromi kunci admin.

**Issuer.** Bertanggung jawab atas penerbitan kredensial. Issuer biasa sebaiknya hanya mencabut kredensial yang diterbitkannya sendiri; pencabutan lintas penerbit harus dibatasi pada role khusus seperti Revoker.

**Revoker.** Memiliki kewenangan luas untuk mencabut kredensial lintas penerbit. Penetapan role ini perlu mengikuti prosedur resmi dan meninggalkan jejak audit.

**Holder.** Dapat memberikan dan menarik kembali catatan persetujuan akses. Namun, consent tersebut belum membatasi fungsi verifikasi publik karena `verifyCredential` tetap dapat dipanggil secara publik dan tidak memeriksa `hasAccess`.

**Verifier.** Dapat memeriksa status/hash kredensial melalui fungsi publik. Alamat wallet tidak otomatis membuktikan identitas dunia nyata pengguna.

### Rekomendasi tata kelola

1. Pisahkan akun admin dari akun operasional dan gunakan multisig untuk lingkungan yang memerlukan jaminan lebih tinggi.
2. Buat prosedur resmi untuk penerbitan dan pencabutan: alasan bisnis, bukti pendukung off-chain, pemeriksa kedua, waktu, dan nomor tiket.
3. Tetapkan kebijakan privasi dengan jelas. Jangan menyimpan data pribadi atau alasan sensitif di blockchain.
4. Dokumentasikan proses pengelolaan kunci, rotasi akun, respons insiden, `pause`, dan pemulihan layanan.
5. Lakukan review kode oleh anggota lain dan pertimbangkan analisis statis serta pengujian pada testnet sebelum deployment yang lebih serius.

## 8. Kesimpulan

Berdasarkan hasil terbaru yang dikonfirmasi pelaksana, **seluruh 39 test pada test suite berhasil lulus (`39 passing`)**, termasuk empat tes regresi untuk membatasi pencabutan kredensial lintas-Issuer dan memungkinkan Holder menarik kembali persetujuan akses. Hasil tersebut mendukung bahwa skenario yang diuji berjalan sesuai ekspektasi. Dokumentasi deployment terdahulu juga menunjukkan smart contract pernah berhasil dijalankan pada jaringan Hardhat lokal, mendaftarkan role contoh, dan menerbitkan kredensial uji. Meski demikian, status compile, coverage, dan deployment ulang untuk versi terbaru belum dikonfirmasi pada laporan ini. Temuan utama yang masih relevan adalah bahwa persetujuan akses belum membatasi fungsi `verifyCredential` yang bersifat publik, sementara pengelolaan role, privasi data on-chain, dan kewenangan admin tetap memerlukan tata kelola yang jelas. Untuk melengkapi dokumentasi pengujian, lampirkan screenshot output `39 passing` serta hasil compile dan coverage jika sudah dijalankan.
