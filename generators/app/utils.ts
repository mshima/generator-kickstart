import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

/**
 * Returns true when the source requires a network fetch (https/http URL or github: shorthand).
 * Returns false for local template names.
 */
export function isRemoteSource(source: string): boolean {
  const trimmed = source.trim();
  if (trimmed.startsWith('github:')) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Converts a remote source (github: shorthand or https/http URL) to the URL that
 * should be fetched. Throws for unsupported protocols.
 */
export function toFetchUrl(source: string): string {
  const trimmed = source.trim();
  if (trimmed.startsWith('github:')) {
    return githubToUrl(trimmed);
  }
  const url = new URL(trimmed);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(
      `Unsupported protocol "${url.protocol}". Use https:, http:, or "github:" shorthand.`,
    );
  }
  return trimmed;
}

export interface CodeBlock {
  filename: string;
  content: string;
}

/**
 * Parses a markdown string and extracts Liquid code blocks with their associated
 * filenames. Code blocks must be fenced with triple backticks, use `liquid` as
 * the language identifier, and include the target filename on the same line:
 *
 * ```liquid path/to/file.ts
 * template content
 * ```
 */
export function parseMarkdownBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /^```liquid[ \t]+(\S+)[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      filename: match[1],
      content: match[2],
    });
  }

  return blocks;
}

/**
 * Converts a "github:user/repo" or "github:user/repo/path/to/file.md"
 * shorthand into a raw.githubusercontent.com URL. Defaults to README.md when
 * no path is provided.
 *
 * @example
 * githubToUrl('github:mshima/generator-kickstart')
 * // → 'https://raw.githubusercontent.com/mshima/generator-kickstart/HEAD/README.md'
 *
 * githubToUrl('github:mshima/generator-kickstart/docs/guide.md')
 * // → 'https://raw.githubusercontent.com/mshima/generator-kickstart/HEAD/docs/guide.md'
 */
export function githubToUrl(source: string): string {
  const rest = source.slice('github:'.length);
  const [user, repo, ...pathParts] = rest.split('/');
  if (!user || !repo) {
    throw new Error(
      `Invalid github shorthand "${source}". Expected "github:user/repo" or "github:user/repo/path/to/file.md".`,
    );
  }
  const filePath = pathParts.length > 0 ? pathParts.join('/') : 'README.md';
  return `https://raw.githubusercontent.com/${user}/${repo}/HEAD/${filePath}`;
}

/**
 * Validates a template source argument. Returns `true` when valid or an error
 * message string when invalid.  Intended for use as a Yeoman prompt validator.
 *
 * Accepts:
 *  - A valid https/http URL
 *  - A "github:user/repo[/path]" shorthand
 *  - A template name (file that exists inside templateDir, with or without .md extension)
 */
export function validateSource(input: string, templateDir: string): true | string {
  const trimmed = input.trim();
  if (!trimmed) return 'Template source is required.';

  if (trimmed.startsWith('github:')) {
    const rest = trimmed.slice('github:'.length);
    const parts = rest.split('/').filter(Boolean);
    if (parts.length >= 2) return true;
    return 'Invalid github shorthand. Expected "github:user/repo" or "github:user/repo/path/to/file.md".';
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' || url.protocol === 'http:') return true;
    return `Unsupported protocol "${url.protocol}". Use https:, http:, or "github:" shorthand.`;
  } catch {
    // Not a URL — check for a local template file
    if (
      existsSync(join(templateDir, trimmed)) ||
      existsSync(join(templateDir, `${trimmed}.md`))
    ) {
      return true;
    }
    return `"${trimmed}" is not a valid URL, github shorthand, or known template name.`;
  }
}

/**
 * Reads a local template file from `templateDir`.
 *
 * Accepts a template name with or without `.md` extension.
 * Throws when no matching file is found or when the resolved path escapes
 * `templateDir` (path-traversal protection).
 */
export function resolveLocalTemplate(source: string, templateDir: string): string {
  return readTemplateFile(source, templateDir);
}

function readTemplateFile(name: string, templateDir: string): string {
  const candidates = [join(templateDir, name), join(templateDir, `${name}.md`)];
  for (const candidate of candidates) {
    const safeDir = resolve(templateDir);
    const safePath = resolve(candidate);
    if (!safePath.startsWith(safeDir + sep) && safePath !== safeDir) continue;
    if (existsSync(safePath)) {
      return readFileSync(safePath, 'utf8');
    }
  }
  throw new Error(`Template "${name}" not found in ${templateDir}.`);
}
