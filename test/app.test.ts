import { describe, it, expect, vi, afterEach } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseMarkdownBlocks,
  githubToUrl,
  resolveMarkdown,
  type CodeBlock,
} from '../generators/app/utils.ts';

const TEMPLATE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../generators/app/templates',
);

describe('parseMarkdownBlocks', () => {
  it('parses a single EJS code block with filename', () => {
    const markdown = [
      '# My Template',
      '',
      '```ejs src/index.ts',
      "const hello = 'world';",
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].filename).toBe('src/index.ts');
    expect(blocks[0].content).toBe("const hello = 'world';\n");
  });

  it('parses multiple EJS code blocks', () => {
    const markdown = [
      '```ejs src/a.ts',
      'const a = 1;',
      '```',
      '',
      '```ejs src/b.ts',
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

  it('ignores non-EJS code blocks', () => {
    const markdown = [
      '```typescript src/index.ts',
      "const hello = 'world';",
      '```',
      '',
      '```ejs src/template.ejs',
      '<%= name %>',
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].filename).toBe('src/template.ejs');
  });

  it('returns empty array when no EJS blocks are found', () => {
    const markdown = '# No code blocks here\n\nJust some text.\n';

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(0);
  });

  it('parses a code block with nested path', () => {
    const markdown = [
      '```ejs deeply/nested/path/file.json',
      '{ "key": "value" }',
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].filename).toBe('deeply/nested/path/file.json');
  });

  it('renders EJS expressions in code blocks', async () => {
    const { default: ejs } = await import('ejs');
    const markdown = [
      '```ejs src/greeting.ts',
      "const msg = '<%= greeting %>';",
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(markdown);
    const rendered = ejs.render(blocks[0].content, { greeting: 'hello' });

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
    expect(githubToUrl('github:mshima/generator-kickstart')).toBe(
      'https://raw.githubusercontent.com/mshima/generator-kickstart/HEAD/README.md',
    );
  });

  it('converts github:user/repo/path to a raw URL for that path', () => {
    expect(githubToUrl('github:mshima/generator-kickstart/docs/guide.md')).toBe(
      'https://raw.githubusercontent.com/mshima/generator-kickstart/HEAD/docs/guide.md',
    );
  });

  it('throws on an invalid github shorthand (no repo)', () => {
    expect(() => githubToUrl('github:user')).toThrow(
      'Invalid github shorthand "github:user"',
    );
  });
});

describe('resolveMarkdown', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches a plain https URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => '# content' }),
    );

    const result = await resolveMarkdown('https://example.com/file.md', TEMPLATE_DIR);
    expect(result).toBe('# content');
    expect(fetch).toHaveBeenCalledWith('https://example.com/file.md');
  });

  it('expands github: shorthand and fetches the raw URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => '# readme' }),
    );

    await resolveMarkdown('github:mshima/generator-kickstart', TEMPLATE_DIR);
    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/mshima/generator-kickstart/HEAD/README.md',
    );
  });

  it('reads a local template file by name (without extension)', async () => {
    const content = await resolveMarkdown('example', TEMPLATE_DIR);
    expect(content).toContain('```ejs');
  });

  it('reads a local template file by name (with .md extension)', async () => {
    const content = await resolveMarkdown('example.md', TEMPLATE_DIR);
    expect(content).toContain('```ejs');
  });

  it('throws when the local template is not found', async () => {
    await expect(
      resolveMarkdown('nonexistent-template', TEMPLATE_DIR),
    ).rejects.toThrow('Template "nonexistent-template" not found');
  });

  it('throws when fetch returns a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }),
    );

    await expect(
      resolveMarkdown('https://example.com/missing.md', TEMPLATE_DIR),
    ).rejects.toThrow('Failed to fetch template: 404 Not Found');
  });

  it('throws on unsupported URL protocol', async () => {
    await expect(
      resolveMarkdown('ftp://example.com/file.md', TEMPLATE_DIR),
    ).rejects.toThrow('Unsupported protocol "ftp:"');
  });
});
