import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceConfig, workspacePath, tempWorkspacePath } from './paths';

export class WorkspaceManager {
  private config: WorkspaceConfig;

  constructor(config: WorkspaceConfig) {
    this.config = config;
  }

  copyToTemp(workspace: string): string {
    const src = workspacePath(this.config, workspace);
    const dst = tempWorkspacePath(this.config, workspace);

    if (!fs.existsSync(src)) {
      throw new Error(`Workspace not found: ${src}`);
    }

    fs.mkdirSync(dst, { recursive: true });
    this.copyDirRecursive(src, dst);
    return dst;
  }

  cleanTemp(workspace: string): void {
    const dst = tempWorkspacePath(this.config, workspace);
    if (fs.existsSync(dst)) {
      fs.rmSync(dst, { recursive: true, force: true });
    }
  }

  copyAccounts(sourceWorkspace: string, targetDir: string): void {
    const src = workspacePath(this.config, sourceWorkspace);
    if (!fs.existsSync(src)) {
      throw new Error(`Source workspace not found: ${src}`);
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const files = fs.readdirSync(src).filter(f => f.endsWith('.json'));
    for (const file of files) {
      fs.copyFileSync(path.join(src, file), path.join(targetDir, file));
    }
  }

  deleteAccount(workspaceDir: string, pubkey: string): void {
    const filePath = path.join(workspaceDir, `${pubkey}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  listAccounts(workspaceDir: string): string[] {
    if (!fs.existsSync(workspaceDir)) {
      return [];
    }
    return fs.readdirSync(workspaceDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  private copyDirRecursive(src: string, dst: string): void {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const dstPath = path.join(dst, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(dstPath, { recursive: true });
        this.copyDirRecursive(srcPath, dstPath);
      } else {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }
}
