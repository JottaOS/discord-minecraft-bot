import typescriptEslint from '@typescript-eslint/eslint-plugin';

const config = [
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },

    rules: {
      // caughtErrors 'none' evita lanzar errores por no utilizar la variable error en try catch
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    ignores: ['package-lock.json', 'node_modules', 'dist'],
  },
];

export default config;
