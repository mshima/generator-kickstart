# generator-kickstart

A [Yeoman](https://yeoman.io) generator that bootstraps a project from a markdown file containing fenced [Liquid](https://liquidjs.com) code blocks.

## Usage

```sh
npx yo kickstart [source]
```

`source` can be:

| Form | Description |
|------|-------------|
| `https://example.com/template.md` | Any `https://` or `http://` URL |
| `github:user/repo` | Fetches `README.md` from the GitHub repo's default branch |
| `github:user/repo/path/to/file.md` | Fetches a specific file from a GitHub repo |
| `example` | Built-in template bundled with the generator (see [Templates](#templates)) |

If `source` is omitted, the generator will prompt for it interactively.  When the source is a remote
URL or `github:` shorthand, the generator will ask for confirmation before making any network request.

## Template data

The following variables are available in every Liquid template block:

| Variable | Type | Description |
|----------|------|-------------|
| `packageJson` | object proxy | Live proxy over the destination `package.json`. Useful for reading the project name, version, or existing dependencies. |

Example:

```liquid package.json
{
  "name": "{{ packageJson.name | default: 'my-project' }}",
  "version": "{{ packageJson.version | default: '0.0.1' }}"
}
```

## Template format

The markdown file may contain any text. Only fenced code blocks tagged with `liquid` and a filename are processed.

> **Note on Liquid delimiters:** The generator uses custom delimiters for Liquid output: `{{{` and `}}}` instead of the standard `{{` and `}}`. This allows expressions (which use `{{ ... }}`) to pass through unchanged in generated workflow files without requiring `{% raw %}` blocks.

````markdown
# My Project

Some description here.

```liquid package.json
{
  "name": "my-project",
  "version": "1.0.0"
}
```

```liquid src/index.ts
export const greeting = '{{ name }}';
```
````

Each block is rendered through [LiquidJS](https://liquidjs.com) and written to the destination path.

> **Why Liquid instead of EJS?**  EJS is the default templating engine used by Yeoman's own scaffolding
> helpers, but it executes arbitrary JavaScript (`<% ... %>` scriptlets), which makes it unsafe for
> templates fetched from untrusted sources.  LiquidJS is sandboxed by design — it can only perform
> data transformations via `{{ variable }}` and `{% tag %}` syntax and has no access to the Node.js
> runtime.

## Templates

Built-in templates live in `generators/app/templates/`. Pass the filename (with or without `.md`) as the `source` argument:

| Name | Description |
|------|-------------|
| `example` | Minimal project with `package.json`, `src/index.js`, and `README.md` |

## Examples

```sh
# From a public URL
yo kickstart https://raw.githubusercontent.com/mshima/generator-kickstart/main/generators/app/templates/example.md

# From a GitHub repo (README.md)
yo kickstart github:mshima/generator-kickstart

# From a specific file in a GitHub repo
yo kickstart github:mshima/generator-kickstart/generators/app/templates/example.md

# Using a built-in template
yo kickstart example
```

## Development

```sh
npm test         # run tests
npm run lint     # eslint
npm run format   # prettier
npm run coverage # vitest coverage
```
