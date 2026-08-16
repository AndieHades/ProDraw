import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { architecture } from "./tools/eslint-rules/architecture.mjs";

const typescriptFiles = ["src/**/*.ts", "tests/**/*.ts", "tools/**/*.ts"];
const typescriptRecommended = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: typescriptFiles
}));

const relaxedLegacy = {
  "no-empty": ["error", { allowEmptyCatch: true }],
  "no-unused-vars": ["error", { caughtErrors: "none", args: "none" }],
  "no-useless-assignment": "off"
};

export default [
  { ignores: ["artifacts/**", "dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...typescriptRecommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest", sourceType: "module", globals: globals.browser
    },
    rules: relaxedLegacy
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      ecmaVersion: "latest", sourceType: "module",
      globals: { ...globals.serviceworker, ...globals.browser }
    },
    rules: relaxedLegacy
  },
  {
    files: ["test/**/*.mjs", "*.config.js", "desktop/**/*.{mjs,cjs}", "tools/**/*.mjs",
      ".claude/hooks/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest", sourceType: "module",
      globals: { ...globals.node, ...globals.browser }
    },
    rules: relaxedLegacy
  },
  {
    files: typescriptFiles,
    plugins: { architecture },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "max-lines": ["error", { max: 150, skipBlankLines: false, skipComments: false }],
      "architecture/no-cross-system-imports": "error",
      "architecture/no-platform-sdk-outside-platform": "error",
      "architecture/no-ui-in-core-runtime": "error",
      "architecture/no-legacy-js-in-typescript": "error",
      "architecture/no-dom-in-contracts": "error",
      "architecture/no-runtime-state-in-ui": "error",
      "architecture/systems-compose-only-in-app": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
];
