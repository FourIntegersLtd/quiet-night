import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import "react-native-reanimated";

import {
  Inter_400Regular,
  Inter_500Medium,
} from "@expo-google-fonts/inter";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { healthCheck, API_BASE_URL } from "@/lib/api";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  // Ping backend on app load (dev: confirms frontend is wired to API_BASE_URL)
  useEffect(() => {
    healthCheck().then((res) => {
      if (res) {
        __DEV__ && console.log("[API] Backend OK", API_BASE_URL, res);
      } else {
        __DEV__ && console.warn("[API] Backend unreachable at", API_BASE_URL);
      }
    });
  }, []);

  useEffect(() => {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    const apiKey =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

    if (apiKey) {
      Purchases.configure({ apiKey });
      __DEV__ && console.log("[RevenueCat] Configured for", Platform.OS);
    } else {
      __DEV__ && console.warn("[RevenueCat] No API key found in env");
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <AuthProvider>
            <SubscriptionProvider>
            <OnboardingProvider>
            <AlertProvider>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </ToastProvider>
            </AlertProvider>
            </OnboardingProvider>
            </SubscriptionProvider>
          </AuthProvider>
          <StatusBar style="light" />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
