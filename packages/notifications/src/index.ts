/**
 * @supa/notifications — Push notification infrastructure for Supa apps.
 *
 * @example
 * ```tsx
 * import { NotificationProvider } from "@supa/notifications";
 * import { useNotifications, useNotificationPermission, usePushToken } from "@supa/notifications/hooks";
 *
 * // In your root layout:
 * <NotificationProvider
 *   onNotificationTap={(event) => router.push(event.deepLink ?? "/")}
 *   requestPermissionDelay={5000}
 *   onTokenRegistered={(token, platform) => {
 *     // Register token with your Convex backend
 *     registerTokenMutation({ token, platform });
 *   }}
 * >
 *   {children}
 * </NotificationProvider>
 * ```
 */

// Provider
export { NotificationProvider } from "./providers";
export type { NotificationProviderProps } from "./providers";

// Hooks
export {
  useNotifications,
  useNotificationPermission,
  usePushToken,
} from "./hooks";

// Handlers
export { registerBackgroundHandler, resolveDeepLink } from "./handlers";

// Config
export { setupAndroidChannels, DEFAULT_ANDROID_CHANNELS } from "./config";

// Types
export type {
  NotificationPayload,
  NotificationData,
  NotificationTapEvent,
  NotificationProviderConfig,
  PermissionStatus,
  UseNotificationsResult,
  UseNotificationPermissionResult,
  UsePushTokenResult,
  AndroidNotificationChannel,
} from "./types";
