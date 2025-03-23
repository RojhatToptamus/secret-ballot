// scripts/getAllProposalsNice.ts
import { ethers, deployments } from "hardhat";

async function main() {
  // Get the deployer's signer.
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Retrieve the deployed SecretBallot contract.
  const secretBallotDeployment = await deployments.get("SecretBallot");
  const secretBallot = await ethers.getContractAt("SecretBallot", secretBallotDeployment.address, deployer);

  // Get the total number of proposals.
  const proposalCounter = await secretBallot.proposalCounter();
  console.log("Total Proposals:", proposalCounter.toString());

  // Loop through all proposals.
  for (let i = 1; i <= proposalCounter; i++) {
    const proposal = await secretBallot.getProposal(i);
    // Assuming proposal returns a tuple with:
    // [ id, description, votingStart, votingEnd, yesVotes, noVotes, isActive ]
    const id = proposal[0].toString();
    const description = proposal[1];
    const votingStart = proposal[2];
    const votingEnd = proposal[3];
    const yesVotes = proposal[4].toString();
    const noVotes = proposal[5].toString();

    // Convert Unix timestamps to human-readable dates.
    const startDate = new Date(Number(votingStart) * 1000).toLocaleString();
    const endDate = new Date(Number(votingEnd) * 1000).toLocaleString();

    // Determine the proposal status.
    const now = Math.floor(Date.now() / 1000);
    let status = "";
    if (now < votingStart) {
      status = "Not started yet";
    } else if (now >= votingStart && now <= votingEnd) {
      status = "Open for voting";
    } else {
      status = "Voting closed";
    }

    // Print the details.
    console.log("=================================");
    console.log(`Proposal ID: ${id}`);
    console.log(`Description: ${description}`);
    console.log(`Voting Start: ${startDate}`);
    console.log(`Voting End: ${endDate}`);
    console.log(`Yes Votes: ${yesVotes}`);
    console.log(`No Votes: ${noVotes}`);
    console.log(`Status: ${status}`);
    console.log("=================================\n");
  }
}

main().catch(error => {
  console.error("Error in getAllProposalsNice script:", error);
  process.exit(1);
});
