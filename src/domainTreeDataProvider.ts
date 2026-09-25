import * as vscode from 'vscode';
import * as path from 'path';
import {
  loadDomainConfig,
  matchesDomainRules,
  CompiledDomainRules,
} from './domainConfig';

/**
 * Functional domains for categorizing workspace files.
 */
export type DomainCategory = string;

/**
 * Tree item representation for either a Domain group or an individual File.
 */
export class DomainTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'domain' | 'file',
    public readonly domain?: DomainCategory,
    public readonly fileUri?: vscode.Uri
  ) {
    super(label, collapsibleState);

    if (itemType === 'domain') {
      this.contextValue = 'domainCategory';
      this.tooltip = `${label} Domain`;
      this.iconPath = this.getDomainIcon(domain);
    } else if (fileUri) {
      this.resourceUri = fileUri;
      this.contextValue = 'domainFile';
      this.tooltip = fileUri.fsPath;
      this.description = this.getRelativeParentPath(fileUri);

      // Open file in editor on click
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [fileUri],
      };
    }
  }

  private getDomainIcon(domain?: DomainCategory): vscode.ThemeIcon {
    switch (domain) {
      case 'Auth':
        return new vscode.ThemeIcon('shield', new vscode.ThemeColor('charts.red'));
      case 'Frontend':
        return new vscode.ThemeIcon('layout', new vscode.ThemeColor('charts.blue'));
      case 'Backend':
        return new vscode.ThemeIcon('server', new vscode.ThemeColor('charts.green'));
      default:
        return new vscode.ThemeIcon('folder-library', new vscode.ThemeColor('charts.yellow'));
    }
  }

  private getRelativeParentPath(uri: vscode.Uri): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return path.dirname(uri.fsPath);
    }
    const relativePath = path.relative(workspaceFolder.uri.fsPath, path.dirname(uri.fsPath));
    return relativePath === '' ? '.' : relativePath.replace(/\\/g, '/');
  }
}

/**
 * Custom TreeDataProvider that categorizes workspace files into functional domains.
 * Reads custom rules from .domains.json if present, falling back to default heuristics.
 */
