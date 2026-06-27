// @ts-check
const base = require('../../packages/eslint-config/react.cjs');

module.exports = [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
];
