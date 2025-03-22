import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { Noir } from "@noir-lang/noir_js";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { InputValue, ProofData } from "@noir-lang/types";
import type { ProgramCompilationArtifacts } from "@noir-lang/noir_wasm";

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
    const compilation = await this.compileCircuit(circuitName);
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
}
