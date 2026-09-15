import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { createEmployee, getEmployee, updateEmployee, type ServiceType } from "@/src/api";
import { Field, PrimaryButton, ScreenHeader } from "@/src/components/ui";

export default function EmployeeForm() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;

  const [form, setForm] = useState({
    name: "",
    role: "cleaning" as ServiceType,
    assignment: "",
    phone: "",
    salary: "",
  });

  const q = useQuery({
    queryKey: ["employee", params.id],
    queryFn: () => getEmployee(params.id!),
    enabled: !!params.id,
  });
  useEffect(() => {
    if (q.data) {
      setForm({ name: q.data.name, role: q.data.role, assignment: q.data.assignment, phone: q.data.phone, salary: String(q.data.salary || "") });
    }
  }, [q.data]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        assignment: form.assignment,
        phone: form.phone,
        salary: parseFloat(form.salary) || 0,
      };
      return isEdit ? updateEmployee(params.id!, payload) : createEmployee(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title={isEdit ? t("edit_employee") : t("add_employee")}
          left={
            <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: colors.brandPrimary, fontSize: 22 }}>{isRTL ? "›" : "‹"}</Text>
            </Pressable>
          }
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Pressable testID="role-cleaning" onPress={() => setForm({ ...form, role: "cleaning" })} style={[styles.seg, form.role === "cleaning" && styles.segActive]}>
            <Text style={[styles.segText, form.role === "cleaning" && styles.segTextActive]}>{t("cleaning")}</Text>
          </Pressable>
          <Pressable testID="role-security" onPress={() => setForm({ ...form, role: "security" })} style={[styles.seg, form.role === "security" && styles.segActive]}>
            <Text style={[styles.segText, form.role === "security" && styles.segTextActive]}>{t("security")}</Text>
          </Pressable>
        </View>

        <Field label={t("employee_name")} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} testID="emp-input-name" />
        <Field label={t("assignment")} value={form.assignment} onChangeText={(v) => setForm({ ...form, assignment: v })} testID="emp-input-assignment" />
        <Field label={t("phone")} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" testID="emp-input-phone" />
        <Field label={t("salary")} value={form.salary} onChangeText={(v) => setForm({ ...form, salary: v })} keyboardType="numeric" testID="emp-input-salary" />

        <PrimaryButton
          testID="save-employee"
          title={t("save")}
          onPress={() => mut.mutate()}
          disabled={!form.name.trim() || mut.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  seg: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  segActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  segText: { color: c.onSurfaceTertiary, fontWeight: "600" },
  segTextActive: { color: c.onBrandPrimary },
}));
