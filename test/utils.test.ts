import { describe, it, expect } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseMarkdownBlocks,
  githubToUrl,
  isRemoteSource,
  toFetchUrl,
  resolveLocalTemplate,
  sanitizeBlockFilename,
  validateSource,
  type CodeBlock,
} from '../generators/app/utils.ts';

const TEMPLATE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../generators/app/templates',
);

describe('parseMarkdownBlocks', () => {
  it('parses a single Liquid code block with filename', () => {
    const markdown = [
      '# My Template',
      '',
      '```liquid src/index.ts',
      "const hello = 'world';",
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].filename).toBe('src/index.ts');
    expect(blocks[0].content).toBe("const hello = 'world';\n");
  });

  it('parses multiple Liquid code blocks', () => {
    const markdown = [
      '```liquid src/a.ts',
      'const a = 1;',
      '```',
      '',
      '```liquid src/b.ts',
      'const b = 2;',
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].filename).toBe('src/a.ts');
    expect(blocks[0].content).toBe('const a = 1;\n');
    expect(blocks[1].filename).toBe('src/b.ts');
    expect(blocks[1].content).toBe('const b = 2;\n');
  });

  it('ignores non-Liquid code blocks', () => {
    const markdown = [
      '```typescript src/index.ts',
      "const hello = 'world';",
      '```',
      '',
      '```liquid src/template.liquid',
      '{{ name }}',
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].filename).toBe('src/template.liquid');
  });

  it('returns empty array when no Liquid blocks are found', () => {
    const markdown = '# No code blocks here\n\nJust some text.\n';

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(0);
  });

  it('parses a code block with nested path', () => {
    const markdown = [
      '```liquid deeply/nested/path/file.json',
      '{ "key": "value" }',
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].filename).toBe('deeply/nested/path/file.json');
  });

  it('renders Liquid expressions in code blocks', async () => {
    const { Liquid } = await import('liquidjs');
    const engine = new Liquid();
    const markdown = [
      '```liquid src/greeting.ts',
      "const msg = '{{ greeting }}';",
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);
    const rendered = await engine.parseAndRender(blocks[0].content, {
      greeting: 'hello',
    });

    expect(rendered).toBe("const msg = 'hello';\n");
  });
});

describe('CodeBlock type', () => {
  it('has filename and content properties', () => {
    const block: CodeBlock = { filename: 'test.ts', content: 'const x = 1;\n' };
    expect(block.filename).toBe('test.ts');
    expect(block.content).toBe('const x = 1;\n');
  });
});

describe('githubToUrl', () => {
  it('converts github:user/repo to a raw README.md URL', () => {
    expect(githubToUrl('github:mshima/generator-parse')).toBe(
      'https://raw.githubusercontent.com/mshima/generator-parse/HEAD/README.md',
    );
  });

  it('converts github:user/repo/path to a raw URL for that path', () => {
    expect(githubToUrl('github:mshima/generator-parse/docs/guide.md')).toBe(
      'https://raw.githubusercontent.com/mshima/generator-parse/HEAD/docs/guide.md',
    );
  });

  it('throws on an invalid github shorthand (no repo)', () => {
    expect(() => githubToUrl('github:user')).toThrow(
      'Invalid github shorthand "github:user"',
    );
  });
});

describe('isRemoteSource', () => {
  it('returns true for https URLs', () => {
    expect(isRemoteSource('https://example.com/file.md')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isRemoteSource('http://example.com/file.md')).toBe(true);
  });

  it('returns true for github: shorthand', () => {
    expect(isRemoteSource('github:user/repo')).toBe(true);
  });

  it('returns false for a local template name', () => {
    expect(isRemoteSource('example')).toBe(false);
  });

  it('returns false for a relative path', () => {
    expect(isRemoteSource('some/path/file.md')).toBe(false);
  });
});

describe('toFetchUrl', () => {
  it('returns the URL as-is for https', () => {
    expect(toFetchUrl('https://example.com/file.md')).toBe(
      'https://example.com/file.md',
    );
  });

  it('expands github: shorthand to a raw GitHub URL', () => {
    expect(toFetchUrl('github:mshima/generator-parse')).toBe(
      'https://raw.githubusercontent.com/mshima/generator-parse/HEAD/README.md',
    );
  });

  it('throws on unsupported URL protocol', () => {
    expect(() => toFetchUrl('ftp://example.com/file.md')).toThrow(
      'Unsupported protocol "ftp:"',
    );
  });
});

describe('resolveLocalTemplate', () => {
  it('reads a local template file by name (without extension)', () => {
    const content = resolveLocalTemplate('example', TEMPLATE_DIR);
    expect(content).toContain('```liquid');
  });

  it('reads a local template file by name (with .md extension)', () => {
    const content = resolveLocalTemplate('example.md', TEMPLATE_DIR);
    expect(content).toContain('```liquid');
  });

  it('throws when the local template is not found', () => {
    expect(() =>
      resolveLocalTemplate('nonexistent-template', TEMPLATE_DIR),
    ).toThrow('Template "nonexistent-template" not found');
  });
});

describe('sanitizeBlockFilename', () => {
  it('accepts a simple relative filename', () => {
    expect(() => sanitizeBlockFilename('src/index.ts')).not.toThrow();
  });

  it('accepts a nested relative path', () => {
    expect(() => sanitizeBlockFilename('a/b/c/file.json')).not.toThrow();
  });

  it('throws on an absolute path', () => {
    expect(() => sanitizeBlockFilename('/etc/passwd')).toThrow(
      'absolute paths are not allowed',
    );
  });

  it('throws on a path with a .. segment', () => {
    expect(() => sanitizeBlockFilename('../outside.ts')).toThrow(
      'parent directory traversal is not allowed',
    );
  });

  it('throws on a deeply nested .. traversal', () => {
    expect(() => sanitizeBlockFilename('src/../../secret')).toThrow(
      'parent directory traversal is not allowed',
    );
  });
});

describe('parseMarkdownBlocks (sanitization)', () => {
  it('throws when a block filename is an absolute path', () => {
    const markdown = ['```liquid /etc/passwd', 'root:x:0:0', '```'].join('\n');
    expect(() => parseMarkdownBlocks(markdown)).toThrow(
      'absolute paths are not allowed',
    );
  });

  it('throws when a block filename contains .. traversal', () => {
    const markdown = ['```liquid ../../secret.ts', 'bad content', '```'].join(
      '\n',
    );
    expect(() => parseMarkdownBlocks(markdown)).toThrow(
      'parent directory traversal is not allowed',
    );
  });
});

describe('githubToUrl (sanitization)', () => {
  it('throws when any path segment is ..', () => {
    expect(() => githubToUrl('github:user/repo/../secret')).toThrow(
      'parent directory traversal is not allowed',
    );
  });
});

describe('validateSource (sanitization)', () => {
  it('returns an error message when a github: path contains ..', () => {
    const result = validateSource('github:user/repo/../secret', '/tmp');
    expect(result).toContain('parent directory traversal is not allowed');
  });
});
