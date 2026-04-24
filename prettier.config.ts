import type { Config } from 'prettier';

export default {
  singleQuote: true,
  trailingComma: 'all',
  plugins: ['prettier-plugin-packagejson'],
} satisfies Config;
