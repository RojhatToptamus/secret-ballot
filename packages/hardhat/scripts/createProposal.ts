// scripts/createProposalWithInput.ts
import { ethers, deployments } from "hardhat";
import { input } from "@inquirer/prompts";

async function main() {
  // Prompt the user for input.
  const description = await input({ message: "Enter proposal description:", required: true });
  const startTime = await input({
    message: "Enter voting start time (Unix timestamp):",
    default: Math.floor(Date.now() / 1000).toString(),
  });
  const endTime = await input({ message: "Enter voting start time (Unix timestamp):", required: true });

  // Get the deployer's signer.
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Retrieve the deployed SecretBallot contract.
  const secretBallotDeployment = await deployments.get("SecretBallot");
  const secretBallot = await ethers.getContractAt("SecretBallot", secretBallotDeployment.address, deployer);

  // Read the current proposalCounter value.
  const initialCounter = await secretBallot.proposalCounter();
  console.log("Current proposal counter value:", initialCounter.toString());

  console.log("Creating proposal with description:", description);
  const tx = await secretBallot.createProposal(description, startTime, endTime);
  console.log("Transaction submitted:", tx.hash);

  // Wait for the transaction to be mined.
  await tx.wait();
  console.log("Proposal creation transaction mined.");

  // Read the new proposalCounter value.
  const newCounter = await secretBallot.proposalCounter();
  console.log("New proposal counter value:", newCounter.toString());

  // Retrieve the details of the newly created proposal.
  const proposal = await secretBallot.getProposal(newCounter);
  // Assuming the proposal tuple is:
  // [ id, description, votingStart, votingEnd, yesVotes, noVotes, isActive ]
  const id = proposal[0].toString();
  const propDescription = proposal[1];
  const votingStartUnix = proposal[2];
  const votingEndUnix = proposal[3];
  const yesVotes = proposal[4].toString();
  const noVotes = proposal[5].toString();
  const isActive = proposal[6];

  // Convert Unix timestamps to human-readable dates.
  const startDate = new Date(Number(votingStartUnix) * 1000).toLocaleString();
  const endDate = new Date(Number(votingEndUnix) * 1000).toLocaleString();

  // Determine the current status of the proposal.
  const now = Math.floor(Date.now() / 1000);
  let status = "";
  if (now < votingStartUnix) {
    status = "Not started yet";
  } else if (now >= votingStartUnix && now <= votingEndUnix) {
    status = "Open for voting";
  } else {
    status = "Voting closed";
  }

  // Print the details in a nice format.
  console.log("====================================");
  console.log(`Proposal ID:        ${id}`);
  console.log(`Description:        ${propDescription}`);
  console.log(`Voting Start:       ${startDate}`);
  console.log(`Voting End:         ${endDate}`);
  console.log(`Yes Votes:          ${yesVotes}`);
  console.log(`No Votes:           ${noVotes}`);
  console.log(`Active:             ${isActive}`);
  console.log(`Status:             ${status}`);
  console.log("====================================");
}

main().catch(error => {
  console.error("Error in createProposalWithInput script:", error);
  process.exit(1);
});
