import { StyleSheet, Text, View } from "react-native";

import { background, text } from "@/constants/theme";

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Morning Report</Text>
      <Text style={styles.subtitle}>Your snoring stats will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: text.primary,
    marginBottom: 10,
  },
  subtitle: {
    color: text.secondary,
    fontSize: 15,
  },
});
