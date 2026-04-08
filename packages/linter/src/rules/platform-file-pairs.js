"use strict";

const fs = require("fs");
const path = require("path");

/**
 * APIs that indicate native-only code requiring a web counterpart.
 */
const NATIVE_ONLY_IMPORTS = new Set([
  "NativeModules",
  "NativeEventEmitter",
  "requireNativeComponent",
  "UIManager",
  "PermissionsAndroid",
  "ToastAndroid",
  "BackHandler",
  "Vibration",
  "AccessibilityInfo",
  "Alert",
]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Files that use native-only React Native APIs should have a .web.ts counterpart for cross-platform compatibility.",
      recommended: true,
    },
    messages: {
      missingWebPair:
        "This file uses native-only API '{{api}}' but has no web counterpart. Create '{{webFile}}' with a web-compatible implementation or no-op fallback.",
    },
    schema: [
      {
        type: "object",
        properties: {
          additionalNativeAPIs: {
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

    // Skip files that are already web variants
    if (/\.web\.[jt]sx?$/.test(filename)) return {};

    // Skip test files
    if (/\.(test|spec)\.[jt]sx?$/.test(filename)) return {};

    // Build the full set of native-only APIs
    const nativeAPIs = new Set(NATIVE_ONLY_IMPORTS);
    if (options.additionalNativeAPIs) {
      for (const api of options.additionalNativeAPIs) {
        nativeAPIs.add(api);
      }
    }

    // Determine the expected web counterpart filename
    const ext = path.extname(filename);
    const baseName = filename.slice(0, -ext.length);
    const webFileName = `${baseName}.web${ext}`;
    const shortWebName = path.basename(webFileName);

    let foundNativeAPI = null;

    return {
      ImportDeclaration(node) {
        if (foundNativeAPI) return; // Already found one

        const source = node.source.value;
        if (source !== "react-native") return;

        for (const specifier of node.specifiers) {
          const importedName =
            specifier.type === "ImportSpecifier"
              ? specifier.imported.name
              : null;

          if (importedName && nativeAPIs.has(importedName)) {
            foundNativeAPI = importedName;
            break;
          }
        }
      },

      "Program:exit"() {
        if (!foundNativeAPI) return;

        // Check if web counterpart exists
        const webExists = [".ts", ".tsx", ".js", ".jsx"].some((webExt) => {
          const candidate = `${baseName}.web${webExt}`;
          return fs.existsSync(candidate);
        });

        if (!webExists) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: "missingWebPair",
            data: {
              api: foundNativeAPI,
              webFile: shortWebName,
            },
          });
        }
      },
    };
  },
};
