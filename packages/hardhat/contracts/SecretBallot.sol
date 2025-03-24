// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ISecretBallot.sol";
import {IVerifier} from "./IVerifier.sol";

contract SecretBallot is ISecretBallot {

  uint64 public constant DRAND_QUICKNET_GENESIS_TIME = 1692803367;
  uint64 public constant DRAND_QUICKNET_PERIOD = 3;

  uint256 public proposalCounter;

  mapping(uint256 => Proposal) private proposals;
  mapping(uint256 => uint256) private voterCounts;
  mapping(uint256 => bytes32) private finalCommitmentHashes;
  mapping(uint256 => Ciphertext[]) public proposalVotes;

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
    uint64 votingStart,
    uint64 votingEnd
  ) external override onlyOwner returns (uint256) {
    require(votingStart < votingEnd, "Invalid voting period");

    proposalCounter++;
    proposals[proposalCounter] = Proposal({
      id: proposalCounter,
      drandRound: 128, // For testing only
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
    bytes32[] calldata publicInputs
  ) external override returns (bool) {
    Proposal storage proposal = proposals[proposalId];

    require(proposal.isActive, "Proposal inactive");
    require(block.timestamp >= proposal.votingStart && block.timestamp <= proposal.votingEnd, "Voting closed");

    require(voteVerifier.verify(proof, publicInputs), "Invalid vote proof");

    finalCommitmentHashes[proposalId] = publicInputs[3];
    proposalVotes[proposalId].push(vote);
    voterCounts[proposalId]++;
    emit VoteCast(proposalId, voter, vote);
    return true;
  }

  function publishTally(
    uint256 proposalId,
    bytes calldata proof, 
    bytes32[] calldata publicInputs
  ) external override returns (bool) {
    Proposal storage proposal = proposals[proposalId];
    require(proposal.isActive, "Proposal inactive");
    require(block.timestamp > proposal.votingEnd, "Voting still open");
    
    require(tallyVerifier.verify(proof, publicInputs), "Invalid vote proof");

    proposal.yesVotes = uint256(bytes32(publicInputs[0]));
    proposal.noVotes = voterCounts[proposalId] - proposal.yesVotes;
    proposal.isActive = false;

    emit TallyPublished(proposalId);
    return true;
  }
}