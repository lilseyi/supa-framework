/**
 * Regex patterns that match native dependency package names.
 */
export declare const NATIVE_PACKAGE_PATTERNS: RegExp[];

/**
 * Regex that matches static import/export statements and captures the module specifier.
 */
export declare const STATIC_IMPORT_REGEX: RegExp;

/**
 * Directories to skip when scanning source files.
 */
export declare const SKIP_DIRS: Set<string>;

/**
 * File extensions to scan for import statements.
 */
export declare const SOURCE_EXTENSIONS: RegExp;

/**
 * File patterns to exclude from scanning.
 */
export declare const EXCLUDE_FILE_PATTERNS: RegExp;

/**
 * Check if a package name matches any native package pattern.
 */
export declare function isNativePackage(name: string): boolean;
