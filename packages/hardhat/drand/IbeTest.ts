// npx mocha --require ts-node/register --timeout 30000 drand/IbeTest.ts
import { expect } from "chai";
import { encryptOnG2RFC9380, decryptOnG2 } from "./ibe";
import { getRoundData, getChainInfo } from "./drandClient";
import { sha256 } from "@noble/hashes/sha256";
import { Buffer } from "buffer";
import { describe } from "mocha";

// Exactly matches the Drand library's function for hashing round numbers
function hashedRoundNumber(round: number): Uint8Array {
  const roundNumberBuffer = Buffer.alloc(64 / 8);
  roundNumberBuffer.writeBigUInt64BE(BigInt(round));
  return sha256(roundNumberBuffer);
}
/* // Function to serialize ciphertext exactly as in the Drand example
function serializedCiphertext(ciphertext: any): Uint8Array {
    return Buffer.concat([ciphertext.U, ciphertext.V, ciphertext.W]);
} */

describe("Drand IBE Integration Tests", () => {
  it("should encrypt and decrypt a message using encryptOnG2RFC9380", async () => {
    // Setup test parameters
    const testRound = 128;
    const message = "Hello, world!";
    const messageBytes = new TextEncoder().encode(message);

    // Get chain info to log the scheme
    const chainInfo = await getChainInfo();
    console.log("Chain info:", {
      schemeID: chainInfo.schemeID,
      hash: chainInfo.hash,
    });

    // Get the public key directly from chain info
    const publicKeyHex = chainInfo.public_key;
    const publicKeyBytes = Buffer.from(publicKeyHex, "hex");

    // Get round ID exactly as Drand does it
    const roundID = hashedRoundNumber(testRound);

    // Get the signature for this round
    const roundData = await getRoundData(testRound);
    const signatureBytes = Buffer.from(roundData.signature, "hex");

    // Encrypt with RFC9380 method (which we know works)
    const ciphertext = await encryptOnG2RFC9380(publicKeyBytes, roundID, messageBytes);

    // u always 96 v w depends on the message length total_bytes = 96 + (2 * message_length)
    console.log("Ciphertext details:", {
      U_length: ciphertext.U,
      V_length: ciphertext.V,
      W_length: ciphertext.W,
    });

    // Log ciphertext details
    console.log("Ciphertext details:", {
      U_length: ciphertext.U.length,
      V_length: ciphertext.V.length,
      W_length: ciphertext.W.length,
    });

    // Decrypt using the decryptOnG2 function (with integrity check disabled)
    const decryptedBytes = await decryptOnG2(signatureBytes, ciphertext);
    const decryptedText = new TextDecoder().decode(decryptedBytes);

    // Verify the result
    expect(decryptedText).to.be.eq(message);
  });

  it("should work with messages of different lengths", async () => {
    const testRound = 130;
    const chainInfo = await getChainInfo();
    const publicKeyBytes = Buffer.from(chainInfo.public_key, "hex");
    const roundData = await getRoundData(testRound);
    const signatureBytes = Buffer.from(roundData.signature, "hex");
    const roundID = hashedRoundNumber(testRound);

    // Test different message lengths
    const messages = ["Short", "Medium length message", "This is a longer message t"];

    for (const message of messages) {
      console.log(`Testing message: "${message}" (${message.length} chars)`);

      const messageBytes = new TextEncoder().encode(message);
      const ciphertext = await encryptOnG2RFC9380(publicKeyBytes, roundID, messageBytes);
      const decryptedBytes = await decryptOnG2(signatureBytes, ciphertext);
      const decryptedText = new TextDecoder().decode(decryptedBytes);

      expect(decryptedText).to.eq(message);
    }
  });

  it("should work with binary data", async () => {
    const testRound = 132;
    const chainInfo = await getChainInfo();
    const publicKeyBytes = Buffer.from(chainInfo.public_key, "hex");
    const roundData = await getRoundData(testRound);
    const signatureBytes = Buffer.from(roundData.signature, "hex");
    const roundID = hashedRoundNumber(testRound);

    // Create some binary data (simulating encryption of a file or key)
    const binaryData = new Uint8Array(32);
    for (let i = 0; i < binaryData.length; i++) {
      binaryData[i] = i;
    }

    // Encrypt and decrypt the binary data
    const ciphertext = await encryptOnG2RFC9380(publicKeyBytes, roundID, binaryData);
    const decrypted = await decryptOnG2(signatureBytes, ciphertext);

    // Verify binary data matches exactly
    expect(decrypted.length).to.eq(binaryData.length);

    for (let i = 0; i < binaryData.length; i++) {
      expect(decrypted[i]).to.eq(binaryData[i]);
    }
  });

  it("should handle multiple rounds correctly", async () => {
    const chainInfo = await getChainInfo();
    const publicKeyBytes = Buffer.from(chainInfo.public_key, "hex");

    // Test multiple rounds
    const rounds = [128, 129, 130];
    const message = "Testing multiple rounds";
    const messageBytes = new TextEncoder().encode(message);

    for (const round of rounds) {
      console.log(`Testing round: ${round}`);

      const roundID = hashedRoundNumber(round);
      const roundData = await getRoundData(round);
      const signatureBytes = Buffer.from(roundData.signature, "hex");

      const ciphertext = await encryptOnG2RFC9380(publicKeyBytes, roundID, messageBytes);
      const decryptedBytes = await decryptOnG2(signatureBytes, ciphertext);
      const decryptedText = new TextDecoder().decode(decryptedBytes);

      expect(decryptedText).to.eq(message);
    }
  });
  it("should encrypt and decrypt 100 random strings correctly", async () => {
    // Setup test environment once for all strings
    const testRound = 135;
    const chainInfo = await getChainInfo();
    const publicKeyBytes = Buffer.from(chainInfo.public_key, "hex");
    const roundData = await getRoundData(testRound);
    const signatureBytes = Buffer.from(roundData.signature, "hex");
    const roundID = hashedRoundNumber(testRound);

    // Helper function to generate a random string
    function generateRandomString(maxLength = 20): string {
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?/";
      const length = Math.floor(Math.random() * maxLength) + 1; // Random length between 1 and maxLength
      let result = "";

      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
      }

      return result;
    }

    // Create an array to store the strings for verification
    const strings = Array.from({ length: 100 }, () => generateRandomString());

    console.log(`Testing encryption/decryption of 100 random strings for round ${testRound}`);

    // Counter for progress reporting
    let successCount = 0;

    // Process each string
    for (let i = 0; i < strings.length; i++) {
      const originalString = strings[i];

      // Log progress every 10 strings
      if (i % 10 === 0) {
        console.log(`Processing string ${i + 1}-${Math.min(i + 10, strings.length)} of ${strings.length}...`);
      }

      try {
        // Encrypt
        const messageBytes = new TextEncoder().encode(originalString);
        const ciphertext = await encryptOnG2RFC9380(publicKeyBytes, roundID, messageBytes);

        // Decrypt
        const decryptedBytes = await decryptOnG2(signatureBytes, ciphertext);
        const decryptedString = new TextDecoder().decode(decryptedBytes);

        // Verify
        expect(decryptedString).to.eq(originalString);
        successCount++;
      } catch (error) {
        // If there's an error, report detailed information about the failing string
        console.error(`Error processing string #${i + 1}: "${originalString}" (length: ${originalString.length})`);
        console.error(error);

        // Let the test fail
        throw error;
      }
    }

    // Final verification
    console.log(`Successfully encrypted and decrypted ${successCount} of ${strings.length} strings`);
    expect(successCount).to.eq(strings.length);

    // Log some sample strings for reference
    console.log("Sample of strings processed:");
    for (let i = 0; i < 5; i++) {
      const index = Math.floor(Math.random() * strings.length);
      console.log(`- "${strings[index]}" (length: ${strings[index].length})`);
    }
  });
});
