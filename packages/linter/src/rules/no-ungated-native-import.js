"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Find and parse native-deps.json by walking up from the given file path.
 */
function findNativeDeps(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, "native-deps.json");
    if (fs.existsSync(candidate)) {
      try {
        return JSON.parse(fs.readFileSync(candidate, "utf8"));
      } catch {
        return null;
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow static imports of gated native dependencies. Use dynamic imports or require() behind runtime checks instead.",
      recommended: true,
    },
    messages: {
      ungatedImport:
        "'{{source}}' is a gated native dependency and must not be statically imported. Use a dynamic import() or a guarded require() behind a hasNativeModule() check. If this file is a safe wrapper, add it to the allowlist in native-deps.json.",
    },
    schema: [
      {
        type: "object",
        properties: {
          nativeDepsPath: { type: "string" },
          allowedFiles: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const filename = context.getFilename();
    const fileDir = path.dirname(filename);

    // Load native-deps.json
    let nativeDeps;
    if (options.nativeDepsPath) {
      try {
        nativeDeps = JSON.parse(
          fs.readFileSync(options.nativeDepsPath, "utf8")
        );
      } catch {
        nativeDeps = null;
      }
    } else {
      nativeDeps = findNativeDeps(fileDir);
    }

    if (!nativeDeps) return {};

    // Build set of gated package names
    const gatedDeps = new Set();
    const deps = nativeDeps.dependencies || nativeDeps;
    for (const [pkg, config] of Object.entries(deps)) {
      const classification =
        typeof config === "string" ? config : config.classification;
      if (classification === "gated") {
        gatedDeps.add(pkg);
      }
    }

    if (gatedDeps.size === 0) return {};

    // Build allowlist from options and native-deps.json
    const allowedFiles = new Set(options.allowedFiles || []);
    for (const [, config] of Object.entries(deps)) {
      if (typeof config === "object" && Array.isArray(config.allowedFiles)) {
        for (const f of config.allowedFiles) {
          allowedFiles.add(f);
        }
      }
    }

    // Check if current file is in the allowlist
    for (const allowed of allowedFiles) {
      if (filename.includes(allowed)) {
        return {};
      }
    }

    /**
     * Check whether an import source matches a gated dependency.
     * Matches both exact names (e.g. "expo-av") and sub-paths (e.g. "expo-av/video").
     */
    function isGatedSource(source) {
      for (const dep of gatedDeps) {
        if (source === dep || source.startsWith(dep + "/")) {
          return true;
        }
      }
      return false;
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (isGatedSource(source)) {
          context.report({
            node,
            messageId: "ungatedImport",
            data: { source },
          });
        }
      },

      // Catch top-level require() that isn't inside an if-statement or function
      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== "require" ||
          node.arguments.length === 0 ||
          node.arguments[0].type !== "Literal"
        ) {
          return;
        }

        const source = node.arguments[0].value;
        if (!isGatedSource(source)) return;

        // Allow require() inside if-statements or function bodies (runtime guards)
        let current = node.parent;
        while (current) {
          if (
            current.type === "IfStatement" ||
            current.type === "ConditionalExpression" ||
            current.type === "FunctionDeclaration" ||
            current.type === "FunctionExpression" ||
            current.type === "ArrowFunctionExpression"
          ) {
            return; // Guarded — OK
          }
          current = current.parent;
        }

        context.report({
          node,
          messageId: "ungatedImport",
          data: { source },
        });
      },
    };
  },
};
