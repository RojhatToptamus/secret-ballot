import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { Noir } from "@noir-lang/noir_js";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { InputValue, ProofData } from "@noir-lang/types";
import type { ProgramCompilationArtifacts } from "@noir-lang/noir_wasm";
import path from "path";

interface CircuitConfig {
  noirInstance: Noir;
  backend?: UltraPlonkBackend;
  vkPath: string;
}
export class PlonkProofGenerator {
  private circuits: Map<string, CircuitConfig> = new Map();
  private async compileCircuit(projectPath: string): Promise<ProgramCompilationArtifacts> {
    const fm = createFileManager(projectPath);
    return compile(fm);
  }

  private async verifyProof(proofObject: ProofData, circuitName: string): Promise<boolean> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      console.log(`Circuit '${circuitName}' not initialized`);
      throw new Error(`Circuit '${circuitName}' not initialized`);
    }
    if (!circuit.backend) {
      throw new Error(`Backend or vkPath not set for circuit '${circuitName}'`);
    }
    const isValid = await circuit.backend.verifyProof(proofObject);
    if (!isValid) {
      console.log("Proof is invalid");
      throw new Error("Proof is invalid");
    }
    console.log("Proof successfully verified");
    return isValid;
  }

  async initializeCircuit(circuitName: string, vkPath: string): Promise<void> {
    const projectPath = path.dirname(vkPath);
    console.log(`Resolving circuit at: ${projectPath}`);

    const compilation = await this.compileCircuit(projectPath);
    const { Noir } = await import("@noir-lang/noir_js");
    const noirInstance = new Noir(compilation.program);
    const backend = new UltraPlonkBackend(compilation.program.bytecode);

    this.circuits.set(circuitName, {
      noirInstance,
      backend,
      vkPath,
    });
    console.log(`Circuit '${circuitName}' initialized with backend and verification key.`);
  }

  async generateProof(circuitName: string, inputs: Record<string, InputValue>): Promise<ProofData> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      throw new Error(`Circuit '${circuitName}' not initialized`);
    }
    const executionResult = await circuit.noirInstance.execute(inputs);

    console.log(`Generating proof for circuit '${circuitName}'...`);
    const proofObject: ProofData = await circuit.backend!.generateProof(executionResult.witness);
    console.log(`Proof successfully generated for circuit '${circuitName}'`);
    // Verify the generated proof and extract the call data.
    const isVerified = await this.verifyProof(proofObject, circuitName);

    if (!isVerified) {
      throw new Error("Proof is invalid");
    }
    console.log(proofObject);
    return proofObject;
  }

  public static uint8ArrayToHex(buffer: Uint8Array): string {
    const hex: string[] = [];

    buffer.forEach(function (i) {
      let h = i.toString(16);
      if (h.length % 2) {
        h = "0" + h;
      }
      hex.push(h);
    });

    return "0x" + hex.join("");
  }

  public static hexToUint8Array(hex: string): Uint8Array {
    const sanitisedHex = BigInt(hex).toString(16).padStart(64, "0");

    const len = sanitisedHex.length / 2;
    const u8 = new Uint8Array(len);

    let i = 0;
    let j = 0;
    while (i < len) {
      u8[i] = parseInt(sanitisedHex.slice(j, j + 2), 16);
      i += 1;
      j += 2;
    }

    return u8;
  }
}
