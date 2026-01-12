const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ===== Types preserved for compatibility ===== */

export interface FileData {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface AnalyzeResponse {
  transactions: any[];
  observations: any[];
  complianceChecklist: any[];
}

/* ===== MAIN FUNCTION (SAME SIGNATURE AS BEFORE) ===== */

export const analyzeTransactionsAI = async (
  textData: string,
  fileData?: FileData,
  mode: "Auditor" | "School" = "School",
  accountType: "Savings" | "Current" = "Savings"
): Promise<AnalyzeResponse> => {
  // CASE 1: FILE UPLOAD → OCR handled by backend
  if (fileData) {
    const byteCharacters = atob(fileData.inlineData.data);
    const byteNumbers = new Array(byteCharacters.length)
      .fill(0)
      .map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {
      type: fileData.inlineData.mimeType
    });

    const formData = new FormData();
    formData.append("file", blob);

    formData.append("mode", mode);
    formData.append("accountType", accountType);

    const response = await fetch(
      `${API_BASE_URL}/generate-report/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error("Document OCR analysis failed");
    }

    const result = await response.json();
    return result.data;
  }

  // CASE 2: TEXT ONLY
  if (!textData || !textData.trim()) {
    throw new Error("No input provided");
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
    throw new Error("Text analysis failed");
  }

  const result = await response.json();
  return result.data;
};
