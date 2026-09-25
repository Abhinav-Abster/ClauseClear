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
    <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-md-elevation-1 transition-all duration-300 hover:shadow-md-elevation-2 flex flex-col gap-4">
      {/* Title and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-md-on-surface flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-primary/10 text-md-primary">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </div>
            {t.input.title}
          </h2>
          <p className="text-xs text-md-on-surface-variant mt-0.5 ml-10">
            {t.input.subtitle}
          </p>
        </div>

        {documentText && (
          <button
            type="button"
            onClick={() => onDocumentChange("")}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-md-error bg-md-error-container/40 hover:bg-md-error-container hover:text-md-on-error-container transition-all duration-200 active:scale-95"
            aria-label="Clear document text"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t.input.clearButton}
          </button>
        )}
      </div>

      {/* Synthetic Sample Selectors */}
      <div className="bg-md-surface-container-low p-3.5 rounded-2xl border border-md-outline/15">
        <span className="text-xs font-medium text-md-on-surface-variant block mb-2">
          {t.input.sampleDocsTitle}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onLoadSample("standard")}
            className="rounded-full bg-md-surface px-3 py-1.5 text-xs font-medium text-md-on-surface border border-md-outline/25 hover:bg-md-primary/10 hover:border-md-primary transition-all duration-200 active:scale-95 shadow-xs"
          >
            📋 {t.input.sampleLeaseStandard}
          </button>
          <button
            type="button"
            onClick={() => onLoadSample("strict")}
            className="rounded-full bg-md-surface px-3 py-1.5 text-xs font-medium text-md-tertiary border border-md-tertiary/30 hover:bg-md-tertiary-container hover:text-md-on-tertiary-container transition-all duration-200 active:scale-95 shadow-xs"
          >
            ⚠️ {t.input.sampleLeaseStrict}
          </button>
          <button
            type="button"
            onClick={() => onLoadSample("saas")}
            className="rounded-full bg-md-surface px-3 py-1.5 text-xs font-medium text-md-on-surface border border-md-outline/25 hover:bg-md-primary/10 hover:border-md-primary transition-all duration-200 active:scale-95 shadow-xs"
          >
            💻 {t.input.sampleSaasTos}
          </button>
        </div>
      </div>

      {/* Main Textarea (Material 3 Filled Text Field style) */}
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
          className={`w-full rounded-t-xl rounded-b-none border-0 border-b-2 p-4 text-sm leading-relaxed transition-all duration-200 focus:outline-none bg-md-surface-container-low text-md-on-surface font-mono placeholder:text-md-on-surface-variant/50 focus:bg-md-surface-container-lowest ${
            isOverLimit
              ? "border-b-md-error focus:border-b-md-error"
              : isNearLimit
                ? "border-b-amber-500 focus:border-b-amber-600"
                : "border-b-md-outline focus:border-b-md-primary"
          }`}
        />

        {/* Live Character Counter */}
        <div className="mt-1.5 flex items-center justify-between text-xs px-1">
          <span
            id="char-counter"
            className={`font-medium ${
              isOverLimit
                ? "text-md-error font-bold"
                : isNearLimit
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-md-on-surface-variant"
            }`}
          >
            {charCount.toLocaleString()} / {MAX_DOCUMENT_LENGTH.toLocaleString()} {t.input.charCount}
          </span>
          {isOverLimit && (
            <span id="max-notice" className="text-md-error font-medium flex items-center gap-1">
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
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 block ${
          isDragging
            ? "border-md-primary bg-md-primary-container/30"
            : "border-md-outline/30 hover:border-md-primary bg-md-surface-container-low/60 hover:bg-md-primary/5"
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
        <div className="flex flex-col items-center justify-center gap-1.5 text-md-on-surface-variant">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-md-primary" aria-hidden="true" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-md-surface border border-md-outline/20">
              <Upload className="h-4 w-4 text-md-primary" aria-hidden="true" />
            </div>
          )}
          <span className="text-xs font-medium text-md-on-surface">
            {isUploading ? t.actions.loading : t.input.dropzoneText}
          </span>
          <span className="text-2xs text-md-on-surface-variant/70">{t.input.orClickUpload}</span>
        </div>
      </label>

      {/* Upload Feedback Messages */}
      {uploadError && (
        <div
          role="alert"
          className="rounded-2xl bg-md-error-container p-3 text-xs text-md-on-error-container border border-md-error/30 flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-md-error" aria-hidden="true" />
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div
          role="status"
          className="rounded-2xl bg-md-secondary-container p-3 text-xs text-md-on-secondary-container border border-md-primary/20 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-md-primary" aria-hidden="true" />
          {uploadSuccess}
        </div>
      )}
    </div>
  );
};
