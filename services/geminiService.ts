const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ================= TYPES ================= */

export interface FileData {
  inlineData: {
    data: string;      // base64
    mimeType: string; // application/pdf | image/png | image/jpeg
  };
}

export interface AnalyzeResult {
  transactions: any[];
  observations: any[];
  complianceChecklist: any[];
}

/* ================= MAIN FUNCTION ================= */

export const analyzeTransactionsAI = async (
  textData: string,
  fileData?: FileData,
  mode: "Auditor" | "School" = "School",
  accountType: "Savings" | "Current" = "Savings"
): Promise<AnalyzeResult> => {

  /* ---------- CASE 1: FILE UPLOAD (PDF / IMAGE) ---------- */
  if (fileData) {
    // Convert base64 → Blob
    const binary = atob(fileData.inlineData.data);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: fileData.inlineData.mimeType
    });

    const formData = new FormData();
    
    // Determine file extension
    let filename = "document";
    if (fileData.inlineData.mimeType === "application/pdf") {
      filename = "document.pdf";
    } else if (fileData.inlineData.mimeType === "image/png") {
      filename = "document.png";
    } else if (fileData.inlineData.mimeType === "image/jpeg") {
      filename = "document.jpg";
    }
    
    formData.append("file", blob, filename);
    formData.append("mode", mode);
    formData.append("accountType", accountType);

    console.log("📤 Uploading file:", filename, "Mode:", mode, "Account:", accountType);

    const response = await fetch(
      `${API_BASE_URL}/generate-report/upload`,
      {
        method: "POST",
        body: formData
        // ❌ DO NOT set Content-Type header (browser sets it with boundary)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("❌ Upload failed:", errorData);
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Upload successful:", result);
    
    return result.data;
  }

  /* ---------- CASE 2: TEXT ONLY ---------- */
  if (!textData || !textData.trim()) {
    throw new Error("No text or document provided");
  }

  console.log("📤 Sending text analysis request");

  const response = await fetch(
    `${API_BASE_URL}/generate-report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        textData,
        mode,
        accountType
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("❌ Text analysis failed:", errorData);
    throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
  }

  const result = await response.json();
  console.log("✅ Text analysis successful:", result);
  
  return result.data;
};