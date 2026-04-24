import Generator from 'yeoman-generator';
import type { BaseOptions } from 'yeoman-generator';
import ejs from 'ejs';

export interface CodeBlock {
  filename: string;
  content: string;
}

/**
 * Parses a markdown string and extracts EJS code blocks with their associated
 * filenames. Code blocks must be fenced with triple backticks, use `ejs` as
 * the language identifier, and include the target filename on the same line:
 *
 * ```ejs path/to/file.ts
 * template content
 * ```
 */
export function parseMarkdownBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /^```ejs[ \t]+(\S+)[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      filename: match[1],
      content: match[2],
    });
  }

  return blocks;
}

type KickstartOptions = BaseOptions & {
  url?: string;
};

export default class KickstartGenerator extends Generator<
  Record<string, unknown>,
  KickstartOptions
> {
  private templateUrl = '';

  constructor(args: string[], opts: KickstartOptions) {
    super(args, opts);

    this.argument('url', {
      type: String,
      required: false,
      description: 'URL to a markdown file containing EJS code blocks',
    });
  }

  async prompting(): Promise<void> {
    if (this.options.url) {
      this.templateUrl = this.options.url;
      return;
    }

    const answers = await this.prompt<{ url: string }>([
      {
        type: 'input',
        name: 'url',
        message: 'Enter the URL to the markdown template file:',
        validate: (input: string) =>
          input.trim().length > 0 || 'URL is required',
      },
    ]);

    this.templateUrl = answers.url;
  }

  async writing(): Promise<void> {
    this.log(`Fetching template from: ${this.templateUrl}`);

    const response = await fetch(this.templateUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch template: ${response.status} ${response.statusText}`,
      );
    }

    const markdown = await response.text();
    const blocks = parseMarkdownBlocks(markdown);

    if (blocks.length === 0) {
      this.log('No EJS code blocks found in the markdown file.');
      return;
    }

    for (const block of blocks) {
      const rendered = ejs.render(block.content, {});
      const destPath = this.destinationPath(block.filename);
      this.fs.write(destPath, rendered);
      this.log(`Writing: ${block.filename}`);
    }
  }
}
