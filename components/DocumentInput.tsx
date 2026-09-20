"use client";

import React, { useState, useRef } from "react";
import { SupportedLanguage, MAX_DOCUMENT_LENGTH } from "@/lib/validation";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import { Upload, FileText, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface DocumentInputProps {
  documentText: string;
  onDocumentChange: (_text: string) => void;
  language: SupportedLanguage;
  onLoadSample: (_sampleKey: "standard" | "strict" | "saas") => void;
}

export const DocumentInput: React.FC<DocumentInputProps> = ({
  documentText,
  onDocumentChange,
  language,
  onLoadSample,
}) => {
  const t = UI_TRANSLATIONS[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const charCount = documentText.length;
  const isNearLimit = charCount > MAX_DOCUMENT_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_DOCUMENT_LENGTH;

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process uploaded file");
      }

      onDocumentChange(data.text);
      setUploadSuccess(`Loaded ${file.name} (${data.charCount.toLocaleString()} chars)`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error reading file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-4">
      {/* Title and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
            {t.input.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.input.subtitle}
          </p>
        </div>

        {documentText && (
          <button
            type="button"
            onClick={() => onDocumentChange("")}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            aria-label="Clear document text"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t.input.clearButton}
          </button>
        )}
      </div>

      {/* Synthetic Sample Selectors */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-2">
          {t.input.sampleDocsTitle}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onLoadSample("standard")}
            className="rounded-md bg-white dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-2xs"
          >
            📋 {t.input.sampleLeaseStandard}
          </button>
          <button
            type="button"
            onClick={() => onLoadSample("strict")}
            className="rounded-md bg-white dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors shadow-2xs"
          >
            ⚠️ {t.input.sampleLeaseStrict}
          </button>
          <button
            type="button"
            onClick={() => onLoadSample("saas")}
            className="rounded-md bg-white dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-2xs"
          >
            💻 {t.input.sampleSaasTos}
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <label htmlFor="document-editor" className="sr-only">
          {t.input.pastePlaceholder}
        </label>
        <textarea
          id="document-editor"
          rows={11}
          value={documentText}
          onChange={(e) => onDocumentChange(e.target.value)}
          placeholder={t.input.pastePlaceholder}
          aria-describedby="char-counter max-notice"
          className={`w-full rounded-lg border p-3.5 text-sm leading-relaxed transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-950 dark:text-slate-100 font-mono ${
            isOverLimit
              ? "border-red-500 focus:border-red-500 focus:ring-red-200"
              : isNearLimit
                ? "border-amber-400 focus:border-amber-500"
                : "border-slate-300 dark:border-slate-700"
          }`}
        />

        {/* Live Character Counter */}
        <div className="mt-1 flex items-center justify-between text-xs">
          <span
            id="char-counter"
            className={`font-medium ${
              isOverLimit
                ? "text-red-600 dark:text-red-400 font-bold"
                : isNearLimit
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {charCount.toLocaleString()} / {MAX_DOCUMENT_LENGTH.toLocaleString()} {t.input.charCount}
          </span>
          {isOverLimit && (
            <span id="max-notice" className="text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {t.input.maxLimitNotice}
            </span>
          )}
        </div>
      </div>

      {/* Accessible File Upload Area */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors block ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-800/30"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          accept=".txt,.pdf,text/plain,application/pdf"
          className="sr-only"
        />
        <div className="flex flex-col items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
          ) : (
            <Upload className="h-5 w-5 text-slate-400" aria-hidden="true" />
          )}
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isUploading ? t.actions.loading : t.input.dropzoneText}
          </span>
          <span className="text-2xs text-slate-400">{t.input.orClickUpload}</span>
        </div>
      </label>

      {/* Upload Feedback Messages */}
      {uploadError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900 flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
          {uploadSuccess}
        </div>
      )}
    </div>
  );
};
