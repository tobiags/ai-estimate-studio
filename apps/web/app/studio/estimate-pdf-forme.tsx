import { renderDocument } from "@formepdf/core/browser";
import { Document, Page, StyleSheet, Text, View } from "@formepdf/react";
import type { EstimatePdfInput } from "./estimate-pdf";
import { studioLabel } from "./catalog";
import {
  defaultStudioEnvironment,
  studioEnvironmentLabel,
} from "./environments";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f7f5f0",
    color: "#222321",
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.35,
  },
  eyebrow: {
    color: "#bd633f",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  brand: {
    color: "#bd633f",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 1.2,
  },
  subtitle: {
    color: "#76746e",
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: "uppercase",
  },
  header: {
    alignItems: "flex-start",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 42,
  },
  title: {
    color: "#222321",
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.05,
    marginBottom: 8,
  },
  muted: {
    color: "#76746e",
  },
  intro: {
    marginBottom: 24,
    maxWidth: 430,
  },
  section: {
    borderTop: "1px solid #d8d4cc",
    paddingTop: 11,
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#bd633f",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.2,
    marginBottom: 9,
    textTransform: "uppercase",
  },
  row: {
    alignItems: "baseline",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 6,
    paddingTop: 6,
  },
  rowLabel: {
    color: "#4b4b47",
    flex: 1,
  },
  rowValue: {
    color: "#222321",
    fontWeight: 700,
    marginLeft: 20,
    textAlign: "right",
  },
  totalBox: {
    backgroundColor: "#222321",
    borderRadius: 3,
    color: "#f7f5f0",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    padding: 17,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  totalValue: {
    color: "#e4a178",
    fontSize: 22,
    fontWeight: 700,
  },
  footer: {
    borderTop: "1px solid #d8d4cc",
    color: "#76746e",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 34,
    paddingTop: 10,
  },
});

function euro(minor: string): string {
  return `${(Number(minor) / 100).toFixed(2).replace(".", ",")} EUR`;
}

export async function createStudioEstimatePdfForme(
  input: EstimatePdfInput,
): Promise<Uint8Array> {
  const environment = input.environment ?? defaultStudioEnvironment;
  const languageTag = input.language === "fr" ? "fr-FR" : "en-GB";
  const contactDetails = [
    input.customerName?.trim(),
    input.customerEmail?.trim(),
  ].filter(Boolean);
  const wallRows = input.configuration.walls.map((wall) => (
    <View key={`wall-${wall.id}`} style={styles.row}>
      <Text style={styles.rowLabel}>
        {wall.code} · {studioLabel(wall.code, input.language)}
      </Text>
      <Text style={styles.rowValue}>
        {input.estimate.lines.find((line) => line.code.includes(wall.code))
          ? euro(
              input.estimate.lines.find((line) => line.code.includes(wall.code))
                ?.totalAmountMinor ?? "0",
            )
          : ""}
      </Text>
    </View>
  ));
  const accessoryRows = input.configuration.accessories.map((accessory) => (
    <View key={`accessory-${accessory.id}`} style={styles.row}>
      <Text style={styles.rowLabel}>
        {accessory.code} · {studioLabel(accessory.code, input.language)}
      </Text>
      <Text style={styles.rowValue}>{accessory.targetWallId}</Text>
    </View>
  ));

  const document = (
    <Document
      title="Mobup Studio — Estimate"
      author="Mobup Studio"
      subject={
        input.language === "fr"
          ? "Estimation indicative non contractuelle"
          : "Indicative estimate only — not a contractual offer"
      }
      lang={languageTag}
      tagged
    >
      <Page size="A4" margin={46} style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MOBUP</Text>
            <Text style={styles.subtitle}>Garden studio</Text>
          </View>
          <Text style={styles.eyebrow}>Live configuration</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>
            {input.language === "fr"
              ? "Estimation du projet"
              : "Project estimate"}
          </Text>
          <Text style={styles.title}>
            {input.projectName?.trim() ||
              (input.language === "fr"
                ? "Votre studio de jardin"
                : "Your garden studio")}
          </Text>
          {contactDetails.map((detail) => (
            <Text key={detail} style={styles.muted}>
              {detail}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {input.language === "fr" ? "Configuration" : "Configuration"}
          </Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {input.configuration.baseCode} ·{" "}
              {studioLabel(input.configuration.baseCode, input.language)}
            </Text>
            <Text style={styles.rowValue}>
              {studioEnvironmentLabel(environment, input.language)}
            </Text>
          </View>
          {wallRows}
          {accessoryRows}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {input.language === "fr" ? "Récapitulatif" : "Summary"}
          </Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {input.language === "fr" ? "Sous-total HT" : "Subtotal excl. VAT"}
            </Text>
            <Text style={styles.rowValue}>
              {euro(input.estimate.subtotalMinor)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {input.language === "fr" ? "TVA" : "VAT"}
            </Text>
            <Text style={styles.rowValue}>{euro(input.estimate.taxMinor)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>
              {input.language === "fr" ? "Total TTC" : "Total incl. VAT"}
            </Text>
            <Text style={styles.totalValue}>
              {euro(input.estimate.totalMinor)}
            </Text>
          </View>
        </View>

        <Text style={styles.muted}>
          {input.language === "fr"
            ? "Estimation indicative uniquement — non contractuelle."
            : "Indicative estimate only — not a contractual offer."}
        </Text>
        <View style={styles.footer}>
          <Text>mobup.studio</Text>
          <Text>{new Intl.DateTimeFormat(languageTag).format(new Date())}</Text>
        </View>
      </Page>
    </Document>
  );

  return renderDocument(document);
}
