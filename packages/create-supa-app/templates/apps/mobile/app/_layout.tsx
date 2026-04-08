import { useEffect } from "react";
import { Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConvexProvider } from "@supa/core/convex";
{{PROVIDER_IMPORTS}}

// Prevent splash screen from auto-hiding before providers are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ConvexProvider>
{{PROVIDER_OPEN}}
              <StatusBar style="auto" />
              <Slot />
{{PROVIDER_CLOSE}}
    </ConvexProvider>
  );
}
