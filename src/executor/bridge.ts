import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { SolariumExecutorConfig, ExecuteOptions, ExecutionResult } from './types';
import { buildConfig } from './config-builder';
import { DEFAULT_TIMEOUT } from '../constants';

export class SolariumExecutor {
  private config: SolariumExecutorConfig;

  constructor(config: SolariumExecutorConfig) {
    this.config = config;
  }

  async run(options: ExecuteOptions): Promise<ExecutionResult> {
    const workspace = path.join(
      this.config.artifactsDir,
      'accounts',
      options.workspace,
    );

    const bridgeConfig = buildConfig(
      workspace,
      options.instructions,
      options.programs,
      options.signers || [],
      options.airdropTo || [],
      options.downloadAfterExec || [],
      options.simulate ?? true,
    );

    // Write config to temp file
    const configDir = path.join(this.config.artifactsDir, 'test-config');
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, `config-${Date.now()}.json`);
    fs.writeFileSync(configPath, JSON.stringify(bridgeConfig));

    try {
      return await this.executeProcess(configPath);
    } finally {
      // Clean up temp config
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  }

  private executeProcess(configPath: string): Promise<ExecutionResult> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    return new Promise((resolve, reject) => {
      const child = spawn(this.config.binaryPath, ['--config-file', configPath], {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout);

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          resolve({
            success: false,
            output: stdout,
            error: `Process timed out after ${timeout}ms`,
          });
          return;
        }

        if (code !== 0) {
          resolve({
            success: false,
            output: stdout,
            error: stderr || `Process exited with code ${code}`,
          });
          return;
        }

        resolve({ success: true, output: stdout });
      });

      child.on('error', (err: Error) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }
}
