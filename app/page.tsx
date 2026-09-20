"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { DocumentInput } from "@/components/DocumentInput";
import { SimplifierView } from "@/components/SimplifierView";
import { AnalyzerView } from "@/components/AnalyzerView";
import { AskView } from "@/components/AskView";
import { ChecklistView } from "@/components/ChecklistView";
import { CompareView } from "@/components/CompareView";
import {
  SupportedLanguage,
  SimplifyResponse,
  AnalyzeResponse,
  ChecklistResponse,
} from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import { Sparkles, ShieldAlert, MessageSquare, ListChecks, GitCompare } from "lucide-react";

export default function Home() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [highContrast, setHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<"normal" | "large" | "xlarge">("normal");

  const [documentText, setDocumentText] = useState("");
  const [activeTab, setActiveTab] = useState<"simplify" | "analyze" | "ask" | "checklist" | "compare">("simplify");

  // Feature Data States
  const [simplifyData, setSimplifyData] = useState<SimplifyResponse | null>(null);
  const [isSimplifying, setIsSimplifying] = useState(false);

  const [analyzeData, setAnalyzeData] = useState<AnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [checklistData, setChecklistData] = useState<ChecklistResponse | null>(null);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);

  const [generalError, setGeneralError] = useState<string | null>(null);

  const t = UI_TRANSLATIONS[language];
  const canRun = documentText.trim().length >= 20;

  // Sync high contrast class on root element
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  // Sync text scaling on root element
  useEffect(() => {
    document.documentElement.classList.remove("text-scale-normal", "text-scale-large", "text-scale-xlarge");
    document.documentElement.classList.add(`text-scale-${textSize}`);
  }, [textSize]);

  // Load sample documents
  const handleLoadSample = async (sampleKey: "standard" | "strict" | "saas") => {
    setGeneralError(null);
    try {
      let fileName = "sample_lease_standard.txt";
      if (sampleKey === "strict") fileName = "sample_lease_strict.txt";
      if (sampleKey === "saas") fileName = "sample_saas_tos.txt";

      const res = await fetch(`/samples/${fileName}`);
      if (!res.ok) throw new Error("Sample file not found");
      const text = await res.text();
      setDocumentText(text);

      // Reset prior analysis when new document is loaded
      setSimplifyData(null);
      setAnalyzeData(null);
      setChecklistData(null);
    } catch {
      // Fallback synthetic content if static route in dev
      if (sampleKey === "standard") {
        setDocumentText(
          "RESIDENTIAL LEASE AGREEMENT (STANDARD)\n\n1. PARTIES: Oakridge Properties LLC ('Landlord') and Jane Doe ('Tenant').\n2. TERM: 12 months starting Feb 1, 2025. Renewable with 60 days written notice.\n3. RENT: $2,200/month due on 1st. Grace period until 5th. Late fee $50.\n4. SECURITY DEPOSIT: $2,200 held in interest-bearing escrow. Returned in 30 days.\n5. MAINTENANCE: Landlord maintains plumbing, heating, and structure. 24hr response to emergencies.\n6. ACCESS: Landlord provides at least 24 hours advance notice before entering.\n7. PETS: 1 domestic pet permitted under 35 lbs with $300 deposit.",
        );
      } else if (sampleKey === "strict") {
        setDocumentText(
          "RESIDENTIAL LEASE AGREEMENT (STRICT/HIGH RISK)\n\n1. PARTIES: Pinnacle Housing Corp ('Landlord') and Jane Doe ('Tenant').\n2. TERM & ESCALATION: 12 months with mandatory 10% rent escalation unless 90 days notice given.\n3. RENT: $2,450/month due strictly on 1st. No grace period. Late fee $150 + $15/day.\n4. SECURITY DEPOSIT: $4,900 (two months). Non-refundable cleaning fee of $450 deducted regardless of condition.\n5. MAINTENANCE: Tenant pays first $500 of all plumbing, appliance, and HVAC repairs.\n6. ACCESS: Landlord may enter anytime without prior notice between 8 AM and 8 PM.\n7. ACCELERATION: On any default, all remaining rent for entire year becomes immediately due.\n8. ARBITRATION: Mandatory binding arbitration in NY. Tenant waives jury trial.",
        );
      } else {
        setDocumentText(
          "TERMS OF SERVICE AND SOFTWARE LICENSE AGREEMENT\n\n1. LICENSE: NovaCloud Inc grants revocable, non-exclusive license to use CloudSync.\n2. BILLING: $1,200/seat billed annually in advance. Subscriptions auto-renew unless cancelled 30 days prior. All fees strictly non-refundable.\n3. DATA OWNERSHIP: Customer retains ownership; Company granted license to host and analyze.\n4. LIABILITY LIMIT: Aggregate liability capped at fees paid in prior 3 months. No consequential damages.\n5. INDEMNITY: User indemnifies Company against all third-party claims.\n6. ARBITRATION: Binding individual arbitration in Delaware; class action rights waived.",
        );
      }
      setSimplifyData(null);
      setAnalyzeData(null);
      setChecklistData(null);
    }
  };

  const runSimplify = async () => {
    if (!canRun || isSimplifying) return;
    setIsSimplifying(true);
    setGeneralError(null);
    try {
      const res = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: documentText, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to simplify document");
      setSimplifyData(json);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Error running simplification");
    } finally {
      setIsSimplifying(false);
    }
  };

  const runAnalyze = async () => {
    if (!canRun || isAnalyzing) return;
    setIsAnalyzing(true);
    setGeneralError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: documentText, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to analyze document");
      setAnalyzeData(json);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Error running analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runChecklist = async () => {
    if (!canRun || isGeneratingChecklist) return;
    setIsGeneratingChecklist(true);
    setGeneralError(null);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: documentText, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate checklist");
      setChecklistData(json);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Error generating checklist");
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
        textSize={textSize}
        onChangeTextSize={setTextSize}
      />

      {/* Persistent Informational Non-Advisory Banner */}
      <DisclaimerBanner language={language} />

      {/* Main Workspace */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 sm:px-6 lg:px-8">
        {generalError && (
          <div
            role="alert"
            className="mb-6 rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900 flex items-center justify-between"
          >
            <span>{generalError}</span>
            <button
              type="button"
              onClick={() => setGeneralError(null)}
              className="text-xs font-bold underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Document Input Workspace */}
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <DocumentInput
                documentText={documentText}
                onDocumentChange={(text) => {
                  setDocumentText(text);
                  setGeneralError(null);
                }}
                language={language}
                onLoadSample={handleLoadSample}
              />
            </div>
          </div>

          {/* Right Column: Grounded Analysis Tools */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Tab Navigation */}
            <div
              role="tablist"
              aria-label="Document Analysis Tools"
              className="flex flex-wrap gap-1.5 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl border border-slate-300/60 dark:border-slate-700/60"
            >
              <button
                role="tab"
                id="tab-simplify"
                aria-selected={activeTab === "simplify"}
                aria-controls="panel-simplify"
                tabIndex={activeTab === "simplify" ? 0 : -1}
                onClick={() => setActiveTab("simplify")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  activeTab === "simplify"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{t.tabs.simplify}</span>
              </button>

              <button
                role="tab"
                id="tab-analyze"
                aria-selected={activeTab === "analyze"}
                aria-controls="panel-analyze"
                tabIndex={activeTab === "analyze" ? 0 : -1}
                onClick={() => setActiveTab("analyze")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  activeTab === "analyze"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <span>{t.tabs.analyze}</span>
              </button>

              <button
                role="tab"
                id="tab-ask"
                aria-selected={activeTab === "ask"}
                aria-controls="panel-ask"
                tabIndex={activeTab === "ask" ? 0 : -1}
                onClick={() => setActiveTab("ask")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  activeTab === "ask"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                <span>{t.tabs.ask}</span>
              </button>

              <button
                role="tab"
                id="tab-checklist"
                aria-selected={activeTab === "checklist"}
                aria-controls="panel-checklist"
                tabIndex={activeTab === "checklist" ? 0 : -1}
                onClick={() => setActiveTab("checklist")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  activeTab === "checklist"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                <span>{t.tabs.checklist}</span>
              </button>

              <button
                role="tab"
                id="tab-compare"
                aria-selected={activeTab === "compare"}
                aria-controls="panel-compare"
                tabIndex={activeTab === "compare" ? 0 : -1}
                onClick={() => setActiveTab("compare")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  activeTab === "compare"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <GitCompare className="h-4 w-4" aria-hidden="true" />
                <span>{t.tabs.compare}</span>
              </button>
            </div>

            {/* Tab Panels */}
            <div>
              {activeTab === "simplify" && (
                <div
                  role="tabpanel"
                  id="panel-simplify"
                  aria-labelledby="tab-simplify"
                >
                  <SimplifierView
                    data={simplifyData}
                    isLoading={isSimplifying}
                    language={language}
                    onRunSimplify={runSimplify}
                    canRun={canRun}
                  />
                </div>
              )}

              {activeTab === "analyze" && (
                <div
                  role="tabpanel"
                  id="panel-analyze"
                  aria-labelledby="tab-analyze"
                >
                  <AnalyzerView
                    data={analyzeData}
                    isLoading={isAnalyzing}
                    language={language}
                    onRunAnalyze={runAnalyze}
                    canRun={canRun}
                  />
                </div>
              )}

              {activeTab === "ask" && (
                <div
                  role="tabpanel"
                  id="panel-ask"
                  aria-labelledby="tab-ask"
                >
                  <AskView
                    documentText={documentText}
                    language={language}
                    canRun={canRun}
                  />
                </div>
              )}

              {activeTab === "checklist" && (
                <div
                  role="tabpanel"
                  id="panel-checklist"
                  aria-labelledby="tab-checklist"
                >
                  <ChecklistView
                    data={checklistData}
                    isLoading={isGeneratingChecklist}
                    language={language}
                    onRunChecklist={runChecklist}
                    canRun={canRun}
                  />
                </div>
              )}

              {activeTab === "compare" && (
                <div
                  role="tabpanel"
                  id="panel-compare"
                  aria-labelledby="tab-compare"
                >
                  <CompareView language={language} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Compliance & Alignment Statement */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 mt-12">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} <strong>ClauseClear</strong> — Accessible Legal Information & Document Comprehension.
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            Strictly informational & educational. Not a substitute for licensed legal advice.
          </span>
        </div>
      </footer>
    </div>
  );
}
