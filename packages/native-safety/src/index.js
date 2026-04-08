// Runtime exports — re-export patterns (JS) and hasNativeModule
// Note: hasNativeModule is TypeScript and consumed via the .ts entry point
// or compiled by the consumer's bundler. This JS entry re-exports patterns only.

const patterns = require('./patterns');

module.exports = {
  ...patterns,
};
