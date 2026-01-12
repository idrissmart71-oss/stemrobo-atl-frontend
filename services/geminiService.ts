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
    formData.append("file", blob, "document");
    formData.append("mode", mode);
    formData.append("accountType", accountType);

    const response = await fetch(
      `${API_BASE_URL}/generate-report/upload`,
      {
        method: "POST",
        body: formData
        // ❌ DO NOT set headers here (multer needs boundary)
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Document analysis failed: ${text}`);
    }

    const result = await response.json();
    return result.data;
  }

  /* ---------- CASE 2: TEXT ONLY ---------- */
  if (!textData || !textData.trim()) {
    throw new Error("No text or document provided");
  }

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
    const text = await response.text();
    throw new Error(`Text analysis failed: ${text}`);
  }

  const result = await response.json();
  return result.data;
};
