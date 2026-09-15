import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { createClient, getClient, updateClient, type ServiceType } from "@/src/api";
import { Field, PrimaryButton, ScreenHeader } from "@/src/components/ui";

function toDateInput(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
function fromDateInput(v: string) {
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export default function ClientForm() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; service?: string }>();
  const isEdit = !!params.id;

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    service_type: ((params.service as ServiceType) ?? "cleaning") as ServiceType,
    contract_amount: "",
    contract_start: toDateInput(new Date().toISOString()),
    contract_end: toDateInput(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()),
  });

  const clientQ = useQuery({
    queryKey: ["client", params.id],
    queryFn: () => getClient(params.id!),
    enabled: !!params.id,
  });
  useEffect(() => {
    if (clientQ.data) {
      setForm({
        name: clientQ.data.name,
        address: clientQ.data.address,
        phone: clientQ.data.phone,
        service_type: clientQ.data.service_type,
        contract_amount: String(clientQ.data.contract_amount || ""),
        contract_start: toDateInput(clientQ.data.contract_start),
        contract_end: toDateInput(clientQ.data.contract_end),
      });
    }
  }, [clientQ.data]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        address: form.address,
        phone: form.phone,
        service_type: form.service_type,
        contract_amount: parseFloat(form.contract_amount) || 0,
        contract_start: fromDateInput(form.contract_start),
        contract_end: fromDateInput(form.contract_end),
      };
      return isEdit ? updateClient(params.id!, payload) : createClient(payload);
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
          title={isEdit ? t("edit_client") : t("add_client")}
          left={
            <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: colors.brandPrimary, fontSize: 22 }}>{isRTL ? "›" : "‹"}</Text>
            </Pressable>
          }
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Pressable testID="type-cleaning" onPress={() => setForm({ ...form, service_type: "cleaning" })} style={[styles.seg, form.service_type === "cleaning" && styles.segActive]}>
            <Text style={[styles.segText, form.service_type === "cleaning" && styles.segTextActive]}>{t("cleaning")}</Text>
          </Pressable>
          <Pressable testID="type-security" onPress={() => setForm({ ...form, service_type: "security" })} style={[styles.seg, form.service_type === "security" && styles.segActive]}>
            <Text style={[styles.segText, form.service_type === "security" && styles.segTextActive]}>{t("security")}</Text>
          </Pressable>
        </View>

        <Field label={t("client_name")} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} testID="input-name" />
        <Field label={t("address")} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} testID="input-address" />
        <Field label={t("phone")} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" testID="input-phone" />
        <Field label={t("contract_amount")} value={form.contract_amount} onChangeText={(v) => setForm({ ...form, contract_amount: v })} keyboardType="numeric" testID="input-amount" />
        <Field label={t("contract_start") + " (YYYY-MM-DD)"} value={form.contract_start} onChangeText={(v) => setForm({ ...form, contract_start: v })} testID="input-start" />
        <Field label={t("contract_end") + " (YYYY-MM-DD)"} value={form.contract_end} onChangeText={(v) => setForm({ ...form, contract_end: v })} testID="input-end" />

        <PrimaryButton
          testID="save-client"
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
