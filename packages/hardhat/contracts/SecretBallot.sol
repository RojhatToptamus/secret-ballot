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
    uint64 votingStart,
    uint64 votingEnd
  ) external override onlyOwner returns (uint256) {
    require(votingStart < votingEnd, "Invalid voting period");

    proposalCounter++;
    proposals[proposalCounter] = Proposal({
      id: proposalCounter,
      drandRound: timestamp_to_round(votingEnd),
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
    bytes32 vote_commitment,
    bytes32 final_votes_commitment
  ) external override returns (bool) {
    Proposal storage proposal = proposals[proposalId];

    require(proposal.isActive, "Proposal inactive");
    require(block.timestamp >= proposal.votingStart && block.timestamp <= proposal.votingEnd, "Voting closed");

    bytes32[] memory publicInputs = new bytes32[](4);
    publicInputs[0] = bytes32(uint256(uint160(voter)));
    publicInputs[1] = vote_commitment;
    publicInputs[2] = finalCommitmentHashes[proposalId];
    publicInputs[3] = final_votes_commitment;

    require(voteVerifier.verify(proof, publicInputs), "Invalid vote proof");

    finalCommitmentHashes[proposalId] = final_votes_commitment;
    proposalVotes[proposalId].push(vote);
    voterCounts[proposalId]++;
    emit VoteCast(proposalId, voter, vote);
    return true;
  }

  function publishTally(
    uint256 proposalId,
    bytes calldata proof, 
    bytes32 final_commitment,
    uint32 total_yes
  ) external override returns (bool) {
    Proposal storage proposal = proposals[proposalId];
    require(proposal.isActive, "Proposal inactive");
    require(block.timestamp > proposal.votingEnd, "Voting still open");

    bytes32[] memory publicInputs = new bytes32[](2);
    publicInputs[0] = bytes32(uint256(uint160(total_yes)));
    publicInputs[1] = final_commitment;
    
    require(tallyVerifier.verify(proof, publicInputs), "Invalid vote proof");

    proposal.yesVotes = total_yes;
    proposal.noVotes = voterCounts[proposalId] - proposal.yesVotes;
    proposal.isActive = false;

    emit TallyPublished(proposalId);
    return true;
  }

   function timestamp_to_round(uint64 timestamp) public override pure returns (uint64) {
        if (timestamp < DRAND_QUICKNET_GENESIS_TIME) {
            return 0;
        }

        uint64 elapsed_time = timestamp - DRAND_QUICKNET_GENESIS_TIME;
        return (elapsed_time / DRAND_QUICKNET_PERIOD) + 1;
    }
}