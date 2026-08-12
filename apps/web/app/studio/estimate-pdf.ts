import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { StudioEstimate } from "@ai-estimate-studio/pricing-engine";
import type { StudioConfiguration } from "@ai-estimate-studio/domain";
import { studioLabel, type StudioLanguage } from "./catalog";
import {
  defaultStudioEnvironment,
  studioEnvironmentLabel,
  type StudioEnvironmentCode,
} from "./environments";

export type EstimatePdfInput = Readonly<{
  configuration: StudioConfiguration;
  estimate: StudioEstimate;
  language: StudioLanguage;
  environment?: StudioEnvironmentCode;
  projectName?: string;
  customerName?: string;
  customerEmail?: string;
}>;

const notice = Object.freeze({
  en: "Indicative estimate only - not a contractual offer.",
  fr: "Estimation indicative uniquement - non contractuelle.",
});

function euro(minor: string): string {
  return `${(Number(minor) / 100).toFixed(2).replace(".", ",")} EUR`;
}

export async function createStudioEstimatePdf(
  input: EstimatePdfInput,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle("Mobup Studio - Estimate");
  document.setAuthor("Mobup Studio");
  document.setSubject(notice[input.language]);
  document.setKeywords([
    "Mobup",
    input.environment ?? defaultStudioEnvironment,
    input.configuration.baseCode,
    ...input.configuration.walls.map((wall) => wall.code),
    ...input.configuration.accessories.map((item) => item.code),
  ]);
  const page = document.addPage([595.28, 841.89]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.14, 0.15, 0.14);
  const muted = rgb(0.46, 0.45, 0.42);
  const accent = rgb(0.72, 0.37, 0.24);
  const paper = rgb(0.96, 0.95, 0.92);
  const draw = (
    text: string,
    x: number,
    y: number,
    size: number,
    font = regular,
    color = ink,
  ) => page.drawText(text, { x, y, size, font, color });

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
    color: paper,
  });
  draw("MOBUP", 46, 785, 18, bold, accent);
  draw("GARDEN STUDIO", 46, 767, 8, bold, muted);
  draw(
    input.language === "fr" ? "ESTIMATION DU PROJET" : "PROJECT ESTIMATE",
    46,
    705,
    22,
    bold,
  );
  draw(notice[input.language], 46, 684, 9, regular, muted);
  if (input.projectName) draw(input.projectName, 46, 650, 13, bold);
  if (input.customerName) draw(input.customerName, 46, 633, 10, regular, muted);
  if (input.customerEmail)
    draw(input.customerEmail, 46, 618, 10, regular, muted);

  draw(
    input.language === "fr" ? "CONFIGURATION" : "CONFIGURATION",
    46,
    568,
    10,
    bold,
    accent,
  );
  draw(
    `${input.configuration.baseCode} · ${studioLabel(input.configuration.baseCode, input.language)}`,
    46,
    545,
    12,
    bold,
  );
  draw(
    input.language === "fr" ? "Modules de façade" : "Facade modules",
    46,
    500,
    10,
    bold,
    muted,
  );
  draw(
    `${input.language === "fr" ? "Environnement" : "Environment"} - ${studioEnvironmentLabel(input.environment ?? defaultStudioEnvironment, input.language)}`,
    46,
    526,
    10,
    regular,
    muted,
  );
  let y = 480;
  for (const wall of input.configuration.walls) {
    draw(`${wall.code} · ${studioLabel(wall.code, input.language)}`, 62, y, 10);
    y -= 18;
  }
  draw(
    input.language === "fr" ? "Détails de finition" : "Finishing details",
    46,
    y - 8,
    10,
    bold,
    muted,
  );
  y -= 30;
  for (const accessory of input.configuration.accessories) {
    draw(
      `${accessory.code} · ${studioLabel(accessory.code, input.language)} -> ${accessory.targetWallId}`,
      62,
      y,
      10,
    );
    y -= 18;
  }

  page.drawLine({
    start: { x: 46, y: 310 },
    end: { x: 549, y: 310 },
    thickness: 1,
    color: rgb(0.84, 0.83, 0.8),
  });
  draw(
    input.language === "fr" ? "Sous-total HT" : "Subtotal excl. VAT",
    46,
    280,
    10,
    regular,
    muted,
  );
  draw(euro(input.estimate.subtotalMinor), 470, 280, 10, bold);
  draw(input.language === "fr" ? "TVA" : "VAT", 46, 258, 10, regular, muted);
  draw(euro(input.estimate.taxMinor), 470, 258, 10, bold);
  draw(
    input.language === "fr" ? "TOTAL TTC" : "TOTAL incl. VAT",
    46,
    218,
    11,
    bold,
    accent,
  );
  draw(euro(input.estimate.totalMinor), 420, 211, 24, bold, accent);
  draw(notice[input.language], 46, 150, 9, regular, muted);
  draw("mobup.studio", 46, 72, 9, bold, muted);
  draw(
    new Date().toLocaleDateString(input.language === "fr" ? "fr-FR" : "en-GB"),
    468,
    72,
    9,
    regular,
    muted,
  );

  return document.save();
}
