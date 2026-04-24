import Generator from 'yeoman-generator';
import type { BaseOptions } from 'yeoman-generator';
import ejs from 'ejs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdownBlocks, resolveMarkdown, validateSource } from './utils.ts';

export { type CodeBlock, parseMarkdownBlocks } from './utils.ts';

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'templates');

type KickstartOptions = BaseOptions & {
  url?: string;
};

export default class KickstartGenerator extends Generator<
  Record<string, unknown>,
  KickstartOptions
> {
  private templateUrl = '';

  constructor(args: string[] = [], opts: KickstartOptions = {} as KickstartOptions) {
    super(args, opts);
    this.argument('url', {
      type: String,
      required: false,
      description:
        'Template source: a URL, "github:user/repo[/path]", or a built-in template name',
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
        message: 'Enter the template source (URL, "github:user/repo", or template name):',
        validate: (input: string) => validateSource(input, TEMPLATES_DIR),
      },
    ]);

    this.templateUrl = answers.url;
  }

  async writing(): Promise<void> {
    this.log(`Loading template from: ${this.templateUrl}`);

    const markdown = await resolveMarkdown(this.templateUrl, TEMPLATES_DIR);
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

