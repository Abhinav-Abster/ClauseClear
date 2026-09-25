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
      className="bg-md-tertiary-container/25 border-b border-md-outline/15 text-md-on-surface px-4 py-2.5 sm:px-6 transition-colors duration-300"
    >
      <div className="mx-auto max-w-7xl flex items-start gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-md-tertiary text-md-on-tertiary shrink-0 mt-0.5 shadow-xs">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="text-xs sm:text-sm leading-relaxed">
          <span className="font-semibold text-md-on-surface">{t.disclaimerTitle}: </span>
          <span className="text-md-on-surface-variant">{t.disclaimerText}</span>
        </div>
      </div>
    </aside>
  );
};
