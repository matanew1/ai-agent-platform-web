import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthGate } from "./features/auth/components/AuthGate";
import { I18nProvider } from "./shared/i18n/I18nProvider";
import type { Locale } from "./shared/hooks/useAppSettings";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider locale={initialLocale()}><AuthGate /></I18nProvider>
  </StrictMode>,
);

function initialLocale(): Locale {
  const locale = storedLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
  return locale;
}

function storedLocale(): Locale {
  try {
    const values = Object.keys(localStorage)
      .filter((key) => key.startsWith("ai-platform:") && key.endsWith(":settings"))
      .map((key) => JSON.parse(localStorage.getItem(key) ?? "{}"));
    return values.some((value) => value.locale === "he") ? "he" : "en";
  } catch { return "en"; }
}
