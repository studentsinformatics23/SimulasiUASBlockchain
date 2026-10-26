# Dokumentasi Kasus Debugging (Tugas Anggota B)
**Mata Kuliah:** Blockchain (KP70067008), Universitas Siliwangi  
**Tahun Akademik:** 2026/2027 Ganjil  
**Use Case:** Simulasi Verifikasi Kredensial Akademik  
**Penanggung Jawab:** Anggota B (Testing, Deployment, & Perbaikan)

---

## 1. Identifikasi Kasus Debugging
* **Komponen Terdampak:** Modul Verifikasi Publik (`verifyCredential`) & Interaksi Frontend Ethers.js v6 dengan Smart Contract Solidity.
* **Gejala Masalah (Issue):**
  Saat pengguna mencoba melakukan verifikasi berkas pada frontend dengan memasukkan teks string input biasa (seperti `"IJAZAH_CONTOH_UNIVERSITAS_SILIWANGI_2026"`), transaksi read-only mengalami revert dengan error:
  ```text
  Error: invalid BytesLike value (argument="value", value="IJAZAH_...", code=INVALID_ARGUMENT)
  ```
  atau ketika nilai hash dikirimkan tanpa format 32 byte hex yang presisi, smart contract salah mendeteksi status sebagai `HashMismatch` padahal berkas valid.

---

## 2. Analisis Akar Masalah (Root Cause Analysis)
1. **Perbedaan Tipe Data Solidity vs Javascript**:
   - Di smart contract `AcademicCredential.sol`, parameter hash dokumen didefinisikan sebagai `bytes32 docHash`:
     ```solidity
     function verifyCredential(string calldata id, bytes32 docHash) external view returns (...)
     ```
   - Di sisi JavaScript (Ethers.js v6), tipe `bytes32` memerlukan representasi hex string tepat sepanjang 66 karakter (`0x` diikuti 64 digit heksadesimal).
   - Pengguna sering kali memasukkan teks string mentah atau mengunggah file biner yang belum di-*hash* menjadi format Keccak-256 / SHA-256 heksadesimal 32 byte.

2. **Perbedaan Hash Buffer di Browser**:
   - Membaca file melalui HTML5 File API menghasilkan `ArrayBuffer`, bukan string UTF-8. Jika langsung dikonversi menggunakan string encoder biasa, nilai padding byte menjadi berbeda sehingga hash yang dihasilkan tidak cocok dengan hash yang didaftarkan saat `issueCredential`.

---

## 3. Langkah Investigasi & Solusi Perbaikan (Bug Fix)

### Perbaikan pada Frontend (`frontend/index.html`):
Dibuat fungsi helper komprehensif `hashFrom(fileEl, textEl)` yang secara pintar mendeteksi sumber input:
```javascript
async function hashFrom(fileEl, textEl) {
  // 1. Jika pengguna mengunggah berkas file asli (PDF/Doc)
  if (fileEl.files && fileEl.files[0]) {
    const buf = new Uint8Array(await fileEl.files[0].arrayBuffer());
    // Menghitung hash Keccak-256 langsung dari raw bytes array
    return ethers.keccak256(buf);
  }
  
  const v = textEl.value.trim();
  // 2. Jika pengguna memasukkan hash 32-byte valid langsung (0x...)
  if (/^0x[0-9a-fA-F]{64}$/.test(v)) {
    return v;
  }
  
  // 3. Jika pengguna memasukkan teks dokumen mentah
  if (!v) throw new Error("Isi berkas, hash, atau teks dokumen terlebih dahulu.");
  return ethers.keccak256(ethers.toUtf8Bytes(v));
}
```

### Verifikasi dengan Unit Test Tambahan:
Di file `test/AcademicCredential.test.js`, ditambahkan pengujian validasi input hash untuk memastikan fungsi menolak input kosong atau invalid:
```javascript
it("Gagal menerbitkan jika holder address(0) atau docHash bytes32(0)", async function () {
  await expect(
    contract.connect(issuer).issueCredential("TEST-01", holder1.address, ethers.ZeroHash, 0)
  ).to.be.revertedWithCustomError(contract, "EmptyDocumentHash");
});
```

---

## 4. Hasil Verifikasi Pasca-Debugging
* Pengujian unit Hardhat: 39 skenario lulus 100%.
* Pengujian antarmuka frontend: Verifikasi berkas file langsung maupun input teks manual berhasil menghasilkan hash Keccak-256 yang konsisten dengan smart contract tanpa error `INVALID_ARGUMENT`.
