// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerifier {
  function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool);
}