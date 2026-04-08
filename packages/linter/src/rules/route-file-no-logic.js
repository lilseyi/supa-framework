"use strict";

const path = require("path");

const MAX_LOGIC_LINES = 30;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Route files in app/ should be thin wrappers. Move business logic to features/ directory.",
      recommended: true,
    },
    messages: {
      tooMuchLogic:
        "Route file has {{count}} lines of logic (threshold: {{max}}). Route files should be thin — move logic into a screen component in features/ and re-export it here.",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxLines: { type: "number", minimum: 1 },
          appDirectory: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const maxLines = options.maxLines || MAX_LOGIC_LINES;
    const appDir = options.appDirectory || "app";
    const filename = context.getFilename();

    // Only apply to files inside the app/ directory
    const normalizedPath = filename.replace(/\\/g, "/");
    const appDirPattern = `/${appDir}/`;
    if (!normalizedPath.includes(appDirPattern)) return {};

    // Skip layout files — they legitimately contain configuration
    const basename = path.basename(filename);
    if (basename.startsWith("_layout")) return {};

    return {
      Program(node) {
        const sourceCode = context.getSourceCode();
        const lines = sourceCode.lines;

        // Count non-import, non-empty, non-comment lines
        let logicLineCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === "") continue;
          if (line.startsWith("import ")) continue;
          if (line.startsWith("export { ")) continue;
          if (line.startsWith("export default ")) continue;
          if (line.startsWith("//")) continue;
          if (line.startsWith("/*") || line.startsWith("*")) continue;
          logicLineCount++;
        }

        if (logicLineCount > maxLines) {
          context.report({
            node,
            messageId: "tooMuchLogic",
            data: {
              count: String(logicLineCount),
              max: String(maxLines),
            },
          });
        }
      },
    };
  },
};
