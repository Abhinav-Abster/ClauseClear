"use client";

import React from "react";
import { SupportedLanguage } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import { AlertTriangle } from "lucide-react";

interface DisclaimerBannerProps {
  language: SupportedLanguage;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ language }) => {
  const t = UI_TRANSLATIONS[language];

  return (
    <aside
      aria-label={t.disclaimerTitle}
      className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 sm:px-6 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200"
    >
      <div className="mx-auto max-w-7xl flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs sm:text-sm leading-relaxed">
          <span className="font-semibold">{t.disclaimerTitle}: </span>
          <span>{t.disclaimerText}</span>
        </div>
      </div>
    </aside>
  );
};
