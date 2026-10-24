# Deployment Record — AcademicCredential

## 1. Tujuan

Mencatat hasil deployment dan verifikasi smart contract `AcademicCredential.sol` pada jaringan Hardhat lokal sebagai bagian dari pengujian Anggota B.

## 2. Lingkungan Pengujian

- Blockchain: Hardhat Local Network
- RPC endpoint: `http://127.0.0.1:8545/`
- Perintah deployment: `npx hardhat run scripts/deploy.js --network localhost`
- Status deployment: Berhasil

## 3. Hasil Deployment

| Informasi | Hasil |
|---|---|
| Contract Address | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| Deployment Transaction Hash | `0xad672109cdda352da637053526ddf5270c64450d21fcf5862dcb7381ccba9f1a` |
| Block Number | `1` |

## 4. Pengujian Kredensial Contoh

Script deployment menerbitkan satu kredensial contoh untuk pengujian.

- Credential ID: `UNSIL/INF/2026/001`
- Document Hash (Keccak-256): `0x831f2b3844f34db27f129f13b86aebfe55981a5f14d27f30ca7a2165c19fa404`
- Hasil `verifyCredential`: berhasil
- `isValid`: `true`
- Status: `Valid` (nilai enum `1`)
- `expiresAt`: `0` (tanpa waktu kedaluwarsa)

## 5. Ringkasan Pengujian

- Unit test: 35 test berhasil (`35 passing`).
- Statement coverage: 100%.
- Branch coverage: 89.71%.
- Function coverage: 100%.
- Line coverage: 100%.

## 6. Catatan

Deployment ini dilakukan pada jaringan Hardhat lokal untuk kebutuhan pengembangan dan pengujian, bukan pada testnet atau mainnet publik.

Alamat kontrak dan data pengujian hanya berlaku pada state node lokal yang digunakan. Jika node dihentikan dan state-nya hilang, kontrak perlu di-deploy ulang.

Alamat akun yang digunakan oleh script merupakan akun uji coba lokal. Jangan menggunakan atau membagikan private key akun uji coba sebagai kredensial sungguhan.