const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AcademicCredential", function () {
  let AcademicCredential;
  let contract;
  let admin, issuer, revoker, holder1, holder2, verifier, unauthorized;

  const DOC_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("UNSIL-IJAZAH-2026-001-CONTENT"));
  const DOC_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("UNSIL-IJAZAH-2026-002-CONTENT"));
  const DOC_HASH_TAMPERED = ethers.keccak256(ethers.toUtf8Bytes("TAMPERED-CONTENT"));

  // Status Enum mirror: 0 = NotFound, 1 = Valid, 2 = HashMismatch, 3 = Revoked, 4 = Expired
  const Status = {
    NotFound: 0n,
    Valid: 1n,
    HashMismatch: 2n,
    Revoked: 3n,
    Expired: 4n,
  };

  beforeEach(async function () {
    [admin, issuer, revoker, holder1, holder2, verifier, unauthorized] =
      await ethers.getSigners();

    AcademicCredential = await ethers.getContractFactory("AcademicCredential");
    contract = await AcademicCredential.deploy(admin.address);
    await contract.waitForDeployment();

    // Setup roles
    await contract.connect(admin).addIssuer(issuer.address);
    await contract.connect(admin).addRevoker(revoker.address);
  });

  describe("1. Inisialisasi & Role Management", function () {
    it("Admin harus memiliki DEFAULT_ADMIN_ROLE, ISSUER_ROLE, dan REVOKER_ROLE", async function () {
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      const ISSUER_ROLE = await contract.ISSUER_ROLE();
      const REVOKER_ROLE = await contract.REVOKER_ROLE();

      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await contract.hasRole(ISSUER_ROLE, admin.address)).to.be.true;
      expect(await contract.hasRole(REVOKER_ROLE, admin.address)).to.be.true;
    });

    it("Admin dapat mendaftarkan dan mencabut wewenang Issuer dengan benar", async function () {
      const newIssuer = unauthorized;
      await expect(contract.connect(admin).addIssuer(newIssuer.address))
        .to.emit(contract, "IssuerAdded")
        .withArgs(newIssuer.address, admin.address);

      const ISSUER_ROLE = await contract.ISSUER_ROLE();
      expect(await contract.hasRole(ISSUER_ROLE, newIssuer.address)).to.be.true;

      await expect(contract.connect(admin).removeIssuer(newIssuer.address))
        .to.emit(contract, "IssuerRemoved")
        .withArgs(newIssuer.address, admin.address);

      expect(await contract.hasRole(ISSUER_ROLE, newIssuer.address)).to.be.false;
    });

    it("Admin dapat mendaftarkan dan mencabut wewenang Revoker dengan benar", async function () {
      const newRevoker = unauthorized;
      await expect(contract.connect(admin).addRevoker(newRevoker.address))
        .to.emit(contract, "RevokerAdded")
        .withArgs(newRevoker.address, admin.address);

      const REVOKER_ROLE = await contract.REVOKER_ROLE();
      expect(await contract.hasRole(REVOKER_ROLE, newRevoker.address)).to.be.true;

      await expect(contract.connect(admin).removeRevoker(newRevoker.address))
        .to.emit(contract, "RevokerRemoved")
        .withArgs(newRevoker.address, admin.address);

      expect(await contract.hasRole(REVOKER_ROLE, newRevoker.address)).to.be.false;
    });

    it("Akun non-admin tidak boleh menambahkan issuer", async function () {
      await expect(
        contract.connect(unauthorized).addIssuer(unauthorized.address)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Admin tidak boleh menambahkan issuer dengan alamat kosong", async function () {
      await expect(
        contract.connect(admin).addIssuer(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "InvalidAddress");
    });

    it("Admin tidak boleh menambahkan revoker dengan alamat kosong", async function () {
      await expect(
        contract.connect(admin).addRevoker(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "InvalidAddress");
    });

    it("Akun non-admin tidak boleh mencabut role Issuer", async function () {
      await expect(
        contract.connect(unauthorized).removeIssuer(issuer.address)
      ).to.be.revertedWithCustomError(
        contract,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Akun non-admin tidak boleh mencabut role Revoker", async function () {
      await expect(
        contract.connect(unauthorized).removeRevoker(revoker.address)
      ).to.be.revertedWithCustomError(
        contract,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("2. Penerbitan Kredensial Tunggal (issueCredential)", function () {
    it("Issuer berhasil menerbitkan satu kredensial dan memancarkan CredentialIssued", async function () {
      await expect(
        contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder1.address, DOC_HASH_1, 0)
      )
        .to.emit(contract, "CredentialIssued")
        .withArgs("UNSIL/INF/2026/001", issuer.address, holder1.address, DOC_HASH_1);

      const cred = await contract.getCredential("UNSIL/INF/2026/001");
      expect(cred.id).to.equal("UNSIL/INF/2026/001");
      expect(cred.issuer).to.equal(issuer.address);
      expect(cred.holder).to.equal(holder1.address);
      expect(cred.docHash).to.equal(DOC_HASH_1);
      expect(cred.isRevoked).to.be.false;
      expect(await contract.totalCredentials()).to.equal(1n);
    });

    it("Gagal menerbitkan jika bukan akun Issuer", async function () {
      await expect(
        contract.connect(unauthorized).issueCredential("UNSIL/INF/2026/001", holder1.address, DOC_HASH_1, 0)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Gagal menerbitkan jika ID kosong atau duplikat", async function () {
      await expect(
        contract.connect(issuer).issueCredential("", holder1.address, DOC_HASH_1, 0)
      ).to.be.revertedWithCustomError(contract, "EmptyCredentialId");

      await contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder1.address, DOC_HASH_1, 0);

      await expect(
        contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder2.address, DOC_HASH_2, 0)
      ).to.be.revertedWithCustomError(contract, "CredentialAlreadyExists");
    });

    it("Gagal menerbitkan jika holder address(0) atau docHash bytes32(0)", async function () {
      await expect(
        contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", ethers.ZeroAddress, DOC_HASH_1, 0)
      ).to.be.revertedWithCustomError(contract, "InvalidAddress");

      await expect(
        contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder1.address, ethers.ZeroHash, 0)
      ).to.be.revertedWithCustomError(contract, "EmptyDocumentHash");
    });

    it("Berhasil mengambil ID kredensial berdasarkan indeks", async function () {
      await contract.connect(issuer).issueCredential(
        "UNSIL/INF/2026/001",
        holder1.address,
        DOC_HASH_1,
        0
      );

      const id = await contract.getCredentialIdByIndex(0);
      expect(id).to.equal("UNSIL/INF/2026/001");
    });

    it("Gagal mengambil ID kredensial jika indeks tidak tersedia", async function () {
      await expect(
        contract.getCredentialIdByIndex(999)
      ).to.be.revertedWith("Index out of bounds");
    });

    it("Gagal menerbitkan kredensial dengan waktu kedaluwarsa yang sudah lewat", async function () {
      const waktuSekarang = await time.latest();
      const waktuLampau = waktuSekarang - 3600;

      await expect(
        contract.connect(issuer).issueCredential(
          "CRED-EXPIRED-001",
          holder1.address,
          DOC_HASH_1,
          waktuLampau
        )
      ).to.be.revertedWithCustomError(contract, "InvalidExpirationTime")
        .withArgs(waktuLampau);
    });
  });

  describe("3. Penerbitan Massal (issueBatch)", function () {
    it("Issuer berhasil menerbitkan batch kredensial", async function () {
      const batch = [
        { id: "UNSIL/INF/2026/101", holder: holder1.address, docHash: DOC_HASH_1, expiresAt: 0 },
        { id: "UNSIL/INF/2026/102", holder: holder2.address, docHash: DOC_HASH_2, expiresAt: 0 },
      ];

      await expect(contract.connect(issuer).issueBatch(batch))
        .to.emit(contract, "CredentialIssued")
        .withArgs("UNSIL/INF/2026/101", issuer.address, holder1.address, DOC_HASH_1);

      expect(await contract.totalCredentials()).to.equal(2n);
    });

    it("Gagal jika batch kosong atau melebihi MAX_BATCH_SIZE (50)", async function () {
      await expect(
        contract.connect(issuer).issueBatch([])
      ).to.be.revertedWithCustomError(contract, "InvalidBatchSize");

      const oversizedBatch = [];
      for (let i = 1; i <= 51; i++) {
        oversizedBatch.push({
          id: `BATCH-${i}`,
          holder: holder1.address,
          docHash: DOC_HASH_1,
          expiresAt: 0,
        });
      }

      await expect(
        contract.connect(issuer).issueBatch(oversizedBatch)
      ).to.be.revertedWithCustomError(contract, "InvalidBatchSize");
    });
  });

  describe("4. Pencabutan Kredensial (revokeCredential)", function () {
    beforeEach(async function () {
      await contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder1.address, DOC_HASH_1, 0);
    });

    it("Revoker dapat mencabut kredensial dan memancarkan CredentialRevoked", async function () {
      await expect(
        contract.connect(revoker).revokeCredential("UNSIL/INF/2026/001", "Pelanggaran Integritas Akademik")
      )
        .to.emit(contract, "CredentialRevoked")
        .withArgs("UNSIL/INF/2026/001", revoker.address, "Pelanggaran Integritas Akademik");

      const cred = await contract.getCredential("UNSIL/INF/2026/001");
      expect(cred.isRevoked).to.be.true;
      expect(cred.revokeReason).to.equal("Pelanggaran Integritas Akademik");
    });

    it("Issuer juga dapat mencabut kredensial yang diterbitkannya", async function () {
      await expect(
        contract.connect(issuer).revokeCredential("UNSIL/INF/2026/001", "Koreksi data administratif")
      ).to.emit(contract, "CredentialRevoked");

      const cred = await contract.getCredential("UNSIL/INF/2026/001");
      expect(cred.isRevoked).to.be.true;
    });

    it("Gagal jika akun tanpa wewenang mencoba mencabut", async function () {
      await expect(
        contract.connect(unauthorized).revokeCredential("UNSIL/INF/2026/001", "Tanpa wewenang")
      ).to.be.revertedWithCustomError(contract, "UnauthorizedCaller");
    });

    it("Gagal jika kredensial sudah pernah dicabut sebelumnya", async function () {
      await contract.connect(revoker).revokeCredential("UNSIL/INF/2026/001", "Alasan awal");

      await expect(
        contract.connect(revoker).revokeCredential("UNSIL/INF/2026/001", "Alasan kedua")
      ).to.be.revertedWithCustomError(contract, "CredentialAlreadyRevoked");
    });

    it("Gagal mencabut kredensial yang tidak ditemukan", async function () {
      await expect(
        contract.connect(revoker).revokeCredential("ID-TIDAK-ADA", "Pengujian")
      ).to.be.revertedWithCustomError(contract, "CredentialNotFound")
        .withArgs("ID-TIDAK-ADA");
    });
  });

  describe("5. Persetujuan Akses oleh Holder (grantAccess & hasAccess)", function () {
    beforeEach(async function () {
      await contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder1.address, DOC_HASH_1, 0);
    });

    it("Holder dapat memberikan persetujuan akses dan memancarkan AccessGranted", async function () {
      await expect(
        contract.connect(holder1).grantAccess("UNSIL/INF/2026/001", verifier.address)
      )
        .to.emit(contract, "AccessGranted")
        .withArgs("UNSIL/INF/2026/001", holder1.address, verifier.address);

      expect(await contract.hasAccess("UNSIL/INF/2026/001", verifier.address)).to.be.true;
      expect(await contract.hasAccess("UNSIL/INF/2026/001", unauthorized.address)).to.be.false;
    });

    it("Bukan holder dilarang memanggil grantAccess", async function () {
      await expect(
        contract.connect(unauthorized).grantAccess("UNSIL/INF/2026/001", verifier.address)
      ).to.be.revertedWithCustomError(contract, "NotCredentialHolder");
    });

    it("Gagal memberikan akses untuk kredensial yang tidak ditemukan", async function () {
      await expect(
        contract.connect(holder1).grantAccess("ID-TIDAK-ADA", verifier.address)
      ).to.be.revertedWithCustomError(contract, "CredentialNotFound")
        .withArgs("ID-TIDAK-ADA");
    });
  });

  describe("6. Verifikasi Publik (verifyCredential)", function () {
    const credId = "UNSIL/INF/2026/001";
    const expiringId = "UNSIL/INF/2026/EXP";

    beforeEach(async function () {
      await contract.connect(issuer).issueCredential(credId, holder1.address, DOC_HASH_1, 0);
    });

    it("Mengembalikan status Valid (1) jika hash sesuai dan aktif", async function () {
      const result = await contract.verifyCredential(credId, DOC_HASH_1);
      expect(result.isValid).to.be.true;
      expect(result.status).to.equal(Status.Valid);
      expect(result.issuer).to.equal(issuer.address);
      expect(result.holder).to.equal(holder1.address);
    });

    it("Mengembalikan status HashMismatch (2) jika dokumen tidak sesuai", async function () {
      const result = await contract.verifyCredential(credId, DOC_HASH_TAMPERED);
      expect(result.isValid).to.be.false;
      expect(result.status).to.equal(Status.HashMismatch);
    });

    it("Mengembalikan status Revoked (3) jika kredensial telah dicabut", async function () {
      await contract.connect(revoker).revokeCredential(credId, "Ijazah Dibatalkan");

      const result = await contract.verifyCredential(credId, DOC_HASH_1);
      expect(result.isValid).to.be.false;
      expect(result.status).to.equal(Status.Revoked);
    });

    it("Mengembalikan status Expired (4) jika waktu sudah melewati tanggal kedaluwarsa", async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 3600; // 1 jam ke depan

      await contract.connect(issuer).issueCredential(expiringId, holder2.address, DOC_HASH_2, expiresAt);

      // Verifikasi saat masih aktif
      let resBefore = await contract.verifyCredential(expiringId, DOC_HASH_2);
      expect(resBefore.isValid).to.be.true;
      expect(resBefore.status).to.equal(Status.Valid);

      // Majukan waktu 2 jam
      await time.increase(7200);

      let resAfter = await contract.verifyCredential(expiringId, DOC_HASH_2);
      expect(resAfter.isValid).to.be.false;
      expect(resAfter.status).to.equal(Status.Expired);
    });

    it("Mengembalikan status NotFound (0) jika ID kredensial tidak ada", async function () {
      const result = await contract.verifyCredential("ID_TIDAK_ADA", DOC_HASH_1);
      expect(result.isValid).to.be.false;
      expect(result.status).to.equal(Status.NotFound);
    });


    it("Status Revoked tetap diprioritaskan jika hash dokumen salah", async function () {
      await contract.connect(revoker).revokeCredential(
        credId,
        "Kredensial dibatalkan"
      );

      const result = await contract.verifyCredential(
        credId,
        DOC_HASH_TAMPERED
      );

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal(Status.Revoked);
    });
  });

  describe("7. Emergency Pause Mechanism", function () {
    it("Admin dapat melakukan pause dan menghentikan transaksi operasional", async function () {
      await contract.connect(admin).pause();

      await expect(
        contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder1.address, DOC_HASH_1, 0)
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");

      await contract.connect(admin).unpause();

      await expect(
        contract.connect(issuer).issueCredential("UNSIL/INF/2026/001", holder1.address, DOC_HASH_1, 0)
      ).to.emit(contract, "CredentialIssued");
    });

    it("Pause harus menghentikan penerbitan batch", async function () {
      await contract.connect(admin).pause();

      const batch = [
        {
          id: "BATCH-PAUSED-001",
          holder: holder1.address,
          docHash: DOC_HASH_1,
          expiresAt: 0,
        },
      ];

      await expect(
        contract.connect(issuer).issueBatch(batch)
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("Pause harus menghentikan pemberian akses", async function () {
      await contract.connect(issuer).issueCredential(
        "UNSIL/INF/2026/PAUSE",
        holder1.address,
        DOC_HASH_1,
        0
      );

      await contract.connect(admin).pause();

      await expect(
        contract.connect(holder1).grantAccess(
          "UNSIL/INF/2026/PAUSE",
          verifier.address
        )
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });
  });

  it("Gagal mengambil kredensial yang tidak ditemukan", async function () {
    await expect(
      contract.getCredential("ID-TIDAK-ADA")
    ).to.be.revertedWithCustomError(contract, "CredentialNotFound")
      .withArgs("ID-TIDAK-ADA");
  });
});
