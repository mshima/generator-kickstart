import { describe, it, vi, afterEach, expect } from 'vitest';
import { result, createHelpers } from 'yeoman-test';

const helpers = createHelpers({
  environmentOptions: { dryRun: true },
  defaultGenerator: import.meta.resolve('../generators/app/index.ts'),
});

describe('ParseGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  it('matches snapshot when workspaces exist', async () => {
    await helpers
      .runDefault()
      .withFiles({
        'package.json': JSON.stringify(
          {
            workspaces: ['packages/a', 'packages/b'],
            devDependencies: { prettier: '^3.0.0' },
          },
          null,
          2,
        ),
      })
      .withArguments(['release-please-action']);

    expect(result.getSnapshot()).toMatchSnapshot();
  });

  it('includes release-please config when workspaces exists', async () => {
    await helpers
      .runDefault()
      .withFiles({
        'package.json': JSON.stringify(
          {
            workspaces: ['packages/a', 'packages/b'],
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
      '--workspace=${{ join(fromJson(needs.release-please.outputs.paths_released)',
    );
    result.assertFileContent(
      '.github/workflows/release-please.yml',
      'config-file: release-please-config.json',
    );
    result.assertFileContent(
      '.github/workflows/release-please.yml',
      'manifest-file: .release-please-manifest.json',
    );
    result.assertFileContent('release-please-config.json', '"packages/a": {}');
    result.assertFileContent('release-please-config.json', '"packages/b": {}');
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
