// client/src/i18n/index.ts

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import language resources from your single `src/locales` folder
import translationEN from "../locales/en/translation.json";
import translationES from "../locales/es/translation.json";
import translationPL from "../locales/pl/translation.json";

// Use saved language or default to 'en'
const savedLng = localStorage.getItem("i18nextLng") || "en";

// Clear translation cache to force reload
localStorage.removeItem("i18next-cache");

// i18n configuration
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translationEN },
      es: { translation: translationES },
      pl: { translation: translationPL },
    },
    lng: savedLng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    react: { useSuspense: false },
  });

console.log("i18n initialized with language:", i18n.language);

export default i18n;
