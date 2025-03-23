import * as path from "path";
import { ProofData } from "@noir-lang/types";
import { PlonkProofGenerator } from "./PlonkProofGenerator";

/**
 * Calculates the commitment hash using poseidon2
 * @param voterAddressStr The voter's address as a string
 * @param voteString The vote string
 * @returns The calculated commitment hash as a field element
 */
export async function calculateVoteCommitment(voterAddressStr: string, voteString: string): Promise<any> {
  const { Fr } = await import("@aztec/foundation/fields");
  const { poseidon2Hash } = await import("@aztec/foundation/crypto");

  // Convert address string to Fr
  const userAddress = new Fr(BigInt(voterAddressStr));

  // Convert string to bytes (UTF-8)
  const voteBytes = Buffer.from(voteString, "utf-8");

  // Convert bytes to field (big-endian) exactly as Noir does
  const bigIntValue = BigInt("0x" + voteBytes.toString("hex"));
  const voteField = new Fr(bigIntValue);

  // Calculate hash using poseidon2Hash
  return await poseidon2Hash([userAddress, voteField]);
}

/**
 * Calculates the updated hash using poseidon2
 * @param currentHash The current hash as a field element
 * @param commitment The commitment hash as a field element
 * @returns The calculated updated hash as a field element
 */
export async function calculateUpdatedHash(currentHash: any, commitment: any): Promise<any> {
  const { poseidon2Hash } = await import("@aztec/foundation/crypto");
  return await poseidon2Hash([currentHash, commitment]);
}

/**
 * Generates a proof for the vote verifier circuit
 * @param voterAddress The voter's address as a string
 * @param vote The vote string (should be 8 characters)
 * @param commitment The commitment hash (if not provided, it will be calculated)
 * @param currentHash The current hash (defaults to 0 if not provided)
 * @returns The generated proof data
 */
export async function generateVoteProof(
  voterAddress: string,
  vote: string,
  commitment?: string,
  currentHash: string = "0x0",
): Promise<ProofData> {
  const { Fr } = await import("@aztec/foundation/fields");
  const projectRoot = path.resolve(__dirname, "../..");

  // Calculate commitment if not provided
  const commitmentFr = commitment ? new Fr(BigInt(commitment)) : await calculateVoteCommitment(voterAddress, vote);
  const commitmentHash = commitmentFr.toString();

  // Calculate updated hash
  const currentHashFr = new Fr(BigInt(currentHash));
  const updatedHashFr = await calculateUpdatedHash(currentHashFr, commitmentFr);
  const updatedHash = updatedHashFr.toString();

  // Initialize the proof generator
  const proofGenerator = new PlonkProofGenerator();

  // Initialize the circuit
  await proofGenerator.initializeCircuit(
    "vote_verifier",
    path.join(projectRoot, "secret-ballot-circuits/circuits/vote_verifier/vk.bin"),
  );

  // Generate the proof with the new parameters
  return await proofGenerator.generateProof("vote_verifier", {
    voter_address: voterAddress,
    vote: vote,
    commitment: commitmentHash,
    curent_hash: currentHash, // update key if needed for consistency with your circuit
    updated_hash: updatedHash,
  });
}

/**
 * Generates a proof for the vote verifier circuit ( Specifically for hardhat test, as path is different when hh task runs it)
 * @param voterAddress The voter's address as a string
 * @param vote The vote string (should be 8 characters)
 * @param commitment The commitment hash (if not provided, it will be calculated)
 * @param currentHash The current hash (defaults to 0 if not provided)
 * @returns The generated proof data
 */
export async function generateVoteProofHh(
  voterAddress: string,
  vote: string,
  commitment?: string,
  currentHash: string = "0x0",
): Promise<ProofData> {
  const { Fr } = await import("@aztec/foundation/fields");
  const projectRoot = path.resolve(__dirname, "../../..");

  // Calculate commitment if not provided
  const commitmentFr = commitment ? new Fr(BigInt(commitment)) : await calculateVoteCommitment(voterAddress, vote);
  const commitmentHash = commitmentFr.toString();

  // Calculate updated hash
  const currentHashFr = new Fr(BigInt(currentHash));
  const updatedHashFr = await calculateUpdatedHash(currentHashFr, commitmentFr);
  const updatedHash = updatedHashFr.toString();

  // Initialize the proof generator
  const proofGenerator = new PlonkProofGenerator();

  // Initialize the circuit
  await proofGenerator.initializeCircuit(
    "vote_verifier",
    path.join(projectRoot, "secret-ballot-circuits/circuits/vote_verifier/vk.bin"),
  );

  // Generate the proof with the new parameters
  return await proofGenerator.generateProof("vote_verifier", {
    voter_address: voterAddress,
    vote: vote,
    commitment: commitmentHash,
    curent_hash: currentHash, // update key if needed for consistency with your circuit
    updated_hash: updatedHash,
  });
}