export class DomainTreeDataProvider
  implements vscode.TreeDataProvider<DomainTreeItem>, vscode.Disposable {
  private _onDidChangeTreeData: vscode.EventEmitter<DomainTreeItem | undefined | void> =
    new vscode.EventEmitter<DomainTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<DomainTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private domainFileMap: Map<DomainCategory, vscode.Uri[]> = new Map();
  private customConfig: Map<string, CompiledDomainRules> | null = null;

  private isScanning: boolean = false;
  private disposables: vscode.Disposable[] = [];
  private debounceTimer?: NodeJS.Timeout;

  constructor() {
    this.initFileSystemWatcher();
    this.scanWorkspace();
  }

  /**
   * Initializes real-time file system watchers for file and configuration changes.
   */
  private initFileSystemWatcher(): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidCreate(() => this.triggerDebouncedRefresh(), this, this.disposables);
    watcher.onDidDelete(() => this.triggerDebouncedRefresh(), this, this.disposables);
    // Explicitly watch for changes to .domains.json config
    watcher.onDidChange((uri) => {
      if (uri.fsPath.endsWith('.domains.json')) {
        this.triggerDebouncedRefresh();
      }
    }, this, this.disposables);

    const renameListener = vscode.workspace.onDidRenameFiles(
      () => this.triggerDebouncedRefresh(),
      this,
      this.disposables
    );

    this.disposables.push(watcher, renameListener, this._onDidChangeTreeData);
  }

  /**
   * Debounces refresh calls during batch operations or rapid saves.
   */
  private triggerDebouncedRefresh(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.refresh();
    }, 150);
  }

  /**
   * Refreshes the tree data and rescans workspace files.
   */
  public refresh(): void {
    this.scanWorkspace();
  }

  public getTreeItem(element: DomainTreeItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: DomainTreeItem): Promise<DomainTreeItem[]> {
    // Top-level: Return Domain Category folders
    if (!element) {
      const activeDomains = Array.from(this.domainFileMap.keys());

      return activeDomains.map((domain) => {
        const fileCount = this.domainFileMap.get(domain)?.length ?? 0;
        return new DomainTreeItem(
          `${domain} (${fileCount})`,
          fileCount > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed,
          'domain',
          domain
        );
      });
    }

    // Second level: Return sorted files grouped under the selected domain
    if (element.itemType === 'domain' && element.domain) {
      const files = this.domainFileMap.get(element.domain) || [];
      return files
        .sort((a, b) => path.basename(a.fsPath).localeCompare(path.basename(b.fsPath)))
        .map((fileUri) => {
          return new DomainTreeItem(
            path.basename(fileUri.fsPath),
            vscode.TreeItemCollapsibleState.None,
            'file',
            element.domain,
            fileUri
          );
        });
    }

    return [];
  }

  /**
   * Returns all currently categorized files mapped with their functional domain.
   */
  public getAllCategorizedFiles(): { uri: vscode.Uri; domain: DomainCategory }[] {
    const results: { uri: vscode.Uri; domain: DomainCategory }[] = [];
    for (const [domain, uris] of this.domainFileMap.entries()) {
      for (const uri of uris) {
        results.push({ uri, domain });
      }
    }
    return results;
  }

  /**
   * Scans active workspace files, loads .domains.json config, and applies categorization.
   */
  public async scanWorkspace(): Promise<void> {
    if (this.isScanning) {
      return;
    }
    this.isScanning = true;

    try {
      // 1. Attempt to load custom rules from .domains.json
      this.customConfig = await loadDomainConfig();

      // 2. Discover workspace files excluding build and dependency folders
      const excludePattern =
        '**/{node_modules,.git,.dart_tool,dist,build,out,.next,.turbo,vendor}/**';
      const fileUris = await vscode.workspace.findFiles('**/*', excludePattern);

      // Initialize map with standard domains in default order
      const newMap: Map<DomainCategory, vscode.Uri[]> = new Map();

      // Seed standard domains or custom domains from config
      if (this.customConfig && this.customConfig.size > 0) {
        for (const domain of this.customConfig.keys()) {
          newMap.set(domain, []);
        }
      } else {
        newMap.set('Frontend', []);
        newMap.set('Backend', []);
        newMap.set('Auth', []);
      }
      newMap.set('Other', []);

      for (const uri of fileUris) {
        // Skip .domains.json itself from the functional domains
        if (uri.fsPath.endsWith('.domains.json')) {
          continue;
        }

        const domain = this.classifyFile(uri);
        if (!newMap.has(domain)) {
          newMap.set(domain, []);
        }
        newMap.get(domain)!.push(uri);
      }

      this.domainFileMap = newMap;
      this._onDidChangeTreeData.fire();
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Classifies a file against custom .domains.json rules if available,
   * otherwise falls back gracefully to built-in heuristic rules.
   */
  public classifyFile(uri: vscode.Uri): DomainCategory {
    // 1. Evaluate custom config rules first if available
    if (this.customConfig && this.customConfig.size > 0) {
      // Prioritize Auth if configured, then Frontend, then Backend, then any other
      const domainPriority = ['Auth', 'Frontend', 'Backend', ...this.customConfig.keys()];
      const checked = new Set<string>();

      for (const domain of domainPriority) {
        if (checked.has(domain)) {
          continue;
        }
        checked.add(domain);

        const rules = this.customConfig.get(domain);
        if (rules && matchesDomainRules(uri, rules)) {
          return domain;
        }
      }

      return 'Other';
    }

    // 2. Fall back to default heuristics
    return this.classifyFileDefaultHeuristics(uri);
  }

  /**
   * Default built-in heuristic categorization.
   */
  public classifyFileDefaultHeuristics(uri: vscode.Uri): DomainCategory {
    const normalizedPath = uri.fsPath.replace(/\\/g, '/').toLowerCase();

    // Default Auth heuristics
    const authPatterns = [
      /(^|\/)(auth|session|login|signup|oauth|jwt|tokens?|roles?|permissions?)(\/|\.|$)/,
      /(auth|session|login|signup|jwt|token|credential)\./,
    ];
    if (authPatterns.some((pattern) => pattern.test(normalizedPath))) {
      return 'Auth';
    }

    // Default Frontend heuristics
    const frontendPatterns = [
      /(^|\/)(components?|pages?|views?|screens?|widgets?|presentation|ui|styles?|layouts?|assets?)(\/|\.|$)/,
      /\.(jsx|tsx|vue|svelte|html|css|scss|sass|less)$/,
    ];
    if (frontendPatterns.some((pattern) => pattern.test(normalizedPath))) {
      return 'Frontend';
    }

    // Default Backend heuristics
    const backendPatterns = [
      /(^|\/)(api|routes?|controllers?|services?|servers?|models?|repositories?|db|database|endpoints?|handlers?|graphql|resolvers?)(\/|\.|$)/,
      /(server|api|controller|service|repository|resolver)\./,
    ];
    if (backendPatterns.some((pattern) => pattern.test(normalizedPath))) {
      return 'Backend';
    }

    return 'Other';
  }

  public dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
