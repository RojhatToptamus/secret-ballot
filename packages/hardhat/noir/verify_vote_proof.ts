// npx tsx packages/hardhat/noir/verify_vote_proof.ts
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
 * Generates a proof for the vote verifier circuit
 * @param voterAddress The voter's address as a string
 * @param vote The vote string (should be 8 characters)
 * @param commitment The commitment hash (if not provided, it will be calculated)
 * @returns The generated proof data
 */
export async function generateVoteProof(voterAddress: string, vote: string, commitment?: string): Promise<ProofData> {
  const projectRoot = path.resolve(__dirname, "../..");

  // Calculate commitment if not provided
  const commitmentHash = commitment || (await calculateVoteCommitment(voterAddress, vote)).toString();

  // Initialize the proof generator
  const proofGenerator = new PlonkProofGenerator();

  // Initialize the circuit
  await proofGenerator.initializeCircuit(
    "vote_verifier",
    path.join(projectRoot, "secret-ballot-circuits/circuits/vote_verifier/vk.bin"),
  );

  // Generate the proof
  return await proofGenerator.generateProof("vote_verifier", {
    voter_address: voterAddress,
    vote: vote,
    commitment: commitmentHash,
  });
}

async function main() {
  try {
    // Define the exact values used in the Noir test
    const userAddressValue = "0x052b";
    const voteString = "01234567";

    // Convert string to bytes (UTF-8)
    const voteBytes = Buffer.from(voteString, "utf-8");
    console.log("TS vote bytes:", [...voteBytes]);

    // Convert bytes to field (big-endian) exactly as Noir does
    const bigIntValue = BigInt("0x" + voteBytes.toString("hex"));
    const voteField = new Fr(bigIntValue);
    console.log("TS vote_field:", voteField.toString());

    // Calculate hash using our function
    const hash = await calculateVoteCommitment(userAddressValue, voteString);
    console.log("TS final hash:", hash.toString());

    // Values to use in your proof generation
    console.log("\nValues for proof generation:");
    console.log("user_address:", userAddressValue);
    console.log("vote_string:", voteString);
    console.log("commitment_hash:", hash.toString());

    // STEP 3: Update your prover.toml with these exact values
    console.log("\nFor prover.toml:");
    console.log(`voter_address = "${userAddressValue}"`);
    console.log(`vote = "${voteString}"`);
    console.log(`commitment = "${hash.toString()}"`);

    console.log("\nGenerating proof...");

    // Use the extracted function
    const proofResult = await generateVoteProof(userAddressValue, voteString, hash.toString());
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
