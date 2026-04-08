/**
 * Check if one or more native modules are registered in the current build.
 *
 * Accepts multiple names because some modules use different names on the
 * legacy bridge vs expo-modules-core (e.g., ExpoAV vs ExponentAV).
 *
 * Returns true if ANY of the provided module names are found.
 *
 * @param moduleNames - One or more native module names to check
 * @returns true if at least one module is available
 */
export declare function hasNativeModule(...moduleNames: string[]): boolean;
