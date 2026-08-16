import path from "node:path";

const platformModules = new Set(["electron", "node:fs", "node:fs/promises"]);
const domContractNames = new Set([
  "Blob", "CanvasRenderingContext2D", "Document", "File", "HTMLElement",
  "HTMLCanvasElement", "IDBDatabase", "ImageData", "KeyboardEvent", "MouseEvent",
  "PointerEvent", "Window"
]);
const uiRuntimeStateTargets = [
  "/src/core/brush-library/BrushLibraryService",
  "/src/core/document/",
  "/src/core/history/TileHistory",
  "/src/core/persistence/"
];
const normalized = (value) => value.replaceAll("\\", "/");

function resolved(filename, source) {
  if (!source.startsWith(".")) return source;
  return normalized(path.resolve(path.dirname(filename), source));
}

function systemIdentity(filename) {
  const match = normalized(filename).match(/(?:^|\/)src\/systems\/([^/]+)/);
  return match?.[1]?.replace(/\.[^.]+$/, "");
}

function inSource(filename, segment) {
  return `/${normalized(filename)}`.includes(`/src/${segment}/`);
}

function isSource(filename) {
  return `/${normalized(filename)}`.includes("/src/");
}

export const architecture = {
  rules: {
    "no-cross-system-imports": {
      create(context) {
        return { ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string") return;
          const current = systemIdentity(context.filename);
          const target = systemIdentity(resolved(context.filename, source));
          if (current && target && current !== target) context.report({
            node, message: "Systems communicate through typed commands/events, not imports."
          });
        } };
      }
    },
    "no-platform-sdk-outside-platform": {
      create(context) {
        return { ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string" || !isSource(context.filename)) return;
          if (!inSource(context.filename, "platform") && platformModules.has(source)) {
            context.report({ node, message: "Platform SDKs belong behind src/platform ports." });
          }
        } };
      }
    },
    "no-ui-in-core-runtime": {
      create(context) {
        return { ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string") return;
          const owner = context.filename;
          const target = resolved(owner, source);
          if ((inSource(owner, "core") || inSource(owner, "systems")) && target.includes("/src/ui/")) {
            context.report({ node, message: "Core/runtime must not import UI." });
          }
        } };
      }
    },
    "no-legacy-js-in-typescript": {
      create(context) {
        return { ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source === "string" && context.filename.endsWith(".ts") && source.endsWith(".js")) {
            context.report({ node, message: "New TypeScript must not depend on legacy JS runtime." });
          }
        } };
      }
    },
    "no-dom-in-contracts": {
      create(context) {
        if (!inSource(context.filename, "contracts")) return {};
        return { Identifier(node) {
          if (domContractNames.has(node.name)) context.report({
            node, message: "Contracts must remain serializable and independent from DOM types."
          });
        } };
      }
    },
    "no-runtime-state-in-ui": {
      create(context) {
        return { ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string" || !inSource(context.filename, "ui")) return;
          const target = resolved(context.filename, source);
          if (uiRuntimeStateTargets.some((blocked) => target.includes(blocked))) {
            context.report({ node, message: "UI consumes view models and ports, not runtime state." });
          }
        } };
      }
    },
    "systems-compose-only-in-app": {
      create(context) {
        return { ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string" || !isSource(context.filename)) return;
          const ownerSystem = systemIdentity(context.filename);
          const targetSystem = systemIdentity(resolved(context.filename, source));
          if (targetSystem && !ownerSystem && !inSource(context.filename, "app")) {
            context.report({ node, message: "Runtime systems are composed only in src/app." });
          }
        } };
      }
    }
  }
};
