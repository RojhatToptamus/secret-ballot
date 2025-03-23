// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISecretBallot {
  struct Proposal {
    uint256 id;
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

  function createProposal(string calldata description, uint256 votingStart, uint256 votingEnd) external returns (uint256);
   
  function getProposal(uint256 proposalId) external view returns (Proposal memory);
   
  function getVoterCount(uint256 proposalId) external view returns (uint256);
   
  function getFinalCommitmentHash(uint256 proposalId) external view returns (bytes32);
   
  function castVote(
    uint256 proposalId, 
    address voter, 
    Ciphertext calldata vote, 
    bytes calldata proof,
    bytes32 new_commitment
  ) external returns (bool);

  function publishTally(
    uint256 proposalId, 
    bytes calldata fullProofWithHints,
    bytes32 final_commitment,
    uint32 total_yes
  ) external returns (bool);
   
  function getProposalId(
    bytes32 descriptionHash,
    uint256 round
  ) external pure returns (uint256);
}