import { useState, useCallback, useEffect } from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { WelcomeTourModal } from "@/components/WelcomeTourModal";
import { ScreenBackgroundWithContent } from "@/components/ScreenBackground";
import { DrawerProvider } from "@/contexts/DrawerContext";
import { HeaderDrawerButton } from "@/components/HeaderDrawerButton";
import { tabBar, text, type, background, spacing } from "@/constants/theme";
import { STORAGE_KEYS } from "@/constants/app";
import { getStorage } from "@/lib/storage";
import { tourEvents } from "@/lib/tour-events";

const TAB_BAR_HEIGHT = 64;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [showTour, setShowTour] = useState(() =>
    getStorage().getString(STORAGE_KEYS.APP_TOUR_SEEN) !== "true"
  );

  useEffect(() => {
    return tourEvents.subscribe(() => {
      getStorage().delete(STORAGE_KEYS.APP_TOUR_SEEN);
      setShowTour(true);
    });
  }, []);

  const handleTourComplete = useCallback(() => {
    getStorage().set(STORAGE_KEYS.APP_TOUR_SEEN, "true");
    setShowTour(false);
  }, []);

  return (
    <>
      <WelcomeTourModal visible={showTour} onComplete={handleTourComplete} />
      <ScreenBackgroundWithContent style={{ flex: 1 }}>
        <DrawerProvider>
        <Tabs
          screenOptions={{
            headerShown: true,
            headerLeft: () => <HeaderDrawerButton />,
            headerStatusBarHeight: insets.top,
            headerStyle: {
              backgroundColor: background.primary,
              borderBottomWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTitleStyle: {
              ...type.title,
              color: text.primary,
            },
            headerTitleAlign: "center",
            headerShadowVisible: false,
            tabBarStyle: {
              backgroundColor: tabBar.backgroundColor,
              borderTopWidth: tabBar.borderTopWidth,
              borderTopColor: tabBar.borderTopColor,
              height: TAB_BAR_HEIGHT,
              paddingHorizontal: spacing.lg,
            },
            tabBarShowLabel: true,
            tabBarLabelStyle: { ...type.labelSm },
            tabBarActiveTintColor: tabBar.activeTintColor,
            tabBarInactiveTintColor: tabBar.inactiveTintColor,
            tabBarIconStyle: { marginBottom: 0 },
          }}
        >
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen
            name="tonight"
            options={{
              title: "Tonight",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "home" : "home-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen name="record" options={{ href: null }} />
          <Tabs.Screen
            name="nights"
            options={{
              title: "Nights",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "calendar" : "calendar-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="journey"
            options={{
              title: "Journey",
              headerShown: false,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "trending-up" : "trending-up-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen name="explore" options={{ href: null }} />
          <Tabs.Screen name="paywall" options={{ href: null }} />
          <Tabs.Screen name="stats" options={{ href: null }} />
        </Tabs>
        </DrawerProvider>
      </ScreenBackgroundWithContent>
    </>
  );
}
