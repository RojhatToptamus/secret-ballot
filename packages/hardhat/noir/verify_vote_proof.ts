// npx tsx packages/hardhat/noir/verify_proof.ts
import { PlonkProofGenerator } from "./PlonkProofGenerator";
import { poseidon2Hash } from "@aztec/foundation/crypto";
import { Fr } from "@aztec/foundation/fields";
import * as path from "path";
async function main() {
  try {
    // Test 1: Hash a single value
    // Define the exact values used in the Noir test
    const userAddress = new Fr(1323);
    const voteString = "01123423";

    // Convert string to bytes (UTF-8)
    const voteBytes = Buffer.from(voteString, "utf-8");
    console.log("TS vote bytes:", [...voteBytes]);

    // Convert bytes to field (big-endian) exactly as Noir does
    const bigIntValue = BigInt("0x" + voteBytes.toString("hex"));
    const voteField = new Fr(bigIntValue);
    console.log("TS vote_field:", voteField.toString());

    // Calculate hash using poseidon2Hash (which was found to match Noir's calculation)
    const hash = await poseidon2Hash([userAddress, voteField]);
    console.log("TS final hash:", hash.toString());

    // Values to use in your proof generation
    console.log("\nValues for proof generation:");
    console.log("user_address:", userAddress.toString());
    console.log("vote_string:", voteString);
    console.log("commitment_hash:", hash.toString());
    const projectRoot = path.resolve(__dirname, "../..");

    const proofGenerator = new PlonkProofGenerator();
    // initialize the circuits
    await proofGenerator.initializeCircuit(
      "vote_verifier",
      path.join(projectRoot, "secret-ballot-circuits/circuits/vote_verifier/vk.bin"),
    );
    // Generate the proof
    const proof = await proofGenerator.generateProof("vote_verifier", {
      voter_address: userAddress.toString(),
      vote: voteString,
      commitment: hash.toString(),
    });
    console.log("Proof generated:", proof);
  } catch (error) {
    console.log("Error in main:", error);
    console.log(`Error: ${error}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
