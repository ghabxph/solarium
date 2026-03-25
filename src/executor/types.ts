import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';

export interface SolariumExecutorConfig {
  binaryPath: string;
  artifactsDir: string;
  timeout?: number;
}

export interface ExecuteOptions {
  workspace: string;
  instructions: TransactionInstruction[];
  programs: Record<string, string>;
  signers?: Keypair[];
  airdropTo?: PublicKey[];
  downloadAfterExec?: PublicKey[];
  simulate?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}
