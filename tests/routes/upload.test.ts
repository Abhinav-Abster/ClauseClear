/**
 * @jest-environment node
 */
import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";
import { clearRateLimits } from "@/lib/api-guard";

describe("POST /api/upload", () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it("successfully extracts text from a plain-text file upload", async () => {
    const textContent = "RESIDENTIAL LEASE AGREEMENT: Rent is $2,200/month between Tenant and Landlord.";
    const blob = new Blob([textContent], { type: "text/plain" });

    const formData = new FormData();
    formData.append("file", blob, "agreement.txt");

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.text).toBe(textContent);
    expect(data.charCount).toBe(textContent.length);
  });

  it("rejects unsupported file formats with 415 error", async () => {
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const blob = new Blob([binaryData], { type: "image/png" });

    const formData = new FormData();
    formData.append("file", blob, "scan.png");

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(415);
    const data = await res.json();
    expect(data.error).toContain("Unsupported file type");
  });

  it("rejects request if no file is included in FormData", async () => {
    const formData = new FormData();

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No document file uploaded");
  });
});
