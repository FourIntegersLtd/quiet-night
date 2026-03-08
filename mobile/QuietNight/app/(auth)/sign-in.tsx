import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/contexts/AuthContext";
import { useAlert } from "@/contexts/AlertContext";
import { PrimaryButton } from "@/components/ui/buttons";
import { ScreenBackgroundWithContent } from "@/components/ScreenBackground";
import {
  accent,
  text,
  surface,
  radius,
  spacing,
  type,
} from "@/constants/theme";

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alertApi = useAlert();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      alertApi.show({ title: "Missing fields", message: "Enter email and password." });
      return;
    }
    setLoading(true);
    try {
      const { onboarded } = await signIn(email.trim(), password);
      router.replace(onboarded ? "/(tabs)" : "/(onboarding)/paywall");
    } catch (e) {
      alertApi.show({ title: "Sign in failed", message: e instanceof Error ? e.message : "Invalid email or password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackgroundWithContent>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="moon" size={36} color={accent.tealLight} />
          </View>
        </View>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to QuietNight</Text>

        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={text.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={text.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={text.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={text.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <View style={styles.buttonWrap}>
          <PrimaryButton
            label="Sign in"
            onPress={handleSignIn}
            loading={loading}
          />
        </View>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push("/(auth)/sign-up")}
          disabled={loading}
        >
          <Text style={styles.linkText}>Don&apos;t have an account? Sign up</Text>
        </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackgroundWithContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: spacing.sectionGap,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: accent.tealSoftBg,
    borderWidth: 2,
    borderColor: accent.tealGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface.elevated,
    borderRadius: radius.button,
    marginBottom: spacing.stackMd,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  inputIcon: {
    marginLeft: 16,
  },
  title: {
    ...type.title,
    color: text.primary,
    marginBottom: spacing.stackSm,
  },
  subtitle: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.sectionGapLarge,
  },
  input: {
    ...type.body,
    flex: 1,
    color: text.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
    paddingRight: 16,
  },
  buttonWrap: { marginTop: spacing.stackMd },
  link: {
    alignItems: "center",
    marginTop: spacing.stackLg,
  },
  linkText: {
    ...type.bodySmall,
    color: accent.teal,
  },
});
