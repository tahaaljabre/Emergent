import React, { useRef, useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useTheme } from "../theme";
import { useLang } from "../i18n";
import { sharePdf, shareImage } from "../pdf";

/**
 * Bottom-sheet preview of a shareable document with two actions: share as PDF or as image.
 * `children` is the RN card that gets captured for the image; `buildHtml` produces the PDF.
 */
export function SharePreview({
  visible,
  onClose,
  title,
  buildHtml,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  buildHtml: () => string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { t } = useLang();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<"pdf" | "image" | null>(null);

  const run = async (kind: "pdf" | "image") => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "pdf") {
        await sharePdf(buildHtml(), title);
      } else {
        const uri = await captureRef(cardRef, {
          format: "png",
          quality: 0.95,
          result: Platform.OS === "web" ? "data-uri" : "tmpfile",
        });
        await shareImage(uri, title);
      }
    } catch {
      Alert.alert(t("pdf_error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        <Pressable testID="preview-backdrop" onPress={onClose} style={{ flex: 1 }} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%", paddingBottom: 30 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 6 }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: colors.onSurface, fontSize: 16, fontWeight: "700", flex: 1 }} numberOfLines={1}>{title}</Text>
            <Pressable testID="preview-close" onPress={onClose} hitSlop={10} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.muted, fontSize: 22 }}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            <View
              ref={cardRef}
              collapsable={false}
              testID="preview-card"
              style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}
            >
              {children}
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14 }}>
            <Pressable
              testID="preview-share-image"
              onPress={() => run("image")}
              disabled={!!busy}
              style={({ pressed }) => ({ flex: 1, backgroundColor: colors.surfaceTertiary, paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
            >
              {busy === "image" ? <ActivityIndicator color={colors.brandPrimary} /> : <Text style={{ color: colors.onSurfaceTertiary, fontWeight: "700", fontSize: 15 }}>🖼 {t("export_image")}</Text>}
            </Pressable>
            <Pressable
              testID="preview-share-pdf"
              onPress={() => run("pdf")}
              disabled={!!busy}
              style={({ pressed }) => ({ flex: 1, backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
            >
              {busy === "pdf" ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={{ color: colors.onBrandPrimary, fontWeight: "700", fontSize: 15 }}>📄 {t("share_pdf")}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
