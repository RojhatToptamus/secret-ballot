// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISecretBallot {
  struct Proposal {
    uint256 id;
    uint64 drandRound;
    string description;
    uint256 votingStart;
    uint256 votingEnd;
    uint256 yesVotes;
    uint256 noVotes;
    bool isActive;
  }

  struct Ciphertext {
    bytes U;
    bytes V;
    bytes W;
  }

  function createProposal(string calldata description, uint64 votingStart, uint64 votingEnd) external returns (uint256);
   
  function getProposal(uint256 proposalId) external view returns (Proposal memory);
   
  function getVoterCount(uint256 proposalId) external view returns (uint256);
   
  function getFinalCommitmentHash(uint256 proposalId) external view returns (bytes32);

  function timestamp_to_round(uint64 timestamp) external view returns (uint64);
   
  function castVote(
    uint256 proposalId, 
    address voter, 
    Ciphertext calldata vote, 
    bytes calldata proof,
    bytes32 new_commitment,
    bytes32 final_votes_commitment
  ) external returns (bool);

  function publishTally(
    uint256 proposalId, 
    bytes calldata fullProofWithHints,
    bytes32 final_commitment,
    uint32 total_yes
  ) external returns (bool);
}