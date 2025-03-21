import { encryptOnG2RFC9380, decryptOnG2, Ciphertext } from "./ibe";
import { sha256 } from "@noble/hashes/sha256";
import { hexToBytes } from "@noble/hashes/utils";
import { Buffer } from "buffer";

/**
 * Encrypt data for a specific round using the Drand timelock encryption scheme.
 *
 * @param data - The data to encrypt (string or Uint8Array)
 * @param round - The target round number
 * @param publicKey - The Drand public key (hex string or raw bytes)
 * @returns A ciphertext object containing the encrypted data
 */
export async function encryptMessage(
  data: string | Uint8Array,
  round: number,
  publicKey: string | Uint8Array,
): Promise<Ciphertext> {
  // Convert data to Uint8Array if it's a string
  const dataBytes = typeof data === "string" ? new TextEncoder().encode(data) : data;

  // Convert public key to bytes if it's a hex string
  const publicKeyBytes = typeof publicKey === "string" ? hexToBytes(publicKey) : publicKey;

  // Hash the round number to get the ID (exactly as Drand does)
  const roundID = hashRound(round);

  // Use the RFC9380 method which is compatible with Drand
  return encryptOnG2RFC9380(publicKeyBytes, roundID, dataBytes);
}

/**
 * Decrypt data that was encrypted with the Drand timelock encryption scheme.
 *
 * @param ciphertext - The encrypted data
 * @param signature - The Drand signature for the target round (hex string or raw bytes)
 * @returns The decrypted data as a Uint8Array
 */
export async function decryptMessage(ciphertext: Ciphertext, signature: string | Uint8Array): Promise<Uint8Array> {
  // Convert signature to bytes if it's a hex string
  const signatureBytes = typeof signature === "string" ? hexToBytes(signature) : signature;

  // Use the appropriate decrypt function (with integrity check disabled)
  return decryptOnG2(signatureBytes, ciphertext);
}

/**
 * Decrypt data and convert the result to a string.
 *
 * @param ciphertext - The encrypted data
 * @param signature - The Drand signature for the target round (hex string or raw bytes)
 * @returns The decrypted data as a string
 */
export async function decryptToString(ciphertext: Ciphertext, signature: string | Uint8Array): Promise<string> {
  const decryptedBytes = await decryptMessage(ciphertext, signature);
  return new TextDecoder().decode(decryptedBytes);
}

/**
 * Serialize a ciphertext to bytes (for storage or transmission).
 *
 * @param ciphertext - The ciphertext to serialize
 * @returns A byte array containing the serialized ciphertext
 */
export function serializeCiphertext(ciphertext: Ciphertext): Uint8Array {
  return Buffer.concat([ciphertext.U, ciphertext.V, ciphertext.W]);
}

/**
 * Deserialize a ciphertext from bytes.
 *
 * @param data - The serialized ciphertext
 * @param vLength - Length of the V component (optional, detected automatically if not provided)
 * @param wLength - Length of the W component (optional, same as V length if not provided)
 * @returns The deserialized ciphertext object
 */
export function deserializeCiphertext(data: Uint8Array, vLength?: number, wLength?: number): Ciphertext {
  // U is always 96 bytes in G2
  const U = data.slice(0, 96);

  // If V and W lengths are not provided, try to determine them
  if (vLength === undefined) {
    // If total data length is odd after U, we can't split it evenly
    if ((data.length - 96) % 2 !== 0) {
      throw new Error("Cannot automatically determine V and W lengths from odd-length data");
    }
    vLength = (data.length - 96) / 2;
  }

  if (wLength === undefined) {
    wLength = vLength;
  }

  // Extract V and W based on their lengths
  const V = data.slice(96, 96 + vLength);
  const W = data.slice(96 + vLength, 96 + vLength + wLength);

  return { U, V, W };
}

/**
 * Hash a round number exactly as Drand does.
 *
 * @param round - The round number to hash
 * @returns The SHA-256 hash of the round number
 */
export function hashRound(round: number): Uint8Array {
  const roundNumberBuffer = Buffer.alloc(64 / 8);
  roundNumberBuffer.writeBigUInt64BE(BigInt(round));
  return sha256(roundNumberBuffer);
}
