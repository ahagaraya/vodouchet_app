import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function OrderTimeline({ timeline = [] }) {
  if (!timeline.length) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.section}>Ход выполнения</Text>
      {timeline.map((step, idx) => {
        const isLast = idx === timeline.length - 1;
        const done = step.done;
        return (
          <View key={`${step.status}-${idx}`} style={styles.row}>
            <View style={styles.track}>
              <View style={[styles.dot, done ? styles.dotDone : styles.dotPending]} />
              {!isLast && <View style={[styles.line, done ? styles.lineDone : styles.linePending]} />}
            </View>
            <View style={styles.content}>
              <Text style={[styles.label, done && styles.labelDone]}>{step.label}</Text>
              {!!step.at && (
                <Text style={styles.date}>
                  {new Date(step.at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10 },
  section: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", minHeight: 48 },
  track: { width: 24, alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  dotDone: { backgroundColor: "#16a34a" },
  dotPending: { backgroundColor: "#cbd5e1", borderWidth: 2, borderColor: "#94a3b8" },
  line: { flex: 1, width: 2, marginVertical: 2 },
  lineDone: { backgroundColor: "#16a34a" },
  linePending: { backgroundColor: "#e2e8f0" },
  content: { flex: 1, paddingBottom: 12, paddingLeft: 8 },
  label: { fontSize: 15, color: "#94a3b8", fontWeight: "600" },
  labelDone: { color: "#0f172a" },
  date: { fontSize: 12, color: "#64748b", marginTop: 2 }
});
