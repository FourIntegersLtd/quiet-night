import { Redirect } from "expo-router";

/** Center FAB tab: redirect to Tonight (start recording flow). */
export default function RecordTab() {
  return <Redirect href="/(tabs)/tonight" />;
}
