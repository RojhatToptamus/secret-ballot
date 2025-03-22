interface RoundData {
  round: number;
  randomness: string;
  signature: string;
}

/**
 * Interface representing the Drand chain information
 */
interface ChainInfo {
  public_key: string;
  period: number;
  genesis_time: number;
  hash: string;
  groupHash: string;
  schemeID: string;
  metadata: {
    beaconID: string;
    [key: string]: any; // Allow for additional metadata properties
  };
}

const CHAIN_HASH = "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971";
const MAINNET_CHAIN_URL = `https://api.drand.sh/${CHAIN_HASH}`;

/**
 * Fetches round data for a specific round number or the latest round using direct API calls.
 * @param {number} [round] - Optional round number to fetch data for. If not provided, fetches the latest round.
 * @returns {Promise<RoundData>} - The round data including randomness and signature.
 * @throws {Error} - If there's an issue fetching the round data.
 */
export async function getRoundData(round?: number): Promise<RoundData> {
  try {
    // Determine which endpoint to use based on whether a round is specified
    const endpoint = round ? `${MAINNET_CHAIN_URL}/public/${round}` : `${MAINNET_CHAIN_URL}/public/latest`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Create a consistent RoundData structure from the response
    return {
      round: data.round,
      randomness: data.randomness,
      signature: data.signature,
    };
  } catch (error) {
    const roundInfo = round ? `round ${round}` : "latest round";
    console.error(`Error fetching drand ${roundInfo} data:`, error);
    throw new Error(`Failed to fetch drand ${roundInfo}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets chain information from Drand API
 * @returns {Promise<ChainInfo>} - The chain info including public key and other metadata
 * @throws {Error} - If there's an issue fetching the chain info
 */
export async function getChainInfo(): Promise<ChainInfo> {
  try {
    const response = await fetch(`${MAINNET_CHAIN_URL}/info`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chain info:", error);
    throw new Error(`Failed to fetch chain info: ${error instanceof Error ? error.message : String(error)}`);
  }
}
