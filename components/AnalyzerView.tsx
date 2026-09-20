"use client";

import React, { useState } from "react";
import { AnalyzeResponse, SupportedLanguage } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Quote,
  Calendar,
} from "lucide-react";

interface AnalyzerViewProps {
  data: AnalyzeResponse | null;
  isLoading: boolean;
  language: SupportedLanguage;
  onRunAnalyze: () => void;
  canRun: boolean;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  data,
  isLoading,
  language,
  onRunAnalyze,
  canRun,
}) => {
  const t = UI_TRANSLATIONS[language];
  const [filterType, setFilterType] = useState<"all" | "obligation" | "deadline" | "risk">("all");

  const getSeverityBadge = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/60 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            {t.analyze.severityHigh}
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {t.analyze.severityMed}
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t.analyze.severityLow}
          </span>
        );
    }
  };

  const filteredClauses = data?.clauses.filter((clause) => {
    if (filterType === "all") return true;
    if (filterType === "obligation") return clause.type === "obligation";
    if (filterType === "deadline") return clause.type === "deadline";
    if (filterType === "risk") return clause.type === "risk" || clause.type === "unusual_term";
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-blue-600" aria-hidden="true" />
            {t.analyze.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Identify liabilities, obligations, and unusual clauses backed by exact quotes.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunAnalyze}
          disabled={!canRun || isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t.actions.loading}
            </>
          ) : (
            t.actions.analyzeBtn
          )}
        </button>
      </div>

      {/* Results Display */}
      {data ? (
        <div className="space-y-6">
          {/* Executive Risk Overview Banner */}
          <div
            className={`rounded-xl border p-5 shadow-xs ${
              data.overallRiskLevel === "high"
                ? "bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                : data.overallRiskLevel === "medium"
                  ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                  : "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {t.analyze.overallRisk}
              </span>
              {getSeverityBadge(data.overallRiskLevel)}
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
              {data.executiveSummary}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter clauses by category">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              aria-pressed={filterType === "all"}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.analyze.filterAll} ({data.clauses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("risk")}
              aria-pressed={filterType === "risk"}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "risk"
                  ? "bg-red-600 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              ⚠️ {t.analyze.filterRisks}
            </button>
            <button
              type="button"
              onClick={() => setFilterType("obligation")}
              aria-pressed={filterType === "obligation"}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "obligation"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              📌 {t.analyze.filterObligations}
            </button>
            <button
              type="button"
              onClick={() => setFilterType("deadline")}
              aria-pressed={filterType === "deadline"}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "deadline"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              ⏰ {t.analyze.filterDeadlines}
            </button>
          </div>

          {/* Clause Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredClauses?.map((clause, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    {clause.title}
                  </h4>
                  {getSeverityBadge(clause.severity)}
                </div>

                {/* Verbatim Source Quote with Citation Styling */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs border-l-3 border-blue-500 dark:border-blue-400">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-2xs text-blue-700 dark:text-blue-300 mb-1">
                    <Quote className="h-3 w-3" aria-hidden="true" />
                    {t.analyze.sourceQuote}
                  </div>
                  <blockquote className="text-slate-700 dark:text-slate-300 italic font-mono leading-relaxed">
                    &ldquo;{clause.exactQuote}&rdquo;
                  </blockquote>
                </div>

                {/* Practical Impact */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {t.analyze.practicalImpact}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {clause.explanation}
                  </p>
                </div>

                {/* What to Verify / Guidance */}
                <div className="rounded-md bg-blue-50/50 dark:bg-blue-950/30 p-2.5 text-xs text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900/50">
                  <span className="font-bold">{t.analyze.whatToVerify}: </span>
                  <span>{clause.recommendation}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Critical Deadlines Card */}
          {data.deadlines && data.deadlines.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" aria-hidden="true" />
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t.analyze.deadlinesTitle} ({data.deadlines.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.deadlines.map((dl, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {dl.title}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {dl.timeframe}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Trigger:</span> {dl.triggerEvent}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                      <span>Consequence:</span> {dl.consequenceOfMissing}
                    </div>
                    {dl.exactQuote && (
                      <p className="text-2xs text-slate-400 italic">
                        Source: &ldquo;{dl.exactQuote}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400">
          <ShieldAlert className="h-8 w-8 mx-auto text-slate-400 mb-2" aria-hidden="true" />
          <p className="text-sm font-medium">Ready to analyze risks & obligations.</p>
          <p className="text-xs text-slate-400 mt-1">
            Click &ldquo;{t.actions.analyzeBtn}&rdquo; to extract clauses tagged with low/medium/high severity.
          </p>
        </div>
      )}
    </div>
  );
};
