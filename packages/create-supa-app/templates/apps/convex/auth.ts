import { createSupaAuth, PhoneOTP, EmailOTP } from "@supa/convex/auth";

export const { auth, signIn, signOut, store } = createSupaAuth({
  providers: [
{{AUTH_METHODS}}
  ],
});
