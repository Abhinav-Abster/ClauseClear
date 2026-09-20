"use client";

import React, { useState } from "react";
import { CompareResponse, SupportedLanguage, MAX_DOCUMENT_LENGTH } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import {
  GitCompare,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";

interface CompareViewProps {
  language: SupportedLanguage;
}

export const CompareView: React.FC<CompareViewProps> = ({ language }) => {
  const t = UI_TRANSLATIONS[language];
  const [docA, setDocA] = useState("");
  const [docB, setDocB] = useState("");
  const [labelA, setLabelA] = useState("Offer A (Standard)");
  const [labelB, setLabelB] = useState("Offer B (Alternative)");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadLeaseComparisonSamples = async () => {
    try {
      const [resA, resB] = await Promise.all([
        fetch("/samples/sample_lease_standard.txt").then((r) => r.text()),
        fetch("/samples/sample_lease_strict.txt").then((r) => r.text()),
      ]);
      setDocA(resA);
      setDocB(resB);
      setLabelA("Standard Lease (Oakridge)");
      setLabelB("Strict Lease (Pinnacle)");
    } catch {
      // Fallback text if static fetch isn't ready in dev mode
      setDocA("RESIDENTIAL LEASE: Rent is $2,200/mo. Deposit is $2,200. Grace period 5 days. Landlord gives 24h notice.");
      setDocB("STRICT LEASE: Rent is $2,450/mo. Deposit is $4,900. No grace period. Landlord enters anytime without notice.");
      setLabelA("Standard Lease");
      setLabelB("Strict Lease");
    }
  };

  const handleCompare = async () => {
    if (!docA.trim() || !docB.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentA: docA,
          documentB: docB,
          labelA,
          labelB,
          language,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to compare documents");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error comparing documents");
    } finally {
      setIsLoading(false);
    }
  };

  const copyComparison = () => {
    if (!data) return;
    const diffs = data.comparisonPoints
      .map(
        (cp) =>
          `[${cp.topic}]\n${labelA}: ${cp.documentAProvision}\n${labelB}: ${cp.documentBProvision}\nFavorability: ${cp.moreFavorableToUser} (${cp.favourabilityReasoning})`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(`COMPARISON: ${labelA} vs ${labelB}\n\n${data.summary}\n\n${diffs}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-blue-600" aria-hidden="true" />
            {t.compare.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.compare.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={loadLeaseComparisonSamples}
          className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors"
        >
          📋 Load Standard vs Strict Lease Comparison
        </button>
      </div>

      {/* Dual Document Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document A Input */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="compare-doc-a" className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              {t.compare.docALabel}
            </label>
            <span className="text-2xs text-slate-400">
              {docA.length.toLocaleString()} / {MAX_DOCUMENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <input
            type="text"
            value={labelA}
            onChange={(e) => setLabelA(e.target.value)}
            placeholder="Label (e.g., Offer A)"
            className="w-full text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
          <textarea
            id="compare-doc-a"
            rows={8}
            value={docA}
            onChange={(e) => setDocA(e.target.value)}
            placeholder="Paste first agreement here..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-3 text-xs font-mono dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Document B Input */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="compare-doc-b" className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              {t.compare.docBLabel}
            </label>
            <span className="text-2xs text-slate-400">
              {docB.length.toLocaleString()} / {MAX_DOCUMENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <input
            type="text"
            value={labelB}
            onChange={(e) => setLabelB(e.target.value)}
            placeholder="Label (e.g., Offer B)"
            className="w-full text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
          <textarea
            id="compare-doc-b"
            rows={8}
            value={docB}
            onChange={(e) => setDocB(e.target.value)}
            placeholder="Paste second agreement here..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-3 text-xs font-mono dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Trigger Comparison Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCompare}
          disabled={!docA.trim() || !docB.trim() || isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t.actions.loading}
            </>
          ) : (
            t.actions.compareBtn
          )}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900"
        >
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {data && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.compare.comparisonSummary}
              </span>
              <button
                type="button"
                onClick={copyComparison}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t.actions.copied : t.actions.copy}
              </button>
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
              {data.summary}
            </p>
          </div>

          {/* Side-by-Side Comparison Points */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Clause Differences & Relative Favorability ({data.comparisonPoints.length})
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {data.comparisonPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {pt.topic}
                    </span>

                    {/* Favorability Badge */}
                    {pt.moreFavorableToUser === "documentA" ? (
                      <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-3 py-0.5 text-2xs font-bold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        ⭐ {labelA} is More Favorable
                      </span>
                    ) : pt.moreFavorableToUser === "documentB" ? (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-0.5 text-2xs font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        ⭐ {labelB} is More Favorable
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-2xs font-medium text-slate-700 dark:text-slate-300">
                        Balanced / Neutral
                      </span>
                    )}
                  </div>

                  {/* Provisions Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-blue-50/40 dark:bg-blue-950/20 p-3 border border-blue-100 dark:border-blue-900/40 space-y-1">
                      <span className="font-bold text-blue-900 dark:text-blue-300 block">
                        {labelA}:
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-mono text-2xs">
                        {pt.documentAProvision}
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50/40 dark:bg-amber-950/20 p-3 border border-amber-100 dark:border-amber-900/40 space-y-1">
                      <span className="font-bold text-amber-900 dark:text-amber-300 block">
                        {labelB}:
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-mono text-2xs">
                        {pt.documentBProvision}
                      </p>
                    </div>
                  </div>

                  {/* Objective Reasoning */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    <span className="font-semibold not-italic text-slate-800 dark:text-slate-200">Analysis: </span>
                    {pt.favourabilityReasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Unique / Omitted Provisions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unique to Doc A */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Present in {labelA} (Omitted in {labelB})
              </h4>
              {data.uniqueToDocumentA.length === 0 ? (
                <p className="text-xs text-slate-400">No unique clauses detected.</p>
              ) : (
                data.uniqueToDocumentA.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">{item.clause}</span>
                    <p className="text-slate-600 dark:text-slate-400">{item.summary}</p>
                    <p className="text-2xs text-blue-700 dark:text-blue-300 italic font-medium">Impact: {item.significance}</p>
                  </div>
                ))
              )}
            </div>

            {/* Unique to Doc B */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Present in {labelB} (Omitted in {labelA})
              </h4>
              {data.uniqueToDocumentB.length === 0 ? (
                <p className="text-xs text-slate-400">No unique clauses detected.</p>
              ) : (
                data.uniqueToDocumentB.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">{item.clause}</span>
                    <p className="text-slate-600 dark:text-slate-400">{item.summary}</p>
                    <p className="text-2xs text-amber-700 dark:text-amber-300 italic font-medium">Impact: {item.significance}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommendations for Review */}
          {data.keyRecommendationsForReview.length > 0 && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 p-5 shadow-xs space-y-2">
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                {t.compare.keyReviewAdvice}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {data.keyRecommendationsForReview.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
