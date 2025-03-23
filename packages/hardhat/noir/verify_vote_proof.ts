import { PlonkProofGenerator } from "./PlonkProofGenerator";
import { poseidon2Hash } from "@aztec/foundation/crypto";
import { Fr } from "@aztec/foundation/fields";
import * as path from "path";
import { ProofData } from "@noir-lang/types";

/**
 * Calculates the commitment hash using poseidon2
 * @param voterAddressStr The voter's address as a string
 * @param voteString The vote string
 * @returns The calculated commitment hash as a field element
 */
export async function calculateVoteCommitment(voterAddressStr: string, voteString: string): Promise<Fr> {
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
export async function calculateUpdatedHash(currentHash: Fr, commitment: Fr): Promise<Fr> {
  // Calculate hash using poseidon2Hash
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
    curent_hash: currentHash, // type but not a problem can be fixed later
    updated_hash: updatedHash,
  });
}

async function main() {
  try {
    // Define the exact values used in the Noir test
    const userAddressValue = "0x052b";
    const voteString = "01234567";
    const initialCurrentHash = "0x0"; // Initial current hash is 0

    // Convert string to bytes (UTF-8)
    const voteBytes = Buffer.from(voteString, "utf-8");
    console.log("TS vote bytes:", [...voteBytes]);

    // Convert bytes to field (big-endian) exactly as Noir does
    const bigIntValue = BigInt("0x" + voteBytes.toString("hex"));
    const voteField = new Fr(bigIntValue);
    console.log("TS vote_field:", voteField.toString());

    // Calculate commitment hash
    const commitmentFr = await calculateVoteCommitment(userAddressValue, voteString);
    console.log("TS commitment hash:", commitmentFr.toString());

    // Calculate updated hash
    const currentHashFr = new Fr(BigInt(initialCurrentHash));
    const updatedHashFr = await calculateUpdatedHash(currentHashFr, commitmentFr);
    console.log("TS updated hash:", updatedHashFr.toString());

    // Values to use in your proof generation
    console.log("\nValues for proof generation:");
    console.log("user_address:", userAddressValue);
    console.log("vote_string:", voteString);
    console.log("commitment_hash:", commitmentFr.toString());
    console.log("current_hash:", initialCurrentHash);
    console.log("updated_hash:", updatedHashFr.toString());

    // STEP 3: Update your prover.toml with these exact values
    console.log("\nFor prover.toml:");
    console.log(`voter_address = "${userAddressValue}"`);
    console.log(`vote = "${voteString}"`);
    console.log(`commitment = "${commitmentFr.toString()}"`);
    console.log(`curent_hash = "${initialCurrentHash}" # Initial current hash is 0`);
    console.log(`updated_hash = "${updatedHashFr.toString()}"`);

    // Simulate a second vote
    const secondUserAddress = "0x11d7";
    const secondVoteString = "10000000";

    // Calculate commitment for second vote
    const secondCommitmentFr = await calculateVoteCommitment(secondUserAddress, secondVoteString);
    console.log("\nSecond vote commitment:", secondCommitmentFr.toString());

    // Use the updated hash as the current hash for the second vote
    const secondCurrentHashFr = updatedHashFr;
    const secondUpdatedHashFr = await calculateUpdatedHash(secondCurrentHashFr, secondCommitmentFr);
    console.log("Second vote updated hash:", secondUpdatedHashFr.toString());

    console.log("\nFor second vote in prover.toml:");
    console.log(`voter_address = "${secondUserAddress}"`);
    console.log(`vote = "${secondVoteString}"`);
    console.log(`commitment = "${secondCommitmentFr.toString()}"`);
    console.log(`curent_hash = "${updatedHashFr.toString()}" # Previous updated hash`);
    console.log(`updated_hash = "${secondUpdatedHashFr.toString()}"`);

    console.log("\nGenerating proof...");

    // Use the extracted function with new parameters
    const proofResult = await generateVoteProof(
      userAddressValue,
      voteString,
      commitmentFr.toString(),
      initialCurrentHash,
    );

    // Convert to hex for easier use in smart contracts
    const proofGenerator = new PlonkProofGenerator();
    const hexProof = proofGenerator.uint8ArrayToHex(proofResult.proof);
    console.log("Hex proof:", hexProof);
    console.log("public_inputs:", proofResult.publicInputs.toString());
  } catch (error) {
    console.error("Error in main:", error);
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
