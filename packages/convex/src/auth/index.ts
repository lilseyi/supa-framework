export { createSupaAuth } from "./setup";
export type {
  SupaAuthConfig,
  SupaAuthResendConfig,
  SupaAuthTwilioConfig,
} from "./setup";
export {
  requireAuth,
  requireAuthId,
  getOptionalAuth,
  getCurrentUserId,
} from "./helpers";
