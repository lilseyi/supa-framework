export interface MetroConfigOptions {
  /** Absolute path to the mobile app directory (typically __dirname) */
  projectRoot: string;

  /** Workspace package names to resolve from source (e.g., ['@myapp/shared']) */
  sharedPackages?: string[];

  /** Wrap the config with NativeWind's Metro plugin */
  withNativeWind?: boolean;

  /** Wrap the config with Sentry's Metro plugin (uses getSentryExpoConfig) */
  withSentry?: boolean;

  /** Escape hatch: modify the config before NativeWind wrapping */
  extend?: (config: any) => any;
}

/**
 * Creates a complete Metro config for a pnpm monorepo with Expo.
 *
 * Handles:
 * - pnpm symlink support (`unstable_enableSymlinks`)
 * - Workspace root watchFolders (auto-detected)
 * - `nodeModulesPaths` ordering (project > workspace root)
 * - `disableHierarchicalLookup` for pnpm
 * - Shared workspace package resolution via package.json exports
 * - Optional NativeWind wrapping
 * - Optional Sentry wrapping
 * - `extend` callback for app-specific customization
 */
export function createMetroConfig(options: MetroConfigOptions): any;
