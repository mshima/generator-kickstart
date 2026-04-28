# release-please-action workflow

Summary: creates a release workflow with `release-please` and npm publishing; the `prettify-pr` job is only included when `packageJson.devDependencies.prettier` exists in the generated project.

```liquid .github/workflows/release-please.yml
name: Release Please

on:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  release-please:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    outputs:
      releases_created: ${{ steps.release.outputs.releases_created }}
      paths_released: ${{ steps.release.outputs.paths_released }}
      prs_created: ${{ steps.release.outputs.prs_created }}
      head_branch: ${{ fromJson(steps.release.outputs.pr || '{}').headBranchName }}
    steps:
      - uses: googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7 # v5.0.0
        id: release
{% if packageJson.workspaces
%}        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json{% endif
%}
{% if packageJson.devDependencies and packageJson.devDependencies.prettier
%}  prettify-pr:
    runs-on: ubuntu-latest
    needs: release-please
    if: ${{ needs.release-please.outputs.prs_created == 'true' }}
    continue-on-error: true
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ needs.release-please.outputs.head_branch }}
      - uses: actions/setup-node@v6
        with:
          node-version: 'lts/*'
      - run: npm install
      - run: npx prettier --write .
      - name: Fix prettier on Release PR
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "chore: fix code style issues"
          git push origin

{% endif
%}  publish:
    runs-on: ubuntu-latest
    needs: release-please
    if: ${{ needs.release-please.outputs.releases_created == 'true' }}
    permissions:
      contents: read
      id-token: write # Required for npm provenance
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 'lts/*'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install
      - run: npm test
      - name: Publish with provenance
{% if packageJson.workspaces
%}        run: npm publish --workspace=${{ join(fromJson(needs.release-please.outputs.paths_released), ' --workspace=') }} --provenance --access public
{% else
%}        run: npm publish --provenance --access public{% endif %}
```

```liquid .release-please-manifest.json
{
  ".": "{{{ packageJson.version }}}"
}
```

```liquid release-please-config.json
{
  "packages": {
    ".": {
      "release-type": "node"
    }
  }
}
```
