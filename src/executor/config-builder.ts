import * as fs from 'fs';
import * as path from 'path';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { AUTO_LOADED_PROGRAMS } from '../constants';

export interface BridgeConfig {
  instructions: Array<{
    programId: string;
    accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
    data: string;
  }>;
  accountPaths: Record<string, string>;
  programs: Record<string, string>;
  simulate: boolean;
  airdropTo?: string[];
  downloadAfterExec?: {
    outputDir: string;
    accounts: string[];
  };
  signingKeys?: number[][];
}

export function buildConfig(
  workspace: string,
  instructions: TransactionInstruction[],
  programs: Record<string, string>,
  signers: Keypair[] = [],
  airdropTo: PublicKey[] = [],
  downloadAfterExec: PublicKey[] = [],
  simulate: boolean = true,
): BridgeConfig {
  // Collect all unique account pubkeys from instructions
  const allPubkeys = new Set<string>();
  for (const ix of instructions) {
    for (const key of ix.keys) {
      allPubkeys.add(key.pubkey.toBase58());
    }
  }

  // Build account paths map (pubkey -> absolute file path)
  const accountPaths: Record<string, string> = {};
  for (const pubkey of allPubkeys) {
    if (AUTO_LOADED_PROGRAMS.has(pubkey)) continue;
    const filePath = path.join(workspace, `${pubkey}.json`);
    if (fs.existsSync(filePath)) {
      accountPaths[pubkey] = path.resolve(filePath);
    }
  }

  // Filter out auto-loaded programs from user program mappings
  const filteredPrograms: Record<string, string> = {};
  for (const [id, name] of Object.entries(programs)) {
    if (!AUTO_LOADED_PROGRAMS.has(id)) {
      filteredPrograms[id] = name;
    }
  }

  // Build instruction configs
  const ixConfigs = instructions.map(ix => ({
    programId: ix.programId.toBase58(),
    accounts: ix.keys.map(key => ({
      pubkey: key.pubkey.toBase58(),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(ix.data).toString('base64'),
  }));

  const config: BridgeConfig = {
    instructions: ixConfigs,
    accountPaths,
    programs: filteredPrograms,
    simulate,
  };

  if (airdropTo.length > 0) {
    config.airdropTo = airdropTo.map(pk => pk.toBase58());
  }

  if (downloadAfterExec.length > 0) {
    config.downloadAfterExec = {
      outputDir: path.resolve(workspace),
      accounts: downloadAfterExec.map(pk => pk.toBase58()),
    };
  }

  if (signers.length > 0) {
    config.signingKeys = signers.map(s => Array.from(s.secretKey));
  }

  return config;
}
