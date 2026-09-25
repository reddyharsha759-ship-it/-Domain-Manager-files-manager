import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Supported rule structure for each domain category in .domains.json.
 */
export interface DomainRuleDefinition {
  /** Regular expressions or keyword substring patterns */
  patterns?: string[];
  /** Exact or relative folder path prefixes */
  folders?: string[];
  /** File extensions to match (e.g. [".tsx", ".vue"]) */
  extensions?: string[];
}

export type DomainConfigMap = Record<string, string[] | DomainRuleDefinition>;

export interface DomainConfigFile {
  domains?: DomainConfigMap;
  [key: string]: any;
}

/**
 * Compiled rules ready for fast evaluation.
 */
export interface CompiledDomainRules {
  patterns: RegExp[];
  folders: string[];
  extensions: string[];
}

/**
 * Reads and parses .domains.json from the active workspace root.
 * Returns a compiled domain-to-rule map, or null if the file does not exist or is invalid.
 */
export async function loadDomainConfig(
  workspaceUri?: vscode.Uri
): Promise<Map<string, CompiledDomainRules> | null> {
  const targetFolder =
    workspaceUri ?? (vscode.workspace.workspaceFolders?.[0]?.uri);

  if (!targetFolder) {
    return null;
  }

  const configUri = vscode.Uri.joinPath(targetFolder, '.domains.json');

  try {
    const fileBytes = await vscode.workspace.fs.readFile(configUri);
    const content = Buffer.from(fileBytes).toString('utf-8');
    const parsed: DomainConfigFile = JSON.parse(content);

    // Support either { "domains": { "Auth": ... } } or root { "Auth": ... }
    const rawDomains: DomainConfigMap = parsed.domains || parsed;
    const compiled = new Map<string, CompiledDomainRules>();

    for (const [domainName, rules] of Object.entries(rawDomains)) {
      if (domainName === 'domains') {
        continue;
      }

      const compiledRules: CompiledDomainRules = {
        patterns: [],
        folders: [],
        extensions: [],
      };

      if (Array.isArray(rules)) {
        // Shorthand array format: ["auth", "login", "jwt"]
        for (const rule of rules) {
          if (rule.startsWith('.')) {
            compiledRules.extensions.push(rule.toLowerCase());
          } else {
            compiledRules.patterns.push(new RegExp(escapeRegex(rule), 'i'));
          }
        }
      } else if (typeof rules === 'object' && rules !== null) {
        // Detailed object format: { patterns: [...], folders: [...], extensions: [...] }
        if (Array.isArray(rules.patterns)) {
          for (const pattern of rules.patterns) {
            try {
              compiledRules.patterns.push(new RegExp(pattern, 'i'));
            } catch {
              // If invalid regex, fallback to literal match
              compiledRules.patterns.push(new RegExp(escapeRegex(pattern), 'i'));
            }
          }
        }

        if (Array.isArray(rules.folders)) {
          compiledRules.folders = rules.folders.map((f) =>
            f.replace(/\\/g, '/').toLowerCase().replace(/^\/+|\/+$/g, '')
          );
        }

        if (Array.isArray(rules.extensions)) {
          compiledRules.extensions = rules.extensions.map((ext) =>
            (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase()
          );
        }
      }

      compiled.set(domainName, compiledRules);
    }

    return compiled;
  } catch (err: any) {
    // File not found (FileNotFound or EntryNotFound) -> fall back gracefully
    if (err?.code === 'FileNotFound' || err?.name === 'EntryNotFound') {
      return null;
    }

    // JSON syntax error or permission issue -> log warning and fallback
    console.warn(`[DomainFileManager] Failed to parse .domains.json: ${err?.message || err}`);
    return null;
  }
}

/**
 * Tests whether a given file matches any compiled rules for a domain.
 */
export function matchesDomainRules(
  uri: vscode.Uri,
  rules: CompiledDomainRules
): boolean {
  const normalizedPath = uri.fsPath.replace(/\\/g, '/').toLowerCase();
  const fileExt = path.extname(normalizedPath);

  // 1. Check extensions
  if (rules.extensions.length > 0 && rules.extensions.includes(fileExt)) {
    return true;
  }

  // 2. Check folders
  if (rules.folders.length > 0) {
    for (const folder of rules.folders) {
      if (
        normalizedPath.includes(`/${folder}/`) ||
        normalizedPath.startsWith(`${folder}/`) ||
        normalizedPath.endsWith(`/${folder}`)
      ) {
        return true;
      }
    }
  }

  // 3. Check regex patterns
  for (const regex of rules.patterns) {
    if (regex.test(normalizedPath)) {
      return true;
    }
  }

  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
