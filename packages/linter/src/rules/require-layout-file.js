"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Directories under app/ that contain route files must include a _layout.tsx file for Expo Router.",
      recommended: true,
    },
    messages: {
      missingLayout:
        "Directory '{{dir}}' contains route files but no _layout.tsx. Expo Router requires a layout file in each nested route directory. Create {{dir}}/_layout.tsx.",
    },
    schema: [
      {
        type: "object",
        properties: {
          appDirectory: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const appDir = options.appDirectory || "app";
    const filename = context.getFilename();
    const normalizedPath = filename.replace(/\\/g, "/");
    const appDirPattern = `/${appDir}/`;

    // Only apply to files inside the app/ directory
    if (!normalizedPath.includes(appDirPattern)) return {};

    // Skip if this file IS a layout file
    const basename = path.basename(filename);
    if (basename.startsWith("_layout")) return {};

    const fileDir = path.dirname(filename);

    // Find the app/ root to determine nesting depth
    const appIndex = normalizedPath.lastIndexOf(appDirPattern);
    const appRoot = normalizedPath.substring(
      0,
      appIndex + appDirPattern.length - 1
    );

    // Only check directories that are nested inside app/ (not app/ itself)
    if (fileDir.replace(/\\/g, "/") === appRoot) return {};

    return {
      Program() {
        // Check if the current directory has a _layout file
        const layoutExists = [
          "_layout.tsx",
          "_layout.ts",
          "_layout.jsx",
          "_layout.js",
        ].some((layoutName) => fs.existsSync(path.join(fileDir, layoutName)));

        if (!layoutExists) {
          // Get a short relative directory name for the message
          const relativeDir = path.relative(
            path.resolve(appRoot, ".."),
            fileDir
          );

          context.report({
            loc: { line: 1, column: 0 },
            messageId: "missingLayout",
            data: { dir: relativeDir },
          });
        }
      },
    };
  },
};
