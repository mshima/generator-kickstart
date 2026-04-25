import Generator from 'yeoman-generator';
import type { BaseFeatures, BaseOptions } from 'yeoman-generator';
import { Liquid } from 'liquidjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseMarkdownBlocks,
  isRemoteSource,
  toFetchUrl,
  resolveLocalTemplate,
  validateSource,
} from './utils.ts';

export { type CodeBlock, parseMarkdownBlocks } from './utils.ts';

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'templates');

const liquid = new Liquid({ strictVariables: false, strictFilters: false });

type KickstartOptions = BaseOptions & {
  url?: string;
};

export default class KickstartGenerator extends Generator<
  Record<string, unknown>,
  KickstartOptions
> {
  private templateInput = '';
  private remoteUrl = '';

  constructor(
    args: string[] = [],
    opts: KickstartOptions = {} as KickstartOptions,
    features: BaseFeatures = {} as BaseFeatures,
  ) {
    super(args, opts, features);
    this.argument('url', {
      type: String,
      required: false,
      description:
        'Template source: a URL, "github:user/repo[/path]", or a built-in template name',
    });
  }

  async prompting(): Promise<void> {
    if (this.options.url) {
      this.templateInput = this.options.url;
    } else {
      const answers = await this.prompt<{ url: string }>([
        {
          type: 'input',
          name: 'url',
          message: 'Enter the template source (URL, "github:user/repo", or template name):',
          validate: (input: string) => validateSource(input, TEMPLATES_DIR),
        },
      ]);

      this.templateInput = answers.url;
    }

    if (isRemoteSource(this.templateInput)) {
      const fetchUrl = toFetchUrl(this.templateInput);
      const { confirmed } = await this.prompt<{ confirmed: boolean }>([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Fetch template from: ${fetchUrl}?`,
          default: true,
        },
      ]);

      if (!confirmed) {
        throw new Error('Template fetch cancelled by user.');
      }

      this.remoteUrl = fetchUrl;
    }
  }

  async writing(): Promise<void> {
    let markdown: string;

    if (this.remoteUrl) {
      this.log(`Fetching template from: ${this.remoteUrl}`);
      const response = await fetch(this.remoteUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch template: ${response.status} ${response.statusText}`,
        );
      }
      markdown = await response.text();
    } else {
      this.log(`Loading template from: ${this.templateInput}`);
      markdown = resolveLocalTemplate(this.templateInput, TEMPLATES_DIR);
    }

    const blocks = parseMarkdownBlocks(markdown);

    if (blocks.length === 0) {
      throw new Error('No Liquid code blocks found in the markdown file.');
    }

    const packageJson = this.packageJson.createProxy();
    for (const block of blocks) {
      const rendered = await liquid.parseAndRender(block.content, { packageJson });
      this.writeDestination(block.filename, rendered);
      this.log(`Writing: ${block.filename}`);
    }
  }
}
