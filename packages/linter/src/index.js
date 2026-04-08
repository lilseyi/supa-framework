"use strict";

const noUngatedNativeImport = require("./rules/no-ungated-native-import");
const routeFileNoLogic = require("./rules/route-file-no-logic");
const requireLayoutFile = require("./rules/require-layout-file");
const keyboardAwareForms = require("./rules/keyboard-aware-forms");
const platformFilePairs = require("./rules/platform-file-pairs");

const plugin = {
  meta: {
    name: "@supa/linter",
    version: "0.1.0",
  },
  rules: {
    "no-ungated-native-import": noUngatedNativeImport,
    "route-file-no-logic": routeFileNoLogic,
    "require-layout-file": requireLayoutFile,
    "keyboard-aware-forms": keyboardAwareForms,
    "platform-file-pairs": platformFilePairs,
  },
  configs: {},
};

// Recommended config (legacy format for .eslintrc)
plugin.configs.recommended = {
  plugins: ["@supa"],
  rules: {
    "@supa/no-ungated-native-import": "error",
    "@supa/route-file-no-logic": "warn",
    "@supa/require-layout-file": "warn",
    "@supa/keyboard-aware-forms": "warn",
    "@supa/platform-file-pairs": "warn",
  },
};

module.exports = plugin;
