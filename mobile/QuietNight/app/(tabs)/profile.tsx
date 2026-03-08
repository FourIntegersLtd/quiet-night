import { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/contexts/AuthContext";
import { useAlert } from "@/contexts/AlertContext";
import { getUserById } from "@/lib/auth-store";
import {
  getRecordingsSizeMB,
  getWavFileCount,
  clearWavRecordingsOlderThanDays,
} from "@/lib/recordings";
import {
  background,
  accent,
  text,
  surface,
  radius,
  spacing,
  presets,
  type,
  fonts,
} from "@/constants/theme";
import { tourEvents } from "@/lib/tour-events";

const SUPPORT_EMAIL = "hello@fourintegers.com";
const TERMS_URL = "https://quietnight.app/terms";
const PRIVACY_URL = "https://quietnight.app/privacy";

function InviteEmailModalContent({
  partnerEmail,
  setPartnerEmail,
  inviteSending,
  onSendInvite,
  onClose,
  showCode,
  generatedCode,
  onGenerateCode,
}: {
  partnerEmail: string;
  setPartnerEmail: (s: string) => void;
  inviteSending: boolean;
  onSendInvite: () => void;
  onClose: () => void;
  showCode: boolean;
  generatedCode: string | null;
  onGenerateCode: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={[styles.modalContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.modalCloseBtn}>
          <Ionicons name="close" size={28} color={text.primary} />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Invite partner</Text>
        <Text style={styles.modalSubtitle}>
          Send a link by email or share a 6-digit code. No app install required.
        </Text>
      </View>
      <View style={styles.modalBody}>
        <Text style={styles.inviteEmailLabel}>Partner&apos;s email</Text>
        <TextInput
          style={styles.inviteEmailInput}
          placeholder="partner@example.com"
          placeholderTextColor={text.muted}
          value={partnerEmail}
          onChangeText={setPartnerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.primaryButton, inviteSending && styles.buttonDisabled]}
          onPress={onSendInvite}
          disabled={inviteSending}
        >
          <Text style={styles.primaryButtonText}>
            {inviteSending ? "Sending…" : "Send invite"}
          </Text>
        </TouchableOpacity>

        <View style={[styles.orDivider, styles.modalOrDivider]}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>Or use a code</Text>
          <View style={styles.orLine} />
        </View>
        {!showCode ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={onGenerateCode}>
            <Text style={styles.secondaryButtonText}>Generate 6-digit code</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>Share this code with your partner</Text>
            <Text style={styles.codeValue}>{generatedCode}</Text>
            <Text style={styles.codeHint}>
              They enter it under &quot;Enter partner&apos;s code&quot;
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alertApi = useAlert();
  const { user, connection, generatePartnerCode, linkWithPartner, signOut } = useAuth();
  const [storageMB, setStorageMB] = useState(0);
  const [wavCount, setWavCount] = useState(0);
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteEmailModalVisible, setInviteEmailModalVisible] = useState(false);
  const partnerUserId = connection
    ? user?.role === "SLEEPER"
      ? connection.partner_id
      : connection.sleeper_id
    : null;
  const partnerUser = partnerUserId ? getUserById(partnerUserId) : null;
  const partnerName =
    partnerUser?.first_name || partnerUser?.email?.split("@")[0] || "Partner";

  const refreshStorage = useCallback(() => {
    setStorageMB(getRecordingsSizeMB());
    setWavCount(getWavFileCount());
  }, []);

  useFocusEffect(useCallback(() => refreshStorage(), [refreshStorage]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshStorage();
    setRefreshing(false);
  }, [refreshStorage]);

  const handleGenerateCode = async () => {
    try {
      const code = await generatePartnerCode();
      setGeneratedCode(code);
      setShowCode(true);
    } catch {
      alertApi.show({ title: "Error", message: "Could not generate code. Sign in first." });
    }
  };

  const handleLinkWithPartner = async () => {
    const code = partnerCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      alertApi.show({ title: "Invalid code", message: "Enter the 6-digit code from your partner." });
      return;
    }
    setLinkLoading(true);
    try {
      await linkWithPartner(code);
      setPartnerCode("");
      alertApi.show({ title: "Connected", message: `You're now linked with your partner.` });
    } catch (e) {
      alertApi.show({ title: "Could not link", message: e instanceof Error ? e.message : "Invalid or expired code." });
    } finally {
      setLinkLoading(false);
    }
  };

  /** Invite partner by email. Backend will send the invite later. */
  const handleSendInvite = async () => {
    const email = partnerEmail.trim().toLowerCase();
    if (!email) {
      alertApi.show({ title: "Enter email", message: "Enter your partner's email address." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alertApi.show({ title: "Invalid email", message: "Enter a valid email address." });
      return;
    }
    setInviteSending(true);
    try {
      // TODO: Call backend API to send invite email (e.g. POST /partner/invite { email })
      await new Promise((r) => setTimeout(r, 600));
      alertApi.show({
        title: "Invite will be sent",
        message: `When the backend is connected, we'll send an invite link to ${email}. They can link with you without installing the app.`,
      });
      setPartnerEmail("");
      setInviteEmailModalVisible(false);
    } finally {
      setInviteSending(false);
    }
  };

  const clearOldRecordings = () => {
    alertApi.show({
      title: "Clear old recordings",
      message:
        "Delete snore audio files older than 7 days? Recent recordings and night logs (counts and dates) will stay.",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            try {
              clearWavRecordingsOlderThanDays(7);
              setStorageMB(getRecordingsSizeMB());
              setWavCount(getWavFileCount());
              alertApi.show({ title: "Done", message: "Recordings older than 7 days have been removed." });
            } catch {
              alertApi.show({ title: "Error", message: "Could not clear some files." });
            }
          },
        },
      ],
    });
  };

  const handleSignOut = () => {
    alertApi.show({
      title: "Log out",
      message: "Are you sure you want to log out?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/sign-in");
          },
        },
      ],
    });
  };

  const displayName =
    user?.first_name || user?.email?.split("@")[0] || "Guest";
  const displayEmail = user?.email ?? "Not signed in";

  const handleRateApp = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/app/quietnight/id").catch(() =>
        alertApi.show({ title: "Couldn't open store", message: "Please try again." })
      );
    } else if (Platform.OS === "android") {
      Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.quietnight.app"
      ).catch(() =>
        alertApi.show({ title: "Couldn't open store", message: "Search for QuietNight in the store." })
      );
    } else {
      alertApi.show({ title: "Rating unavailable", message: "Not available on this device." });
    }
  };

  const handleGiveFeedback = () => {
    alertApi.show({
      title: "Give feedback",
      message: "Your feedback helps us improve the app.",
      buttons: [
        { text: "Email support", onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=QuietNight Feedback`) },
        { text: "Cancel", style: "cancel" },
      ],
    });
  };

  const handleSuggestFeature = () => {
    alertApi.show({
      title: "Suggest a feature",
      message: "We'd love to hear your ideas.",
      buttons: [
        { text: "Email ideas", onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=QuietNight Feature Request`) },
        { text: "Cancel", style: "cancel" },
      ],
    });
  };

  const handleHelpSupport = () => {
    alertApi.show({
      title: "Help & support",
      message: "Need help using the app?",
      buttons: [
        { text: "Contact support", onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=QuietNight Help`) },
        { text: "Cancel", style: "cancel" },
      ],
    });
  };

  const openUrl = (url: string, fallbackTitle: string) => {
    Linking.canOpenURL(url)
      .then((supported) => { if (supported) Linking.openURL(url); else alertApi.show({ title: "Couldn't open link", message: `We couldn't open ${fallbackTitle}.` }); })
      .catch(() => alertApi.show({ title: "Couldn't open link", message: `We couldn't open ${fallbackTitle}.` }));
  };

  const handleDeleteAccount = () => {
    alertApi.show({
      title: "Delete account",
      message: "Permanently delete your account and all data? This cannot be undone.",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            alertApi.show({
              title: "Request deletion",
              message: "Email us to request account deletion. We'll process it within a few days.",
              buttons: [
                {
                  text: "Send email",
                  onPress: () => {
                    const body = `Account deletion request.\n\nUser: ${displayEmail}\n\nPlease delete my QuietNight account and all data.`;
                    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=QuietNight Account Deletion&body=${encodeURIComponent(body)}`);
                  },
                },
                { text: "Cancel", style: "cancel" },
              ],
            });
          },
        },
      ],
    });
  };

  type SettingsRowProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sublabel?: string;
    onPress: () => void;
    iconColor?: string;
    destructive?: boolean;
  };

  const SettingsRow = ({ icon, label, sublabel, onPress, iconColor = accent.primary, destructive }: SettingsRowProps) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.settingsRow}>
      <View style={[styles.settingsRowIconWrap, { backgroundColor: destructive ? "rgba(239,68,68,0.2)" : `${iconColor}20` }]}>
        <Ionicons name={icon} size={22} color={destructive ? "#f87171" : iconColor} />
      </View>
      <View style={styles.settingsRowBody}>
        <Text style={[styles.settingsRowLabel, destructive && styles.settingsRowLabelDestructive]}>{label}</Text>
        {sublabel ? <Text style={styles.settingsRowSub}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={text.muted} />
    </TouchableOpacity>
  );

  type IoniconName = keyof typeof Ionicons.glyphMap;
  const Section = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon?: IoniconName;
    children: React.ReactNode;
  }) => (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionTitleRow}>
      
        <Text style={styles.sectionLabel}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Divider = () => <View style={styles.sectionDivider} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: spacing.stackLg, paddingBottom: spacing.sectionGapLarge * 2 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent.primary}
          />
        }
      >
        <Section title="" >
          <View style={styles.accountBlock}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>
                {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.accountBody}>
              <Text style={styles.accountName}>{displayName}</Text>
              <Text style={styles.accountEmail}>{displayEmail}</Text>
            </View>
          </View>
          <Divider />
          {connection ? (
            <View style={styles.settingsRow}>
              <View style={[styles.settingsRowIconWrap, { backgroundColor: accent.tealSoft }]}>
                <Ionicons name="people" size={22} color={accent.primary} />
              </View>
              <View style={styles.settingsRowBody}>
                <Text style={styles.settingsRowLabel}>Partner</Text>
                <Text style={styles.settingsRowSub}>Linked with {partnerName}</Text>
              </View>
            </View>
          ) : user?.role === "SLEEPER" ? (
            <TouchableOpacity style={styles.settingsRow} onPress={() => setInviteEmailModalVisible(true)} activeOpacity={0.8}>
              <View style={[styles.settingsRowIconWrap, { backgroundColor: accent.tealSoft }]}>
                <Ionicons name="mail-outline" size={22} color={accent.primary} />
              </View>
              <View style={styles.settingsRowBody}>
                <Text style={styles.settingsRowLabel}>Invite partner</Text>
                <Text style={styles.settingsRowSub}>Send a link or generate a code—no app install required</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={text.muted} />
            </TouchableOpacity>
          ) : null}
          {!connection && user?.role !== "SLEEPER" && (
            <>
              <Divider />
              <View style={styles.partnerFormCard}>
                <View style={styles.enterCodeRow}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="6-digit code"
                    placeholderTextColor={text.muted}
                    value={partnerCode}
                    onChangeText={(t) => setPartnerCode(t.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, linkLoading && styles.buttonDisabled]}
                    onPress={handleLinkWithPartner}
                    disabled={linkLoading || partnerCode.length !== 6}
                  >
                    <Text style={styles.primaryButtonText}>{linkLoading ? "Linking…" : "Link"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </Section>

        <Modal
          visible={inviteEmailModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setInviteEmailModalVisible(false)}
        >
          <InviteEmailModalContent
            partnerEmail={partnerEmail}
            setPartnerEmail={setPartnerEmail}
            inviteSending={inviteSending}
            onSendInvite={handleSendInvite}
            onClose={() => setInviteEmailModalVisible(false)}
            showCode={showCode}
            generatedCode={generatedCode}
            onGenerateCode={handleGenerateCode}
          />
        </Modal>

        <Section title="Settings" >
          <SettingsRow
            icon="list-outline"
            label="Recording settings"
            sublabel="Show or skip wizard steps"
            onPress={() => alertApi.show({ title: "Recording settings", message: "Configure which wizard steps to show. Coming soon." })}
          />
          <Divider />
          <SettingsRow
            icon="moon-outline"
            label="Sleep settings"
            sublabel="Auto detection, sensitivity, default times"
            onPress={() => alertApi.show({ title: "Sleep settings", message: "Coming soon." })}
          />
          <Divider />
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            sublabel="Bedtime reminder, morning log, weekly summary"
            onPress={() => {}}
            iconColor={text.secondary}
          />
          <Divider />
          <SettingsRow
            icon="home-outline"
            label="Homepage settings"
            sublabel="Weather widget, tip of the day, last night summary"
            onPress={() => alertApi.show({ title: "Homepage settings", message: "Coming soon." })}
          />
          <Divider />
          <SettingsRow
            icon="play-circle-outline"
            label="Replay app tour"
            sublabel="See the walkthrough again"
            onPress={() => tourEvents.requestReplay()}
          />
        </Section>

        <Section title="Support & feedback" >
          <SettingsRow icon="star-outline" label="Rate QuietNight" sublabel="Leave a review" onPress={handleRateApp} iconColor="#fbbf24" />
          <Divider />
          <SettingsRow icon="chatbubble-outline" label="Give feedback" onPress={handleGiveFeedback} />
          <Divider />
          <SettingsRow icon="bulb-outline" label="Suggest a feature" onPress={handleSuggestFeature} />
          <Divider />
          <SettingsRow icon="help-circle-outline" label="Help & support" onPress={handleHelpSupport} iconColor={text.secondary} />
        </Section>

        <Section title="Legal & privacy" >
          <SettingsRow icon="document-text-outline" label="Terms and conditions" onPress={() => openUrl(TERMS_URL, "Terms")} iconColor={text.secondary} />
          <Divider />
          <SettingsRow icon="shield-checkmark-outline" label="Privacy policy" onPress={() => openUrl(PRIVACY_URL, "Privacy policy")} iconColor={text.secondary} />
          <Divider />
          <SettingsRow icon="mail-outline" label="Support email" sublabel={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} iconColor={text.secondary} />
        </Section>

        <Section title="Storage & data" >
          <TouchableOpacity style={styles.settingsRow} onPress={clearOldRecordings} disabled={wavCount === 0} activeOpacity={0.8}>
            <View style={[styles.settingsRowIconWrap, { backgroundColor: accent.tealSoft }]}>
              <Ionicons name="mic-outline" size={22} color={accent.primary} />
            </View>
            <View style={styles.settingsRowBody}>
              <Text style={styles.settingsRowLabel}>Snore recordings</Text>
              <Text style={[styles.settingsRowSub, wavCount === 0 && styles.rowSubMuted]}>
                {storageMB.toFixed(1)} MB ({wavCount} files) · Clear older than 7 days
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={text.muted} />
          </TouchableOpacity>
        </Section>

        <Section title="Account actions" >
          <SettingsRow icon="log-out-outline" label="Log out" onPress={handleSignOut} iconColor={text.secondary} />
          <Divider />
          <SettingsRow icon="person-remove-outline" label="Delete account" sublabel="Permanently remove all data" onPress={handleDeleteAccount} destructive />
        </Section>

        <Text style={styles.footerCopy}>© {new Date().getFullYear()} Four Integers. All rights reserved.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.stackLg,
    paddingBottom: spacing.stackMd,
  },
  headerMenuBtn: {
    marginRight: spacing.stackSm,
    padding: 4,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: accent.tealSoftBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    ...type.title,
    color: text.primary,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sectionGapLarge * 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,127,63,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  sectionLabel: {
    ...type.label,
    color: text.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: surface.elevated,
    overflow: "hidden",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: surface.elevated,
    marginLeft: 72,
  },
  accountBlock: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.cardPadding,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: accent.tealSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: accent.primary,
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  accountBody: { flex: 1 },
  accountName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: text.primary,
  },
  accountEmail: {
    ...type.bodySmall,
    color: text.secondary,
    marginTop: 2,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingsRowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingsRowBody: { flex: 1, minWidth: 0 },
  settingsRowLabel: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
  },
  settingsRowLabelDestructive: { color: "#f87171" },
  settingsRowSub: {
    fontSize: 13,
    color: text.secondary,
    marginTop: 2,
  },
  footerCopy: {
    textAlign: "center",
    color: text.muted,
    fontSize: 12,
    marginTop: 8,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: background.secondary,
    padding: spacing.cardPadding,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
  },
  rowSub: {
    ...type.bodySmall,
    color: text.secondary,
    marginTop: 2,
  },
  rowSubMuted: { color: text.muted },
  inviteEmailRowButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: background.secondary,
    padding: spacing.cardPadding,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: background.primary,
    paddingHorizontal: spacing.screenPadding,
  },
  modalHeader: {
    marginBottom: spacing.stackLg,
  },
  modalCloseBtn: {
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  modalTitle: {
    ...type.title,
    color: text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 20,
  },
  modalBody: {
    flex: 1,
  },
  partnerFormCard: {
    padding: spacing.cardPadding,
    borderWidth: 0,
  },
  primaryButton: {
    ...presets.buttonPrimary,
    marginBottom: 0,
  },
  primaryButtonText: presets.buttonPrimaryText,
  inviteEmailLabel: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: 8,
  },
  inviteEmailInput: {
    backgroundColor: background.primary,
    borderWidth: 1,
    borderColor: surface.elevated,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: text.primary,
    marginBottom: spacing.stackMd,
  },
  inviteEmailHint: {
    ...type.bodySmall,
    color: text.muted,
    marginBottom: spacing.stackMd,
    lineHeight: 18,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackMd,
  },
  modalOrDivider: {
    marginTop: spacing.stackLg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: surface.elevated,
  },
  orText: {
    ...type.bodySmall,
    color: text.muted,
    marginHorizontal: 10,
  },
  secondaryButton: {
    backgroundColor: surface.elevated,
    padding: 16,
    borderRadius: radius.button,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: text.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  dangerButton: {
    padding: 14,
    borderRadius: radius.button,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  dangerButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
  dangerButtonTextDisabled: {
    color: text.muted,
  },
  codeBlock: {
    paddingVertical: spacing.stackMd,
    alignItems: "center",
  },
  codeLabel: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackSm,
  },
  codeValue: {
    ...type.hero,
    color: accent.primary,
    letterSpacing: 6,
    marginBottom: spacing.stackSm,
  },
  codeHint: {
    ...type.bodySmall,
    color: text.muted,
    textAlign: "center",
    paddingHorizontal: spacing.stackLg,
  },
  enterCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.stackMd,
    flexWrap: "wrap",
  },
  codeInput: {
    ...type.body,
    flex: 1,
    minWidth: 120,
    color: text.primary,
    backgroundColor: surface.elevated,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  buttonDisabled: { opacity: 0.7 },
});
