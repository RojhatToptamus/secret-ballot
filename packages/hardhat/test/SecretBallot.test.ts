import { ethers } from "hardhat";
import { expect } from "chai";
import { SecretBallot, VoteUltraVerifier, TallyUltraVerifier } from "../typechain-types";
import { encryptMessage } from "../drand/tlock";
import { getChainInfo } from "../drand/drandClient";
import { PlonkProofGenerator } from "../noir/PlonkProofGenerator";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { calculateVoteCommitment } from "../noir/helpers";

describe("SecretBallot", function () {
  let secretBallot: SecretBallot;
  let voteUltraVerifier: VoteUltraVerifier;
  let tallyUltraVerifier: TallyUltraVerifier;
  let deployer: HardhatEthersSigner;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

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

    const proposalRoundNumber = proposal.drandRound;
    const chainInfo = await getChainInfo();

    // let current_commitments_hash = await secretBallot.getFinalCommitmentHash(proposal.id);

    // Voting with default user or Dployer
    const unencrypted_vote = "01234567";
    const encrypted_vote = await encryptMessage(unencrypted_vote, Number(proposalRoundNumber), chainInfo.public_key);
    console.log({ encrypted_vote });
    const encrypted_vote_for_contract = {
      U: PlonkProofGenerator.uint8ArrayToHex(encrypted_vote.U),
      V: PlonkProofGenerator.uint8ArrayToHex(encrypted_vote.V),
      W: PlonkProofGenerator.uint8ArrayToHex(encrypted_vote.W),
    };
    console.log({ encrypted_vote_for_contract });
    const voter_vote_commitemt_FR = await calculateVoteCommitment(deployer.address, unencrypted_vote);
    const voter_vote_commitemt_hash = voter_vote_commitemt_FR.toString();
    console.log({ voter_vote_commitemt_hash });
    // let vote_proof = generateVoteProof(deployer.address, unencrypted_vote, voter_vote_commitemt_hash, current_commitments_hash)
    // console.log({vote_proof})
  });
});
