// npx tsx packages/hardhat/noir/verify_tally_proof.ts
import { PlonkProofGenerator } from "./PlonkProofGenerator";
import { generateTallyProof } from "./helpers";

async function main() {
  try {
    console.log("Initializing tally verifier circuit...");

    // Inputs from prover.toml
    const finalCommitment = "0x1e52f09006282565c0c70e93e6eac935a164999a98121e0079ac581d7dbb4def";
    const yesVotes = "1";

    // Only including the actual addresses, not the placeholders
    const userAddresses = ["0x7b", "0x01c8", "0x0315", "0x018af8"];

    // Only including the actual votes, not the placeholders
    const plainVotes = ["10123456", "00123456", "05123456", "01123456"];

    console.log("Generating proof for tally verifier...");

    // Use the extracted function
    const proofResult = await generateTallyProof(finalCommitment, yesVotes, userAddresses, plainVotes);

    console.log("Proof generated successfully!");

    // Convert to hex for easier use in smart contracts
    // const proofGenerator = new PlonkProofGenerator();
    const hexProof = PlonkProofGenerator.uint8ArrayToHex(proofResult.proof);
    console.log("Hex proof:", hexProof);
    console.log("Inputs: ", proofResult.publicInputs);
    process.exit(1);
  } catch (error) {
    console.error("Error in main:", error);
    console.error(`Error details: ${error}`);
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
