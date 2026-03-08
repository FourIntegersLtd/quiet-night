import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { background, text, accent, gold, spacing, type, radius } from "@/constants/theme";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";

const BENEFITS = [
  { icon: "moon-outline" as const, title: "Unlimited sleep records", sub: "Track every night without limits." },
  { icon: "stats-chart-outline" as const, title: "Advanced insights", sub: "Trends, patterns, and personalized tips." },
  { icon: "cloud-download-outline" as const, title: "Export & share", sub: "Download data or share with your doctor." },
];

const PLANS = [
  { id: "yearly", name: "Yearly", price: "$49.99", per: "/year", save: "SAVE 50%", popular: true },
  { id: "monthly", name: "Monthly", price: "$9.99", per: "/month", save: null, popular: false },
  { id: "lifetime", name: "Lifetime", price: "$99", per: " one-time", save: "BEST VALUE", popular: false },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("yearly");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QuietNight Plus</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.crownWrap}>
            <Ionicons name="diamond" size={48} color={gold} />
          </View>
          <Text style={styles.heroTitle}>Sleep better, together</Text>
          <Text style={styles.heroSub}>
            Get the most out of QuietNight with unlimited records, insights, and export.
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Ionicons name={b.icon} size={24} color={accent.teal} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.plansLabel}>Choose your plan</Text>
        <View style={styles.plansRow}>
          {PLANS.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.85}
              >
                {plan.save ? (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>{plan.save}</Text>
                  </View>
                ) : null}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPer}>{plan.per}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.trialBox}>
          <Text style={styles.trialText}>Start with a 7-day free trial. Cancel anytime.</Text>
        </View>

        <PrimaryButton
          label="Start 7-day free trial"
          onPress={() => router.back()}
        />

        <GhostButton
          label="Maybe later"
          onPress={() => router.back()}
        />
      </ScrollView>
    </View>
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
  closeBtn: { marginRight: spacing.stackSm },
  headerTitle: { ...type.title, color: text.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
  hero: { alignItems: "center", marginBottom: spacing.xl },
  crownWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.stackLg,
  },
  heroTitle: { ...type.hero, color: text.primary, marginBottom: spacing.stackSm, textAlign: "center" },
  heroSub: { ...type.body, color: text.secondary, textAlign: "center", maxWidth: 280 },
  benefitsSection: { marginBottom: spacing.xl },
  benefitRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.stackLg },
  benefitIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: accent.tealSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.stackMd,
  },
  benefitText: { flex: 1 },
  benefitTitle: { ...type.titleCard, color: text.primary },
  benefitSub: { ...type.bodySmall, color: text.muted },
  plansLabel: { ...type.label, color: text.muted, marginBottom: spacing.stackMd },
  plansRow: { flexDirection: "row", gap: spacing.stackMd, marginBottom: spacing.stackLg },
  planCard: {
    flex: 1,
    padding: spacing.stackMd,
    borderRadius: radius.card,
    backgroundColor: background.secondary,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
  },
  planCardSelected: { borderColor: accent.teal, backgroundColor: accent.tealSoft },
  saveBadge: {
    position: "absolute",
    top: -8,
    backgroundColor: gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveBadgeText: { ...type.micro, color: background.primary, fontFamily: type.titleCard.fontFamily },
  planName: { ...type.body, color: text.secondary, marginBottom: 4 },
  planPrice: { ...type.title, color: text.primary },
  planPer: { ...type.caption, color: text.muted },
  trialBox: {
    padding: spacing.stackMd,
    borderRadius: radius.input,
    backgroundColor: "rgba(255,215,0,0.1)",
    marginBottom: spacing.stackLg,
  },
  trialText: { ...type.bodySmall, color: text.primary, textAlign: "center" },
});
