import { Linter } from "eslint";
import { architecture } from "./eslint-rules/architecture.mjs";

const linter = new Linter();
const config = [{
  files: ["**/*.ts"],
  plugins: { architecture },
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
  rules: {
    "architecture/no-cross-system-imports": "error",
    "architecture/no-platform-sdk-outside-platform": "error",
    "architecture/no-ui-in-core-runtime": "error",
    "architecture/no-legacy-js-in-typescript": "error",
    "max-lines": ["error", { max: 150 }]
  }
}];

const fixtures = [
  {
    name: "cross-system import",
    file: "src/systems/drawing/index.ts",
    code: "import '../layers/index';",
    rule: "architecture/no-cross-system-imports"
  },
  {
    name: "platform SDK in core",
    file: "src/core/file.ts",
    code: "import 'electron';",
    rule: "architecture/no-platform-sdk-outside-platform"
  },
  {
    name: "UI import in runtime",
    file: "src/systems/drawing/index.ts",
    code: "import '../../ui/panel';",
    rule: "architecture/no-ui-in-core-runtime"
  },
  {
    name: "legacy dependency",
    file: "src/core/new.ts",
    code: "import './old.js';",
    rule: "architecture/no-legacy-js-in-typescript"
  },
  {
    name: "line limit",
    file: "src/core/long.ts",
    code: Array.from({ length: 151 }, (_, index) => `const v${index} = ${index};`).join("\n"),
    rule: "max-lines"
  }
];

for (const fixture of fixtures) {
  const messages = linter.verify(fixture.code, config, { filename: fixture.file });
  if (!messages.some((message) => message.ruleId === fixture.rule)) {
    console.error(`Architecture fixture did not fail: ${fixture.name}`);
    console.error(JSON.stringify(messages, null, 2));
    process.exit(1);
  }
}
console.log(`${fixtures.length} architecture and style rejection fixtures passed.`);
