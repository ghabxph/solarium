import * as path from 'path';

export interface WorkspaceConfig {
  artifactsDir: string;
}

export function accountsDir(config: WorkspaceConfig): string {
  return path.join(config.artifactsDir, 'accounts');
}

export function programsDir(config: WorkspaceConfig): string {
  return path.join(config.artifactsDir, 'programs');
}

export function tempDir(config: WorkspaceConfig): string {
  return path.join(config.artifactsDir, 'temp', 'accounts');
}

export function workspacePath(config: WorkspaceConfig, workspace: string): string {
  return path.join(accountsDir(config), workspace);
}

export function tempWorkspacePath(config: WorkspaceConfig, workspace: string): string {
  return path.join(tempDir(config), workspace);
}

export function accountFilePath(config: WorkspaceConfig, workspace: string, pubkey: string): string {
  return path.join(workspacePath(config, workspace), `${pubkey}.json`);
}

export function buildWorkspace(category: string, module: string, scenario: number): string {
  return `${category}/${module}/scenario-${scenario}`;
}
