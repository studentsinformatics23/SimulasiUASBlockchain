const hre = require("hardhat");

async function main() {
  const [deployer, issuerAccount, revokerAccount, studentAccount] = await hre.ethers.getSigners();

  console.log("====================================================");
  console.log("Simulasi Verifikasi Kredensial Akademik (Hardhat)");
  console.log("====================================================");
  console.log("Deployer / Admin Address :", deployer.address);
  console.log("Issuer Sample Address    :", issuerAccount ? issuerAccount.address : "N/A");
  console.log("Revoker Sample Address   :", revokerAccount ? revokerAccount.address : "N/A");
  console.log("Student Sample Address   :", studentAccount ? studentAccount.address : "N/A");

  const AcademicCredential = await hre.ethers.getContractFactory("AcademicCredential");
  const contract = await AcademicCredential.deploy(deployer.address);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("\n----------------------------------------------------");
  console.log("✅ Smart Contract Deployed Successfully!");
  console.log("Contract Address        :", contractAddress);
  console.log("Deployment Tx Hash      :", deployTx ? deployTx.hash : "N/A");
  console.log("Block Number            :", deployTx ? deployTx.blockNumber : "N/A");
  console.log("----------------------------------------------------");

  if (issuerAccount) {
    const txIssuer = await contract.addIssuer(issuerAccount.address);
    await txIssuer.wait();
    console.log("✅ Registered Issuer Role for :", issuerAccount.address);
  }

  if (revokerAccount) {
    const txRevoker = await contract.addRevoker(revokerAccount.address);
    await txRevoker.wait();
    console.log("✅ Registered Revoker Role for:", revokerAccount.address);
  }

  // Penerbitan kredensial contoh untuk kemudahan pengujian frontend (Anggota C)
  if (issuerAccount && studentAccount) {
    const sampleId = "UNSIL/INF/2026/001";
    const sampleHash = hre.ethers.keccak256(
      hre.ethers.toUtf8Bytes("IJAZAH_CONTOH_UNIVERSITAS_SILIWANGI_2026")
    );
    const txIssue = await contract
      .connect(issuerAccount)
      .issueCredential(sampleId, studentAccount.address, sampleHash, 0);
    const receiptIssue = await txIssue.wait();

    console.log("\n----------------------------------------------------");
    console.log("🎓 Sample Credential Issued for Testing:");
    console.log("ID                      :", sampleId);
    console.log("Holder (Student)        :", studentAccount.address);
    console.log("Doc Hash (Keccak256)    :", sampleHash);
    console.log("Issue Tx Hash           :", receiptIssue.hash);
    console.log("----------------------------------------------------");
  }

  console.log("\nDeployment completed successfully. Ready for frontend & testing integration.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
