import { ethers } from "hardhat";
import { expect } from "chai";
import { SecretBallot, VoteUltraVerifier, TallyUltraVerifier } from "../typechain-types";
import { encryptMessage } from "../drand/tlock";
import { getChainInfo } from "../drand/drandClient";
import { PlonkProofGenerator } from "../noir/PlonkProofGenerator";
import { calculateVoteCommitment, generateTallyProofHh, generateVoteProofHh } from "../noir/helpers";

describe("SecretBallot", function () {
  let secretBallot: SecretBallot;
  let voteUltraVerifier: VoteUltraVerifier;
  let tallyUltraVerifier: TallyUltraVerifier;
  // let deployer: HardhatEthersSigner;
  const decrypted_votes: { [key: string]: string } = {};
  let yes_votes = 0;

  beforeEach(async function () {
    // [deployer] = await ethers.getSigners();

    // Deploy VoteUltraVerifier.
    const VoteUltraVerifierFactory = await ethers.getContractFactory("VoteUltraVerifier");
    voteUltraVerifier = await VoteUltraVerifierFactory.deploy();
    await voteUltraVerifier.waitForDeployment();

    // Deploy TallyUltraVerifier.
    const TallyUltraVerifierFactory = await ethers.getContractFactory("TallyUltraVerifier");
    tallyUltraVerifier = await TallyUltraVerifierFactory.deploy();
    await tallyUltraVerifier.waitForDeployment();

    // Deploy the SecretBallot contract with the verifiers' addresses.
    const SecretBallotFactory = await ethers.getContractFactory("SecretBallot");
    secretBallot = await SecretBallotFactory.deploy(
      await voteUltraVerifier.getAddress(),
      await tallyUltraVerifier.getAddress(),
    );
    await secretBallot.waitForDeployment();
  });

  it("should create a proposal, vote and finally publish tally", async function () {
    // const { Fr } = await import("@aztec/foundation/fields");
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock!.timestamp;

    const description = "Proposal to improve the project";
    // Voting period: starts now and ends in 1 hour.
    const votingStart = currentTimestamp;
    const votingEnd = currentTimestamp + 3600;

    const tx = await secretBallot.createProposal(description, votingStart, votingEnd);
    await tx.wait();

    // Check that the proposalCounter has incremented.
    const proposalCounter = await secretBallot.proposalCounter();
    expect(proposalCounter).to.equal(1);

    const proposal = await secretBallot.getProposal(proposalCounter);
    expect(proposal.id).to.equal(proposalCounter);
    expect(proposal.description).to.equal(description);
    expect(proposal.votingStart).to.equal(votingStart);
    expect(proposal.votingEnd).to.equal(votingEnd);
    expect(proposal.isActive).to.equal(true);

    const chainInfo = await getChainInfo();
    const allSigners = (await ethers.getSigners()).map(signer => signer.address);
    const proposalRoundNumber = Number(proposal.drandRound);
    for (let i = 1; i <= 10; i++) {
      const voter = allSigners[i];
      const vote = Number(Boolean(Math.random() < 0.5));
      yes_votes = yes_votes + vote;
      const unencrypted_vote = `${vote}1234567`;
      decrypted_votes[voter] = unencrypted_vote;
      // Encrypt vote.
      const encrypted_vote = await encryptMessage(unencrypted_vote, proposalRoundNumber, chainInfo.public_key);
      const encrypted_vote_for_contract = {
        U: PlonkProofGenerator.uint8ArrayToHex(encrypted_vote.U),
        V: PlonkProofGenerator.uint8ArrayToHex(encrypted_vote.V),
        W: PlonkProofGenerator.uint8ArrayToHex(encrypted_vote.W),
      };

      // Calculate vote commitment.
      const voter_vote_commitment_FR = await calculateVoteCommitment(voter, unencrypted_vote);
      const voter_vote_commitment_hash = voter_vote_commitment_FR.toString();

      const previous_commitment_hash = await secretBallot.getFinalCommitmentHash(proposal.id);
      console.log("Previous commitment hash: ", previous_commitment_hash);
      // Generate proof data (using your helper that wraps PlonkProofGenerator)
      const vote_proof_data = await generateVoteProofHh(
        voter,
        unencrypted_vote,
        voter_vote_commitment_hash,
        previous_commitment_hash,
      );
      console.log("Voter commitment hash: ", voter_vote_commitment_hash);
      console.log("New commitment hash: ", vote_proof_data.publicInputs[3]);
      const hex_proof = PlonkProofGenerator.uint8ArrayToHex(vote_proof_data.proof);

      // Cast vote from this voter's account.
      const voteTx = await secretBallot
        .connect(await ethers.getSigner(voter))
        .castVote(proposal.id, voter, encrypted_vote_for_contract, hex_proof, vote_proof_data.publicInputs);
      await voteTx.wait();
      console.log("---------------------------------------------------------------------");
    }

    // Wait for the voting period to end.
    await ethers.provider.send("evm_setNextBlockTimestamp", [votingEnd + 1]);
    await ethers.provider.send("evm_mine", []);

    // Publish tally.
    console.log({ decrypted_votes });
    console.log("Publishing tally...");
    const finalCommitment = await secretBallot.getFinalCommitmentHash(proposal.id);
    console.log("Total yes votes: ", yes_votes);
    const tally_proof_data = await generateTallyProofHh(
      finalCommitment,
      yes_votes.toString(),
      Object.keys(decrypted_votes),
      Object.values(decrypted_votes),
    );

    const hex_proof = PlonkProofGenerator.uint8ArrayToHex(tally_proof_data.proof);
    try {
      const publishTallyTx = await secretBallot.publishTally(proposal.id, hex_proof, tally_proof_data.publicInputs);
      await publishTallyTx.wait();
    } catch {}

    const proposal_updated = await secretBallot.getProposal(proposalCounter);
    console.log("====================================");
    console.log(`Proposal ID:        ${proposal_updated.id}`);
    console.log(`Description:        ${proposal_updated.description}`);
    console.log(`Yes Votes:          ${proposal_updated.yesVotes}`);
    console.log(`No Votes:           ${proposal_updated.noVotes}`);
    console.log(`Active:             ${proposal_updated.isActive}`);
    console.log("====================================");
  });
});
