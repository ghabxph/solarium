import { describe, it, expect } from '@jest/globals';
import {
  TestConfig,
  TxCallbackContext,
} from './types';
import { ConnectionMock } from '../workspace/connection';
import { WorkspaceManager } from '../workspace/manager';
import { buildWorkspace } from '../workspace/paths';
import { SolariumExecutor } from '../executor/bridge';
import { TokenHacker } from '../accounts/token-hacker';
import { SolariumLogger } from '../logger/logger';
import { DEFAULT_TIMEOUT } from '../constants';
import * as path from 'path';

export interface RunTestOptions {
  artifactsDir: string;
  binaryPath: string;
  rpcUrl?: string;
}

function getKeypairs(
  signers: TestConfig<any>['signers'],
  ctx: TxCallbackContext,
): import('@solana/web3.js').Keypair[] {
  if (!signers) return [];
  if (typeof signers === 'function') return signers(ctx);
  return signers;
}

export function runTest<TParams>(config: TestConfig<TParams>, options: RunTestOptions) {
  const wsManager = new WorkspaceManager({ artifactsDir: options.artifactsDir });
  const connection = new ConnectionMock({
    artifactsDir: options.artifactsDir,
    rpcUrl: options.rpcUrl,
  });
  const executor = new SolariumExecutor({
    binaryPath: options.binaryPath,
    artifactsDir: options.artifactsDir,
  });
  const tokenHacker = new TokenHacker();
  const logger = SolariumLogger.getInstance();

  describe(`${config.module} - ${config.description}`, () => {
    config.scenarios.forEach((scenario, index) => {
      it(`Scenario ${index + 1}: ${scenario.description}`, async () => {
        const workspace = buildWorkspace(config.category, config.module, index + 1);
        logger.begin(workspace);

        console.log('--------------------------------------------------');
        console.log(`Scenario ${index + 1}: ${scenario.description}`);
        console.log(`Workspace: ${workspace}`);
        console.log('--------------------------------------------------');

        // ── Phase 1: Workspace Isolation ──
        let activeWorkspace: string;
        const workspaceDir = path.join(options.artifactsDir, 'accounts', workspace);

        if (config.routeWorkspaceToTemp) {
          activeWorkspace = wsManager.copyToTemp(workspace);
        } else {
          activeWorkspace = workspaceDir;
        }
        connection.setWorkspace(
          config.routeWorkspaceToTemp
            ? path.relative(path.join(options.artifactsDir, 'accounts'), activeWorkspace)
            : workspace,
        );

        const cleanup = () => {
          if (config.routeWorkspaceToTemp) {
            wsManager.cleanTemp(workspace);
          }
          logger.end(workspace);
        };

        try {
          // Copy from source workspace if specified
          if (scenario.source) {
            const srcWorkspace = buildWorkspace(
              scenario.source.category,
              scenario.source.module,
              scenario.source.scenario,
            );
            wsManager.copyAccounts(srcWorkspace, activeWorkspace);
          }

          // Delete specified accounts
          if (scenario.deleteAccounts) {
            for (const pubkey of scenario.deleteAccounts) {
              wsManager.deleteAccount(activeWorkspace, pubkey.toBase58());
            }
          }

          // ── Phase 2: Pre-Transaction Account Setup ──
          if (scenario.preCreateAccounts) {
            for (const account of scenario.preCreateAccounts) {
              tokenHacker.createTokenAccount(
                activeWorkspace,
                account.mint,
                account.owner,
                account.type,
                account.balance,
              );
            }
          }

          // ── Phase 3: Transaction Generation ──
          const result = await config.txGenerator({
            connection,
            scenario: scenario.params,
            workspace: activeWorkspace,
          });

          // Handle expected generation errors
          if (scenario.expectedGenerationError) {
            expect(result.status).not.toBe(200);
            const pattern = new RegExp(scenario.expectedGenerationError);
            const logs = logger.getLogs(workspace);
            const matched = logs.some((line: string) => pattern.test(line));
            if (matched) {
              console.log(`Expected generation error matched: ${scenario.expectedGenerationError}`);
            }
            cleanup();
            return;
          }

          // ── Phase 4: Response Validation ──
          expect(result).toBeDefined();
          if (result.status !== 200) {
            const msg = String(result.data?.message || `Status ${result.status}`);
            throw new Error(msg);
          }
          expect(result.status).toBe(200);
          const transactions = result.data.transactions;
          expect(transactions.length).toBeGreaterThan(0);
          expect(transactions[0].length).toBeGreaterThan(0);

          // ── Phase 4.5: Dynamic Pre-Create Accounts ──
          if (scenario.dynamicPreCreateAccounts) {
            const allIxs = transactions.flat();
            const dynamicAccounts = await scenario.dynamicPreCreateAccounts({
              instructions: allIxs,
              connection,
              workspace: activeWorkspace,
            });
            for (const account of dynamicAccounts) {
              tokenHacker.createTokenAccount(
                activeWorkspace,
                account.mint,
                account.owner,
                account.type,
                account.balance,
              );
            }
          }

          // ── Phase 5: Transaction Execution ──
          if (!config.skipExecution) {
            for (let txIndex = 0; txIndex < transactions.length; txIndex++) {
              const instructions = transactions[txIndex];
              console.log(
                `Executing transaction ${txIndex + 1}/${transactions.length} (${instructions.length} instructions)`,
              );

              const ctx: TxCallbackContext = {
                txIndex,
                totalTxs: transactions.length,
                instructions,
                allTransactions: transactions,
              };

              const signersSource = scenario.signers ?? config.signers;
              const keypairs = getKeypairs(signersSource, ctx);
              const accountsToDownload = config.downloadAccounts?.(ctx) ?? [];

              const execResult = await executor.run({
                workspace: config.routeWorkspaceToTemp
                  ? path.relative(path.join(options.artifactsDir, 'accounts'), activeWorkspace)
                  : workspace,
                instructions,
                programs: config.programs,
                signers: keypairs,
                airdropTo: config.airdropAddresses,
                downloadAfterExec: accountsToDownload,
              });

              if (!execResult.success) {
                // Check for expected simulation error
                if (scenario.expectedSimulationError) {
                  const pattern = new RegExp(scenario.expectedSimulationError);
                  const allOutput = execResult.output + (execResult.error || '');
                  if (pattern.test(allOutput)) {
                    console.log(
                      `Expected simulation error matched: ${scenario.expectedSimulationError}`,
                    );
                    cleanup();
                    return;
                  }
                }
                throw new Error(
                  `Execution failed: ${execResult.error || 'Unknown error'}`,
                );
              }

              // Phase 5.1: In-between assertions
              if (config.inBetweenTxAssertions) {
                await config.inBetweenTxAssertions({
                  transactions,
                  scenario: scenario.params,
                  workspace: activeWorkspace,
                  connection,
                });
              }
            }
          } else {
            console.log('Skipping transaction execution (skipExecution: true)');
          }

          // ── Phase 6: Custom Assertions ──
          if (config.assertions) {
            await config.assertions({
              transactions,
              scenario: scenario.params,
              workspace: activeWorkspace,
              connection,
            });
          }
        } finally {
          cleanup();
        }
      }, config.timeout || DEFAULT_TIMEOUT);
    });
  });
}
