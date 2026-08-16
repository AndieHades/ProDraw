import js from '@eslint/js';
import globals from 'globals';

const relaxed = {
  // catch(e){} — идиома в этом коде: пустой catch и неиспользуемый параметр ок
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-unused-vars': ['error', { caughtErrors: 'none', args: 'none' }],
};

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: relaxed,
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.serviceworker, ...globals.browser },
    },
    rules: relaxed,
  },
  {
    // тесты гоняются под jsdom — нужны и node, и browser глобали
    files: ['test/**/*.mjs', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: relaxed,
  },
];
