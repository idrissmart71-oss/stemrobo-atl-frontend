const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ===== Types preserved (frontend-safe) ===== */

export interface FileData {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface AnalyzeRequest {
  textData: string;
  mode?: "Auditor" | "School";
  accountType?: "Savings" | "Current";
}

/* ===== Main function (SAME NAME, SAME OUTPUT) ===== */

export const analyzeTransactionsAI = async (
  textData: string,
  _fileData?: FileData, // kept for compatibility (not sent)
  mode: "Auditor" | "School" = "School",
  accountType: "Savings" | "Current" = "Savings"
) => {
  const payload: AnalyzeRequest = {
    textData,
    mode,
    accountType
  };

  const response = await fetch(
    `${API_BASE_URL}/generate-report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error: ${errorText}`);
  }

  /*
    Backend already returns:
    {
      success: true,
      data: {
        transactions: [],
        observations: [],
        complianceChecklist: []
      }
    }
  */

  const result = await response.json();

  return result.data;
};
