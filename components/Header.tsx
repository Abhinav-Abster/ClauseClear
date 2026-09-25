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
    <header className="sticky top-0 z-50 border-b border-md-outline/15 bg-md-surface/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-md-primary text-md-on-primary shadow-md-elevation-1 transition-transform duration-300 hover:scale-105 active:scale-95">
            <Scale className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold tracking-tight text-md-on-surface">
                {t.appName}
              </span>
              <span className="inline-flex items-center rounded-full bg-md-secondary-container px-2.5 py-0.5 text-xs font-medium text-md-on-secondary-container shadow-xs">
                Informational AI
              </span>
            </div>
            <p className="text-xs text-md-on-surface-variant hidden sm:block">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Accessibility & Localization Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3" role="toolbar" aria-label="Accessibility and language settings">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-md-surface-container rounded-full px-3 py-1 border border-md-outline/20 hover:bg-md-primary/10 transition-colors duration-200">
            <Globe className="h-4 w-4 text-md-on-surface-variant" aria-hidden="true" />
            <label htmlFor="language-select" className="sr-only">
              {t.accessibility.language}
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs font-medium text-md-on-surface py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="fr">Français (FR)</option>
              <option value="pt">Português (PT)</option>
            </select>
          </div>

          {/* Text Size Switcher */}
          <div className="flex items-center bg-md-surface-container rounded-full p-1 border border-md-outline/20 gap-0.5" role="group" aria-label={t.accessibility.textSize}>
            <span className="sr-only">{t.accessibility.textSize}</span>
            <button
              type="button"
              onClick={() => onChangeTextSize("normal")}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 active:scale-95 ${
                textSize === "normal"
                  ? "bg-md-primary text-md-on-primary shadow-xs"
                  : "text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-primary/10"
              }`}
              aria-label="Default text size"
              aria-pressed={textSize === "normal"}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onChangeTextSize("large")}
              className={`px-2.5 py-1 text-sm font-medium rounded-full transition-all duration-200 active:scale-95 ${
                textSize === "large"
                  ? "bg-md-primary text-md-on-primary shadow-xs"
                  : "text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-primary/10"
              }`}
              aria-label="Large text size"
              aria-pressed={textSize === "large"}
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => onChangeTextSize("xlarge")}
              className={`px-2.5 py-1 text-base font-semibold rounded-full transition-all duration-200 active:scale-95 ${
                textSize === "xlarge"
                  ? "bg-md-primary text-md-on-primary shadow-xs"
                  : "text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-primary/10"
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
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200 active:scale-95 ${
              highContrast
                ? "bg-black text-yellow-300 border-yellow-400 shadow-sm"
                : "bg-md-surface-container text-md-on-surface border-md-outline/20 hover:bg-md-primary/10"
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
