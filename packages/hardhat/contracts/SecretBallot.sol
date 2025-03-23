// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ISecretBallot.sol";
import {IVerifier} from  "./IVerifier.sol";

contract SecretBallot is ISecretBallot {
  uint256 public proposalCounter;

  mapping(uint256 => Proposal) private proposals;
  mapping(uint256 => uint256) private voterCounts;
  mapping(uint256 => bytes32) private finalCommitmentHashes;
  mapping(uint256 => Ciphertext[]) private proposalVotes;

  address public owner;
  IVerifier public voteVerifier;
  IVerifier public tallyVerifier;

  event ProposalCreated(uint256 proposalId, string description);
  event VoteCast(uint256 proposalId, address voter, Ciphertext vote);
  event TallyPublished(uint256 proposalId);

  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner allowed");
    _;
  }

  constructor(IVerifier _voteVerifier, IVerifier _tallyVerifier) {
    owner = msg.sender;
    voteVerifier = _voteVerifier;
    tallyVerifier = _tallyVerifier;
  }

  function createProposal(
    string calldata description,
    uint256 votingStart,
    uint256 votingEnd
  ) external override onlyOwner returns (uint256) {
    require(votingStart < votingEnd, "Invalid voting period");

    proposalCounter++;
    proposals[proposalCounter] = Proposal({
      id: proposalCounter,
      description: description,
      votingStart: votingStart,
      votingEnd: votingEnd,
      yesVotes: 0,
      noVotes: 0,
      isActive: true
    });

    emit ProposalCreated(proposalCounter, description);
    return proposalCounter;
  }

  function updateAdmin(address newOwner) external onlyOwner {
    owner = newOwner;
  }

  function getProposal(uint256 proposalId) external view override returns (Proposal memory) {
    return proposals[proposalId];
  }

  function getVoterCount(uint256 proposalId) external view override returns (uint256) {
    return voterCounts[proposalId];
  }

  function getFinalCommitmentHash(uint256 proposalId) external view override returns (bytes32) {
    return finalCommitmentHashes[proposalId];
  }

  function castVote(
    uint256 proposalId,
    address voter,
    Ciphertext calldata vote,
    bytes calldata proof,
    bytes32 new_commitment
  ) external override returns (bool) {
    Proposal storage proposal = proposals[proposalId];

    require(proposal.isActive, "Proposal inactive");
    require(block.timestamp >= proposal.votingStart && block.timestamp <= proposal.votingEnd, "Voting closed");

    bytes32[] memory publicInputs = new bytes32[](2);
    publicInputs[0] = keccak256(abi.encodePacked(voter));
    publicInputs[0] = new_commitment;

    require(voteVerifier.verify(proof, publicInputs), "Invalid vote proof");

    proposalVotes[proposalId].push(vote);
    voterCounts[proposalId]++;
    emit VoteCast(proposalId, voter, vote);
    return true;
  }

  function publishTally(
    uint256 proposalId,
    bytes calldata fullProofWithHints
  ) external override onlyOwner returns (bool) {
    Proposal storage proposal = proposals[proposalId];
    require(proposal.isActive, "Proposal inactive");
    require(block.timestamp > proposal.votingEnd, "Voting still open");

    // TODO: Verify zero-knowledge proof and tally votes securely

    // Simulated tally for example purposes
    proposal.yesVotes = voterCounts[proposalId] / 2;
    proposal.noVotes = voterCounts[proposalId] - proposal.yesVotes;

    proposal.isActive = false;

    emit TallyPublished(proposalId);

    return true;
  }

  function getProposalId(
    bytes32 descriptionHash,
    uint256 round
  ) external pure override returns (uint256) {
    return uint256(keccak256(abi.encodePacked(descriptionHash, round)));
  }
}