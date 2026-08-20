import { apiRequest } from "../../shared/api/client";

export type FeedbackCategory = "bug" | "feedback";

export function submitFeedback(category: FeedbackCategory, message: string, contextPath: string) {
  return apiRequest<{ id: string; created_at: string }>(
    "/feedback",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message, context_path: contextPath }),
    },
  );
}
