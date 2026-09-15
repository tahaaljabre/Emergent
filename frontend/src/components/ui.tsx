import { View, Text, Pressable, StyleSheet, TextInput, Modal, ScrollView } from "react-native";
import React from "react";
import { useTheme, makeStyles } from "../theme";
import { useLang } from "../i18n";

export function Badge({ tone, label, testID }: { tone: "success" | "warning" | "error" | "info"; label: string; testID?: string }) {
  const { colors } = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    success: { bg: colors.successBg, fg: colors.onSuccessBg },
    warning: { bg: colors.warningBg, fg: colors.onWarningBg },
    error: { bg: colors.errorBg, fg: colors.onErrorBg },
    info: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
  };
  const c = map[tone];
  return (
    <View testID={testID} style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, testID, style }: any) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: disabled ? colors.surfaceTertiary : colors.brandPrimary,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 12,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: disabled ? colors.muted : colors.onBrandPrimary, fontWeight: "700", fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, testID, style }: any) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surfaceTertiary,
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 12,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.onSurfaceTertiary, fontWeight: "600", fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  testID,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
  testID?: string;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  const { isRTL } = useLang();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6, writingDirection: isRTL ? "rtl" : "ltr" }}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        style={{
          backgroundColor: colors.surfaceTertiary,
          color: colors.onSurface,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          borderWidth: 1,
          borderColor: colors.border,
          textAlign: isRTL ? "right" : "left",
          minHeight: multiline ? 80 : undefined,
        }}
      />
    </View>
  );
}

export function ConfirmSheet({
  visible,
  title,
  onConfirm,
  onCancel,
  destructive,
  confirmLabel,
  cancelLabel,
}: {
  visible: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  confirmLabel: string;
  cancelLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}
        >
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ color: colors.onSurface, fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 20 }}>{title}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SecondaryButton title={cancelLabel} onPress={onCancel} style={{ flex: 1 }} testID="confirm-cancel" />
            <Pressable
              testID="confirm-yes"
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: destructive ? colors.error : colors.brandPrimary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SelectField({
  label,
  value,
  placeholder,
  options,
  onSelect,
  testID,
  allowCustom,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { label: string; value: string; sub?: string }[];
  onSelect: (v: string) => void;
  testID?: string;
  allowCustom?: { customValue: string; onChangeCustom: (v: string) => void; customLabel: string };
}) {
  const { colors } = useTheme();
  const { isRTL } = useLang();
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6, writingDirection: isRTL ? "rtl" : "ltr" }}>{label}</Text>
      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.surfaceTertiary,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: value ? colors.onSurface : colors.muted, fontSize: 15, flex: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginStart: 8 }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 34, maxHeight: "75%" }}
          >
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 12 }} />
            <Text style={{ color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 12 }}>{label}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.length === 0 ? (
                <Text testID="select-empty" style={{ color: colors.muted, textAlign: "center", padding: 20 }}>—</Text>
              ) : (
                options.map((o) => {
                  const selected = o.value === value;
                  return (
                    <Pressable
                      key={o.value}
                      testID={`select-opt-${o.value}`}
                      onPress={() => {
                        onSelect(o.value);
                        setOpen(false);
                      }}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        marginBottom: 6,
                        backgroundColor: selected ? colors.brandTertiary : colors.surfaceSecondary,
                        borderWidth: 1,
                        borderColor: selected ? colors.brandPrimary : colors.border,
                      }}
                    >
                      <Text style={{ color: selected ? colors.onBrandTertiary : colors.onSurface, fontWeight: "600", fontSize: 14 }}>{o.label}</Text>
                      {o.sub ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{o.sub}</Text> : null}
                    </Pressable>
                  );
                })
              )}
              {allowCustom ? (
                <View style={{ marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>{allowCustom.customLabel}</Text>
                  <TextInput
                    testID="select-custom-input"
                    value={allowCustom.customValue}
                    onChangeText={allowCustom.onChangeCustom}
                    placeholderTextColor={colors.muted}
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.onSurface,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                  <Pressable
                    testID="select-custom-confirm"
                    onPress={() => {
                      onSelect(allowCustom.customValue);
                      setOpen(false);
                    }}
                    style={{ marginTop: 8, backgroundColor: colors.brandPrimary, padding: 10, borderRadius: 10, alignItems: "center" }}
                  >
                    <Text style={{ color: colors.onBrandPrimary, fontWeight: "700" }}>OK</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function ActionSheet({
  visible,
  title,
  actions,
  onCancel,
  cancelLabel,
}: {
  visible: boolean;
  title: string;
  actions: { label: string; onPress: () => void; destructive?: boolean; testID?: string }[];
  onCancel: () => void;
  cancelLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 34 }}
        >
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 12 }} />
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginBottom: 16 }}>{title}</Text>
          {actions.map((a, i) => (
            <Pressable
              key={i}
              testID={a.testID}
              onPress={a.onPress}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 8,
                backgroundColor: a.destructive ? colors.errorBg : colors.surfaceSecondary,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: a.destructive ? colors.onErrorBg : colors.onSurface, fontWeight: "700", fontSize: 15 }}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable
            testID="action-cancel"
            onPress={onCancel}
            style={({ pressed }) => ({
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 4,
              backgroundColor: colors.surfaceTertiary,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: colors.onSurface, fontWeight: "600", fontSize: 15 }}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, marginTop: 8 }}>
      <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: "700" }}>{title}</Text>
      {action}
    </View>
  );
}

export function EmptyState({ title, testID }: { title: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ padding: 40, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 28, color: colors.onBrandTertiary }}>◈</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{title}</Text>
    </View>
  );
}

export function ScreenHeader({ title, right, left }: { title: string; right?: React.ReactNode; left?: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useHeaderStyles();
  return (
    <View style={styles.wrap}>
      <View style={{ width: 40, alignItems: "flex-start" }}>{left}</View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={{ width: 40, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

const useHeaderStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: c.onSurface },
}));
