import { describe, it, expect, vi, afterEach } from 'vitest';
import { result, createHelpers } from 'yeoman-test';

const helpers = createHelpers({
  environmentOptions: { dryRun: true },
  defaultGenerator: import.meta.resolve('../generators/app/index.ts'),
});

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

describe('ParseGenerator', () => {
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

    await helpers
      .runDefault()
      .withArguments(['https://example.com/template.md'])
      .withAnswers({ confirmed: true });

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

    await helpers
      .runDefault()
      .withArguments(['github:example/repo'])
      .withAnswers({ confirmed: true });

    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/example/repo/HEAD/README.md',
    );
    result.assertFile('src/index.ts');
    result.assertFile('README.md');
  });

  it('writes files from the built-in example template', async () => {
    await helpers.runDefault().withArguments(['example']);

    result.assertFile('package.json');
    result.assertFile('src/index.js');
    result.assertFile('README.md');
  });

  it('includes prettify-pr job in release-please-action template when prettier exists in devDependencies', async () => {
    await helpers
      .runDefault()
      .withFiles({
        'package.json': JSON.stringify(
          { devDependencies: { prettier: '^3.0.0' } },
          null,
          2,
        ),
      })
      .withArguments(['release-please-action']);

    result.assertFile('.github/workflows/release-please.yml');
    result.assertFileContent(
      '.github/workflows/release-please.yml',
      'prettify-pr:',
    );
  });

  it('omits prettify-pr job in release-please-action template when prettier is missing', async () => {
    await helpers
      .runDefault()
      .withFiles({
        'package.json': JSON.stringify({ devDependencies: {} }, null, 2),
      })
      .withArguments(['release-please-action']);

    result.assertFile('.github/workflows/release-please.yml');
    result.assertNoFileContent(
      '.github/workflows/release-please.yml',
      'prettify-pr:',
    );
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
        .runDefault()
        .withArguments(['https://example.com/missing.md'])
        .withAnswers({ confirmed: true }),
    ).rejects.toThrow('Failed to fetch template: 404 Not Found');
  });

  it('throws when the user declines the fetch confirmation', async () => {
    await expect(
      helpers
        .runDefault()
        .withArguments(['https://example.com/template.md'])
        .withAnswers({ confirmed: false }),
    ).rejects.toThrow('Template fetch cancelled by user.');
  });

  it('throws when the markdown has no Liquid blocks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '# No code blocks here\n',
      }),
    );

    await expect(
      helpers
        .runDefault()
        .withArguments(['https://example.com/empty.md'])
        .withAnswers({ confirmed: true }),
    ).rejects.toThrow('No Liquid code blocks found in the markdown file.');
  });

  it('includes release-please config when workspaces exists', async () => {
    await helpers
      .runDefault()
      .withFiles({
        'package.json': JSON.stringify(
          {
            workspaces: ['packages/*'],
            devDependencies: { prettier: '^3.0.0' },
          },
          null,
          2,
        ),
      })
      .withArguments(['release-please-action']);

    result.assertFile('.github/workflows/release-please.yml');
    result.assertFileContent(
      '.github/workflows/release-please.yml',
      'config-file: release-please-config.json',
    );
    result.assertFileContent(
      '.github/workflows/release-please.yml',
      'manifest-file: .release-please-manifest.json',
    );
  });

  it('includes workspace-aware publish command when workspaces exists', async () => {
    await helpers
      .runDefault()
      .withFiles({
        'package.json': JSON.stringify(
          {
            workspaces: ['packages/*'],
            devDependencies: {},
          },
          null,
          2,
        ),
      })
      .withArguments(['release-please-action']);

    result.assertFile('.github/workflows/release-please.yml');
    result.assertFileContent(
      '.github/workflows/release-please.yml',
      '--workspace=${{ join(fromJson(needs.release-please.outputs.paths_released)',
    );
  });

  it('omits release-please config and uses simple publish when workspaces is missing', async () => {
    await helpers
      .runDefault()
      .withFiles({
        'package.json': JSON.stringify(
          { devDependencies: { prettier: '^3.0.0' } },
          null,
          2,
        ),
      })
      .withArguments(['release-please-action']);

    result.assertFile('.github/workflows/release-please.yml');
    result.assertFileContent(
      '.github/workflows/release-please.yml',
      'npm publish --provenance --access public',
    );
    result.assertNoFileContent(
      '.github/workflows/release-please.yml',
      '--workspace=',
    );
  });
});
