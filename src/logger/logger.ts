export class SolariumLogger {
  private static instance: SolariumLogger;
  private logs: Map<string, string[]> = new Map();
  private originalLog: typeof console.log;
  private originalError: typeof console.error;
  private originalWarn: typeof console.warn;
  private _activeWorkspace: string | null = null;

  private constructor() {
    this.originalLog = console.log;
    this.originalError = console.error;
    this.originalWarn = console.warn;
  }

  static getInstance(): SolariumLogger {
    if (!SolariumLogger.instance) {
      SolariumLogger.instance = new SolariumLogger();
    }
    return SolariumLogger.instance;
  }

  begin(workspace: string): void {
    this._activeWorkspace = workspace;
    if (!this.logs.has(workspace)) {
      this.logs.set(workspace, []);
    }

    console.log = (...args: unknown[]) => {
      const line = args.map(String).join(' ');
      this.capture(workspace, line);
      this.originalLog.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
      const line = args.map(String).join(' ');
      this.capture(workspace, `[ERROR] ${line}`);
      this.originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      const line = args.map(String).join(' ');
      this.capture(workspace, `[WARN] ${line}`);
      this.originalWarn.apply(console, args);
    };
  }

  end(_workspace: string): void {
    this._activeWorkspace = null;
    console.log = this.originalLog;
    console.error = this.originalError;
    console.warn = this.originalWarn;
  }

  getLogs(workspace: string): string[] {
    return this.logs.get(workspace) || [];
  }

  findPatterns(workspace: string, pattern: RegExp): string[] {
    const lines = this.getLogs(workspace);
    return lines.filter(line => pattern.test(line));
  }

  clear(workspace: string): void {
    this.logs.delete(workspace);
  }

  private capture(workspace: string, line: string): void {
    const lines = this.logs.get(workspace);
    if (lines) {
      lines.push(line);
    }
  }
}
