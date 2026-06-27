// @ts-check
const base = require('../../packages/eslint-config/index.cjs');

module.exports = [
  ...base,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
];
