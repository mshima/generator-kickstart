import { describe, it, expect } from 'vitest';
import {
  parseMarkdownBlocks,
  type CodeBlock,
} from '../generators/app/index.ts';

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
