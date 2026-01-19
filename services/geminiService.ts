const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ================= TYPES ================= */

export interface AnalyzeResult {
  transactions: any[];
  observations: any[];
  complianceChecklist: any[];
}

/* ================= MAIN FUNCTION ================= */

export const analyzeTransactionsAI = async (
  textData: string,
  fileData?: undefined, // Not used anymore
  mode: "Auditor" | "School" = "School",
  accountType: "Savings" | "Current" = "Savings"
): Promise<AnalyzeResult> => {

  if (!textData || !textData.trim()) {
    throw new Error("No text provided");
  }

  console.log("📤 Sending text analysis request to backend");
  console.log("Text length:", textData.length, "characters");

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