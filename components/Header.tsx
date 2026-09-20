"use client";

import React from "react";
import { SupportedLanguage } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import { Scale, Globe, SunMoon } from "lucide-react";

interface HeaderProps {
  language: SupportedLanguage;
  onLanguageChange: (_lang: SupportedLanguage) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  textSize: "normal" | "large" | "xlarge";
  onChangeTextSize: (_size: "normal" | "large" | "xlarge") => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  highContrast,
  onToggleHighContrast,
  textSize,
  onChangeTextSize,
}) => {
  const t = UI_TRANSLATIONS[language];

  return (
    <header className="border-b border-slate-200 bg-white dark:bg-slate-900 transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Scale className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t.appName}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Informational AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Accessibility & Localization Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4" role="toolbar" aria-label="Accessibility and language settings">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <Globe className="h-4 w-4 text-slate-500 ml-1.5" aria-hidden="true" />
            <label htmlFor="language-select" className="sr-only">
              {t.accessibility.language}
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 py-1 px-2 focus:outline-none cursor-pointer"
            >
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="fr">Français (FR)</option>
              <option value="pt">Português (PT)</option>
            </select>
          </div>

          {/* Text Size Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700" role="group" aria-label={t.accessibility.textSize}>
            <span className="sr-only">{t.accessibility.textSize}</span>
            <button
              type="button"
              onClick={() => onChangeTextSize("normal")}
              className={`px-2 py-1 text-xs font-semibold rounded ${
                textSize === "normal"
                  ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
              aria-label="Default text size"
              aria-pressed={textSize === "normal"}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onChangeTextSize("large")}
              className={`px-2 py-1 text-sm font-semibold rounded ${
                textSize === "large"
                  ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
              aria-label="Large text size"
              aria-pressed={textSize === "large"}
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => onChangeTextSize("xlarge")}
              className={`px-2 py-1 text-base font-bold rounded ${
                textSize === "xlarge"
                  ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
              aria-label="Extra large text size"
              aria-pressed={textSize === "xlarge"}
            >
              A++
            </button>
          </div>

          {/* High Contrast Mode Toggle */}
          <button
            type="button"
            onClick={onToggleHighContrast}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
              highContrast
                ? "bg-black text-yellow-300 border-yellow-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
            }`}
            aria-pressed={highContrast}
            aria-label={t.accessibility.highContrast}
          >
            <SunMoon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.accessibility.highContrast}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
