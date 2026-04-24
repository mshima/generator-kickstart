import { describe, it, expect, vi, afterEach } from 'vitest';
import helpers from 'yeoman-test';
import KickstartGenerator from '../generators/app/index.ts';

const MARKDOWN = [
  '# My Template',
  '',
  '```liquid src/index.ts',
  "export const hello = 'world';",
  '```',
  '',
  '```liquid README.md',
  '# Project',
  '```',
].join('\n');

describe('KickstartGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes files from Liquid blocks when a URL is provided', async () => {
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

  it('writes files when a github: shorthand is provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => MARKDOWN,
      }),
    );

    const result = await helpers
      .run(KickstartGenerator)
      .withArguments(['github:example/repo']);

    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/example/repo/HEAD/README.md',
    );
    result.assertFile('src/index.ts');
    result.assertFile('README.md');
  });

  it('writes files from the built-in example template', async () => {
    const result = await helpers
      .run(KickstartGenerator)
      .withArguments(['example']);

    result.assertFile('package.json');
    result.assertFile('src/index.js');
    result.assertFile('README.md');
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

  it('succeeds silently when the markdown has no Liquid blocks', async () => {
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
