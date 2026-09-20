import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFile, ALLOWED_MIME_TYPES } from "@/lib/pdf";
import { MAX_FILE_SIZE_BYTES } from "@/lib/validation";
import { checkRateLimit, getClientIdentifier, logSafeRequest } from "@/lib/api-guard";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const clientId = getClientIdentifier(req);

  // 1. Rate Limit Enforcement
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many upload attempts. Please wait a moment." },
      { status: 429 },
    );
  }

  // 2. Parse FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No document file uploaded. Please select a .txt or .pdf file." },
      { status: 400 },
    );
  }

  // 3. Size & MIME Validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File size exceeds 5MB limit. Please upload a smaller document.` },
      { status: 413 },
    );
  }

  // Determine mime type (fallback to filename extension if blob type is octet-stream)
  let mimeType = file.type;
  const fileName = (file as File).name || "document";
  if (!mimeType || mimeType === "application/octet-stream") {
    if (fileName.endsWith(".pdf")) mimeType = "application/pdf";
    else if (fileName.endsWith(".txt")) mimeType = "text/plain";
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Only plain text (.txt) and PDF (.pdf) files are supported.`,
      },
      { status: 415 },
    );
  }

  // 4. Extract Text Safely
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await extractTextFromFile(buffer, mimeType);

    logSafeRequest({
      requestId,
      route: "/api/upload",
      statusCode: 200,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      charCount: result.charCount,
      fileName,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to parse document text";
    logSafeRequest({
      requestId,
      route: "/api/upload",
      statusCode: 422,
      durationMs: Date.now() - startTime,
      errorMessage: errorMsg,
    });
    return NextResponse.json({ error: errorMsg }, { status: 422 });
  }
}
