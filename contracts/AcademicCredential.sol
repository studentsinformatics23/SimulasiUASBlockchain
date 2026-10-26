// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AcademicCredential
 * @notice Smart contract untuk simulasi verifikasi kredensial akademik terdesentralisasi.
 * @dev Mengimplementasikan kontrol akses bertingkat (Admin, Issuer, Revoker) dengan OpenZeppelin,
 *      pemisahan data on-chain (fingerprint integritas) dan off-chain (PII mahasiswa),
 *      pencegahan DoS gas limit pada batch issuance, audit trail persetujuan pemilik,
 *      serta fungsi verifikasi publik read-only tanpa gas fee.
 */
contract AcademicCredential is AccessControl, Pausable {

    // --- Roles ---
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    // --- Constants ---
    uint256 public constant MAX_BATCH_SIZE = 50;

    // --- Enums & Structs ---
    enum CredentialStatus {
        NotFound,     // 0: Kredensial tidak terdaftar
        Valid,        // 1: Aktif dan hash dokumen sesuai
        HashMismatch, // 2: ID ditemukan, tetapi hash berkas dokumen tidak cocok
        Revoked,      // 3: Kredensial telah dicabut
        Expired       // 4: Kredensial telah melewati batas masa berlaku
    }

    struct Credential {
        string id;
        address issuer;
        address holder;
        bytes32 docHash;
        uint256 issuedAt;
        uint256 expiresAt; // 0 jika berlaku seumur hidup
        bool isRevoked;
        string revokeReason;
        bool exists;
    }

    struct CredentialInput {
        string id;
        address holder;
        bytes32 docHash;
        uint256 expiresAt;
    }

    // --- State Storage ---
    mapping(string => Credential) private _credentials;
    mapping(string => mapping(address => bool)) private _accessPermissions;
    string[] private _credentialIds;

    // --- Custom Errors ---
    error InvalidAddress();
    error EmptyCredentialId();
    error EmptyDocumentHash();
    error CredentialAlreadyExists(string id);
    error CredentialNotFound(string id);
    error CredentialAlreadyRevoked(string id);
    error NotCredentialHolder(string id, address caller);
    error InvalidBatchSize(uint256 size, uint256 max);
    error InvalidExpirationTime(uint256 expiresAt);
    error UnauthorizedCaller();
    error NotCredentialIssuer(string id, address caller);
    error AccessNotGranted(string id, address verifier);

    // --- Events ---
    event IssuerAdded(address indexed issuer, address indexed addedBy);
    event IssuerRemoved(address indexed issuer, address indexed removedBy);
    event RevokerAdded(address indexed revoker, address indexed addedBy);
    event RevokerRemoved(address indexed revoker, address indexed removedBy);
    event CredentialIssued(string indexed id, address indexed issuer, address indexed holder, bytes32 docHash);
    event CredentialRevoked(string indexed id, address indexed revoker, string reason);
    event AccessGranted(string indexed id, address indexed holder, address indexed verifier);
    event AccessRevoked(string indexed id, address indexed holder, address indexed verifier);

    // --- Constructor ---
    /**
     * @param admin Alamat yang akan memegang DEFAULT_ADMIN_ROLE, ISSUER_ROLE, dan REVOKER_ROLE awal.
     */
    constructor(address admin) {
        if (admin == address(0)) revert InvalidAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);
    }

    // --- Admin Functions ---

    /**
     * @notice Mendaftarkan institusi/fakultas penerbit baru (Issuer).
     * @param issuer Alamat akun issuer yang akan didaftarkan.
     */
    function addIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (issuer == address(0)) revert InvalidAddress();
        grantRole(ISSUER_ROLE, issuer);
        emit IssuerAdded(issuer, msg.sender);
    }

    /**
     * @notice Mencabut wewenang penerbit (Issuer).
     * @param issuer Alamat akun issuer yang akan dicabut wewenangnya.
     */
    function removeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, issuer);
        emit IssuerRemoved(issuer, msg.sender);
    }

    /**
     * @notice Mendaftarkan pihak pemeriksa/pencabut kredensial (Revoker).
     * @param revoker Alamat akun revoker yang akan didaftarkan.
     */
    function addRevoker(address revoker) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (revoker == address(0)) revert InvalidAddress();
        grantRole(REVOKER_ROLE, revoker);
        emit RevokerAdded(revoker, msg.sender);
    }

    /**
     * @notice Mencabut wewenang pencabut kredensial (Revoker).
     * @param revoker Alamat akun revoker yang akan dicabut wewenangnya.
     */
    function removeRevoker(address revoker) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(REVOKER_ROLE, revoker);
        emit RevokerRemoved(revoker, msg.sender);
    }

    /**
     * @notice Menjeda fungsi transaksi kontrak dalam keadaan darurat keamanan.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Mengaktifkan kembali fungsi transaksi kontrak setelah masa jeda.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // --- Core Credential Lifecycle Functions ---

    /**
     * @notice Menerbitkan satu kredensial akademik ke blockchain.
     * @param id Identifier kredensial unik (human-readable string, misal "UNSIL/INF/2026/001").
     * @param holder Alamat dompet mahasiswa pemilik ijazah.
     * @param docHash Hash kriptografis dokumen berkas fisik asli (Keccak256 / SHA-256).
     * @param expiresAt Unix timestamp kedaluwarsa dokumen (0 jika berlaku permanen).
     */
    function issueCredential(
        string calldata id,
        address holder,
        bytes32 docHash,
        uint256 expiresAt
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        _issueSingle(id, holder, docHash, expiresAt);
    }

    /**
     * @notice Menerbitkan kredensial akademik secara massal dengan batas ukuran aman DoS.
     * @param credentials Array struct kredensial yang akan diterbitkan.
     */
    function issueBatch(
        CredentialInput[] calldata credentials
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        uint256 length = credentials.length;
        if (length == 0 || length > MAX_BATCH_SIZE) {
            revert InvalidBatchSize(length, MAX_BATCH_SIZE);
        }

        for (uint256 i = 0; i < length; ) {
            _issueSingle(
                credentials[i].id,
                credentials[i].holder,
                credentials[i].docHash,
                credentials[i].expiresAt
            );
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Mencabut kredensial akademik bermasalah beserta alasan pencabutan.
     * @dev Dapat dipanggil oleh akun dengan wewenang ISSUER_ROLE atau REVOKER_ROLE.
     * @param id Identifier kredensial yang akan dicabut.
     * @param reason Keterangan/alasan pencabutan kredensial.
     */
    function revokeCredential(
        string calldata id,
        string calldata reason
    ) external whenNotPaused {
        bool isRevoker = hasRole(REVOKER_ROLE, msg.sender);
        bool isIssuer = hasRole(ISSUER_ROLE, msg.sender);
        if (!isRevoker && !isIssuer) {
            revert UnauthorizedCaller();
        }

        Credential storage cred = _credentials[id];
        if (!cred.exists) {
            revert CredentialNotFound(id);
        }
        if (cred.isRevoked) {
            revert CredentialAlreadyRevoked(id);
        }

        // Revoker is an explicitly delegated cross-institution role. An Issuer
        // without REVOKER_ROLE may revoke only credentials it originally issued.
        if (!isRevoker && cred.issuer != msg.sender) {
            revert NotCredentialIssuer(id, msg.sender);
        }

        cred.isRevoked = true;
        cred.revokeReason = reason;

        emit CredentialRevoked(id, msg.sender, reason);
    }

    /**
     * @notice Mahasiswa (Holder) memberikan izin persetujuan akses formal kepada Verifier.
     * @dev Memenuhi audit log kepatuhan persetujuan pemilik data (UU PDP Pasal 20).
     * @param id Identifier kredensial terkait milik pemanggil.
     * @param verifier Alamat dompet pihak ketiga (perusahaan/rekruter) yang diberikan izin.
     */
    function grantAccess(
        string calldata id,
        address verifier
    ) external whenNotPaused {
        if (verifier == address(0)) revert InvalidAddress();

        Credential storage cred = _credentials[id];
        if (!cred.exists) {
            revert CredentialNotFound(id);
        }
        if (cred.holder != msg.sender) {
            revert NotCredentialHolder(id, msg.sender);
        }

        _accessPermissions[id][verifier] = true;
        emit AccessGranted(id, msg.sender, verifier);
    }

    /**
     * @notice Holder mencabut persetujuan akses yang sebelumnya diberikan kepada Verifier.
     * @dev Ini mencabut catatan izin pada mapping consent; fungsi verifikasi publik tetap publik.
     *      Bila sistem membutuhkan verifikasi privat, akses perlu diterapkan juga pada fungsi verifikasi.
     * @param id Identifier kredensial milik pemanggil.
     * @param verifier Alamat verifier yang izinnya dicabut.
     */
    function revokeAccess(
        string calldata id,
        address verifier
    ) external whenNotPaused {
        if (verifier == address(0)) revert InvalidAddress();

        Credential storage cred = _credentials[id];
        if (!cred.exists) {
            revert CredentialNotFound(id);
        }
        if (cred.holder != msg.sender) {
            revert NotCredentialHolder(id, msg.sender);
        }
        if (!_accessPermissions[id][verifier]) {
            revert AccessNotGranted(id, verifier);
        }

        _accessPermissions[id][verifier] = false;
        emit AccessRevoked(id, msg.sender, verifier);
    }

    // --- View Functions ---

    /**
     * @notice Memeriksa status persetujuan akses kredensial untuk alamat verifier tertentu.
     * @param id Identifier kredensial yang diperiksa.
     * @param verifier Alamat verifier yang ingin dicek izinnya.
     * @return True jika pemegang kredensial telah memberikan akses kepada verifier tersebut.
     */
    function hasAccess(
        string calldata id,
        address verifier
    ) external view returns (bool) {
        return _accessPermissions[id][verifier];
    }

    /**
     * @notice Memverifikasi keabsahan kredensial akademik secara publik dan transparan.
     * @dev Fungsi view murni, tidak mengonsumsi gas bila dipanggil via eth_call (RPC).
     * @param id Identifier kredensial yang diverifikasi.
     * @param docHash Hash dokumen fisik berkas yang dipegang pihak pemeriksa.
     * @return isValid True jika kredensial terdaftar, aktif, belum kedaluwarsa, dan hash cocok.
     * @return status Detail status kredensial (Valid, HashMismatch, Revoked, Expired, NotFound).
     * @return issuer Alamat institusi penerbit.
     * @return holder Alamat mahasiswa pemilik.
     * @return expiresAt Timestamp batas kedaluwarsa.
     */
    function verifyCredential(
        string calldata id,
        bytes32 docHash
    ) external view returns (
        bool isValid,
        CredentialStatus status,
        address issuer,
        address holder,
        uint256 expiresAt
    ) {
        Credential storage cred = _credentials[id];

        if (!cred.exists) {
            return (false, CredentialStatus.NotFound, address(0), address(0), 0);
        }

        issuer = cred.issuer;
        holder = cred.holder;
        expiresAt = cred.expiresAt;

        if (cred.isRevoked) {
            return (false, CredentialStatus.Revoked, issuer, holder, expiresAt);
        }

        if (cred.expiresAt != 0 && block.timestamp > cred.expiresAt) {
            return (false, CredentialStatus.Expired, issuer, holder, expiresAt);
        }

        if (cred.docHash != docHash) {
            return (false, CredentialStatus.HashMismatch, issuer, holder, expiresAt);
        }

        return (true, CredentialStatus.Valid, issuer, holder, expiresAt);
    }

    /**
     * @notice Mengambil seluruh data rekaman kredensial on-chain berdasarkan ID.
     * @param id Identifier kredensial yang dicari.
     */
    function getCredential(
        string calldata id
    ) external view returns (Credential memory) {
        Credential storage cred = _credentials[id];
        if (!cred.exists) {
            revert CredentialNotFound(id);
        }
        return cred;
    }

    /**
     * @notice Mengembalikan total jumlah kredensial yang telah diterbitkan.
     */
    function totalCredentials() external view returns (uint256) {
        return _credentialIds.length;
    }

    /**
     * @notice Mengambil ID kredensial berdasarkan indeks pendaftaran.
     * @param index Nomor indeks dalam array pendaftaran.
     */
    function getCredentialIdByIndex(uint256 index) external view returns (string memory) {
        require(index < _credentialIds.length, "Index out of bounds");
        return _credentialIds[index];
    }

    // --- Internal Helpers ---

    function _issueSingle(
        string memory id,
        address holder,
        bytes32 docHash,
        uint256 expiresAt
    ) internal {
        if (bytes(id).length == 0) revert EmptyCredentialId();
        if (holder == address(0)) revert InvalidAddress();
        if (docHash == bytes32(0)) revert EmptyDocumentHash();
        if (_credentials[id].exists) revert CredentialAlreadyExists(id);
        if (expiresAt != 0 && expiresAt <= block.timestamp) {
            revert InvalidExpirationTime(expiresAt);
        }

        _credentials[id] = Credential({
            id: id,
            issuer: msg.sender,
            holder: holder,
            docHash: docHash,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isRevoked: false,
            revokeReason: "",
            exists: true
        });

        _credentialIds.push(id);

        emit CredentialIssued(id, msg.sender, holder, docHash);
    }
}
