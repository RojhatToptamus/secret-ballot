pragma solidity >=0.8.0 <0.9.0;

contract VoteCipher {
    struct Ciphertext {
        // U is 96 bytes split across three 32-byte words
        bytes32[3] U;
        // V and W are fixed 16-byte values
        bytes16 V;
        bytes16 W;
    }

    mapping(uint256 => Ciphertext) public ciphers;
    
    // Additional functions to work with Ciphertext...
}