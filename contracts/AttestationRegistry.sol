// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AttestationRegistry
 * @dev A contract to store and verify document hashes and Merkle roots (batch attestations).
 */
contract AttestationRegistry {
    address public owner;
    mapping(address => bool) public authorizedIssuers;
    
    // Struct to store attestation metadata
    struct AttestationRecord {
        address issuer;
        uint256 timestamp;
        bool exists;
    }

    // Mapping for both single hashes and Merkle roots
    mapping(bytes32 => AttestationRecord) public attestations;

    // Events
    event AttestationStored(bytes32 indexed hash, address indexed issuer, uint256 timestamp);
    event BatchAttestationStored(bytes32 indexed merkleRoot, address indexed issuer, uint256 timestamp);
    event AttestationRevoked(bytes32 indexed hash, address indexed issuer);
    event IssuerAuthorized(address indexed issuer);
    event IssuerDeauthorized(address indexed issuer);

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedIssuers[msg.sender], "Not an authorized issuer");
        _;
    }

    function authorizeIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    function deauthorizeIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerDeauthorized(issuer);
    }

    /**
     * @dev Stores an attestation for a single given hash.
     * @param hash The Keccak256 hash of the document.
     */
    function registerSingle(bytes32 hash) public onlyAuthorized {
        require(!attestations[hash].exists, "Attestation already exists");
        attestations[hash] = AttestationRecord({
            issuer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        emit AttestationStored(hash, msg.sender, block.timestamp);
    }

    /**
     * @dev Stores an attestation for a batch of documents using a Merkle Root.
     * @param merkleRoot The Keccak256 Merkle root of the document hashes.
     */
    function registerBatch(bytes32 merkleRoot) public onlyAuthorized {
        require(!attestations[merkleRoot].exists, "Batch attestation already exists");
        attestations[merkleRoot] = AttestationRecord({
            issuer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        emit BatchAttestationStored(merkleRoot, msg.sender, block.timestamp);
    }

    /**
     * @dev Verifies if an attestation (single or batch) exists.
     * @param hashOrRoot The Keccak256 hash or Merkle root.
     * @return bool True if it exists, false otherwise.
     */
    function verify(bytes32 hashOrRoot) public view returns (bool) {
        return attestations[hashOrRoot].exists;
    }

    /**
     * @dev Gets the details of an attestation.
     * @param hashOrRoot The Keccak256 hash or Merkle root.
     */
    function getAttestation(bytes32 hashOrRoot) public view returns (address, uint256) {
        require(attestations[hashOrRoot].exists, "Attestation not found");
        return (attestations[hashOrRoot].issuer, attestations[hashOrRoot].timestamp);
    }

    /**
     * @dev Revokes an attestation (only by the original issuer or owner).
     * @param hashOrRoot The Keccak256 hash or Merkle root to revoke.
     */
    function revoke(bytes32 hashOrRoot) public {
        require(attestations[hashOrRoot].exists, "Attestation does not exist");
        require(attestations[hashOrRoot].issuer == msg.sender || msg.sender == owner, "Only the issuer or owner can revoke");
        
        delete attestations[hashOrRoot];
        emit AttestationRevoked(hashOrRoot, msg.sender);
    }
}
