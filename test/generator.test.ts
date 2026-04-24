import { describe, it, expect, vi, afterEach } from 'vitest';
import helpers from 'yeoman-test';
import KickstartGenerator from '../generators/app/index.ts';

const MARKDOWN = [
  '# My Template',
  '',
  '```ejs src/index.ts',
  "export const hello = 'world';",
  '```',
  '',
  '```ejs README.md',
  '# Project',
  '```',
].join('\n');

describe('KickstartGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes files from EJS blocks when url is provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => MARKDOWN,
      }),
    );

    const result = await helpers
      .run(KickstartGenerator)
      .withArguments(['https://example.com/template.md']);

    result.assertFile('src/index.ts');
    result.assertFileContent('src/index.ts', "export const hello = 'world';");
    result.assertFile('README.md');
    result.assertFileContent('README.md', '# Project');
  });

  it('throws when the fetch response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }),
    );

    await expect(
      helpers
        .run(KickstartGenerator)
        .withArguments(['https://example.com/missing.md']),
    ).rejects.toThrow('Failed to fetch template: 404 Not Found');
  });

  it('succeeds silently when the markdown has no EJS blocks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '# No code blocks here\n',
      }),
    );

    const result = await helpers
      .run(KickstartGenerator)
      .withArguments(['https://example.com/empty.md']);

    expect(Object.keys(result.getSnapshot())).toHaveLength(0);
  });
});
