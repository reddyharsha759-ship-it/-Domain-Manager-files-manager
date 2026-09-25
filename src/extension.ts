import * as vscode from 'vscode';
import * as path from 'path';
import { DomainTreeDataProvider, DomainTreeItem } from './domainTreeDataProvider';

interface DomainQuickPickItem extends vscode.QuickPickItem {
  uri: vscode.Uri;
  domain: string;
}

export function activate(context: vscode.ExtensionContext) {
  // Initialize the DomainTreeDataProvider (manages its own real-time file system watchers)
  const domainTreeDataProvider = new DomainTreeDataProvider();

  // Register the TreeDataProvider with the view ID defined in package.json
  const treeView = vscode.window.createTreeView('domainFileManagerView', {
    treeDataProvider: domainTreeDataProvider,
    showCollapseAll: true,
  });

  // Command to manually refresh domain categorization
  const refreshCommand = vscode.commands.registerCommand(
    'domainFileManager.refresh',
    () => {
      domainTreeDataProvider.refresh();
      vscode.window.showInformationMessage('Domain File Manager: Workspace scanned.');
    }
  );

  // Right-click context menu command: Reveal in Explorer
  const revealInExplorerCommand = vscode.commands.registerCommand(
    'domainFileManager.revealInExplorer',
    async (item?: DomainTreeItem | vscode.Uri) => {
      let targetUri: vscode.Uri | undefined;

      if (item instanceof vscode.Uri) {
        targetUri = item;
      } else if (item && item.fileUri) {
        targetUri = item.fileUri;
      } else if (vscode.window.activeTextEditor) {
        targetUri = vscode.window.activeTextEditor.document.uri;
      }

      if (targetUri) {
        await vscode.commands.executeCommand('revealInExplorer', targetUri);
      } else {
        vscode.window.showWarningMessage('No file selected to reveal in explorer.');
      }
    }
  );

  // QuickPick command: Jump to Domain File across functional domains
  const jumpToDomainFileCommand = vscode.commands.registerCommand(
    'domainFileManager.jumpToDomainFile',
    async () => {
      const categorizedFiles = domainTreeDataProvider.getAllCategorizedFiles();

      if (categorizedFiles.length === 0) {
        vscode.window.showInformationMessage('No domain files found. Workspace may still be indexing.');
        return;
      }

      const getDomainIcon = (domain: string): string => {
        switch (domain) {
          case 'Auth':
            return '$(shield)';
          case 'Frontend':
            return '$(layout)';
          case 'Backend':
            return '$(server)';
          default:
            return '$(file)';
        }
      };

      const items: DomainQuickPickItem[] = categorizedFiles.map(({ uri, domain }) => {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        const relativePath = workspaceFolder
          ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath).replace(/\\/g, '/')
          : uri.fsPath.replace(/\\/g, '/');

        return {
          label: `${getDomainIcon(domain)} ${path.basename(uri.fsPath)}`,
          description: `[${domain}]`,
          detail: relativePath,
          uri,
          domain,
        };
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Search domain files by name, path, or tag ([Frontend], [Backend], [Auth])...',
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (selected) {
        await vscode.commands.executeCommand('vscode.open', selected.uri);
      }
    }
  );

  // Register disposables
  context.subscriptions.push(
    treeView,
    refreshCommand,
    revealInExplorerCommand,
    jumpToDomainFileCommand,
    domainTreeDataProvider
  );
}

export function deactivate() {}
