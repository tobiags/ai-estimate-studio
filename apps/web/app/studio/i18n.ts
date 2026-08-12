import { studioCopy, type StudioLanguage } from "./catalog";

export type { StudioLanguage };

export function getStudioCopy(language: StudioLanguage) {
  return studioCopy[language];
}

export function toggleStudioLanguage(language: StudioLanguage): StudioLanguage {
  return language === "fr" ? "en" : "fr";
}
