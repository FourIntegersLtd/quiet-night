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

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alertApi = useAlert();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      alertApi.show({ title: "Missing fields", message: "Enter email and password." });
      return;
    }
    if (password !== confirmPassword) {
      alertApi.show({ title: "Passwords don't match", message: "Please confirm your password." });
      return;
    }
    if (password.length < 6) {
      alertApi.show({ title: "Password too short", message: "Use at least 6 characters." });
      return;
    }
    setLoading(true);
    try {
      const { onboarded } = await signUp(email.trim(), password);
      router.replace(onboarded ? "/(tabs)" : "/(onboarding)/paywall");
    } catch (e) {
      alertApi.show({ title: "Sign up failed", message: e instanceof Error ? e.message : "Could not create account." });
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>We&apos;ll ask a few quick questions next</Text>

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
            placeholder="Password (min 6 characters)"
            placeholderTextColor={text.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
          />
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={text.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={text.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
          />
        </View>

        <View style={styles.buttonWrap}>
          <PrimaryButton
            label="Sign up"
            onPress={handleSignUp}
            loading={loading}
          />
        </View>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
