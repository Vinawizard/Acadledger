import { MerkleTree } from 'merkletreejs';
import CryptoJS from 'crypto-js';

/**
 * SHA-256 hash function for MerkleTree library.
 * Takes a Buffer and returns a Buffer of the SHA-256 hash.
 */
function sha256HashFn(data: Buffer): Buffer {
    const wordArray = CryptoJS.lib.WordArray.create(data as any);
    const hash = CryptoJS.SHA256(wordArray);
    return Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');
}

/**
 * Creates a Merkle Tree from an array of hex hash strings using SHA-256.
 * @param hashes - Array of hex strings (with or without '0x' prefix)
 */
export function createMerkleTree(hashes: string[]): MerkleTree {
    const leaves = hashes.map(h => Buffer.from(h.replace(/^0x/, ''), 'hex'));
    return new MerkleTree(leaves, sha256HashFn, { sortPairs: true });
}

/**
 * Gets the Merkle Root as a hex string with '0x' prefix.
 */
export function getMerkleRoot(tree: MerkleTree): string {
    return '0x' + tree.getRoot().toString('hex');
}

/**
 * Generates a Merkle Proof for a specific leaf hash.
 * @returns Array of proof hex strings with '0x' prefix
 */
export function generateMerkleProof(tree: MerkleTree, leafHash: string): string[] {
    const leaf = Buffer.from(leafHash.replace(/^0x/, ''), 'hex');
    const proof = tree.getProof(leaf);
    return proof.map(p => '0x' + p.data.toString('hex'));
}

/**
 * Verifies a Merkle Proof against a root.
 */
export function verifyMerkleProof(proof: string[], leafHash: string, rootHash: string): boolean {
    const leaf = Buffer.from(leafHash.replace(/^0x/, ''), 'hex');
    const root = Buffer.from(rootHash.replace(/^0x/, ''), 'hex');
    const proofBuffers = proof.map(p => ({
        position: 'left' as const,
        data: Buffer.from(p.replace(/^0x/, ''), 'hex')
    }));

    // Use MerkleTree's static verify
    const tree = new MerkleTree([], sha256HashFn, { sortPairs: true });
    return tree.verify(proofBuffers, leaf, root);
}
