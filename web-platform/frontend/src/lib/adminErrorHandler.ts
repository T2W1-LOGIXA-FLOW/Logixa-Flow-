import { toast } from "sonner";
import { clearAdminSession } from "@/lib/adminSession";

/**
 * Standardized error handling for admin pages
 * Provides consistent error messages and user feedback
 */

export function handleApiError(
  error: unknown,
  context: string,
  setErrorState?: (error: string | null) => void,
  customMessage?: string
) {
  console.error(`[${context}] Error:`, error);

  const errorMessage = customMessage || `Failed to ${context.toLowerCase()}`;
  
  // Set error state if provided
  if (setErrorState) {
    setErrorState(errorMessage);
  }

  // Show toast notification
  toast.error(errorMessage);
}

export function handleAuthError(error: unknown) {
  console.error("[Auth] Error:", error);
  toast.error("Authentication failed. Please log in again.");
  
  // Clear token and redirect to login
  localStorage.removeItem("adminToken");
  clearAdminSession();
  window.location.href = "/admin/login";
}

export function handleLoadingError(context: string, setErrorState?: (error: string | null) => void) {
  const errorMessage = `Could not load ${context.toLowerCase()}`;
  
  if (setErrorState) {
    setErrorState(errorMessage);
  }
  
  toast.error(errorMessage);
}

export function handleActionError(action: string, error: unknown, setErrorState?: (error: string | null) => void) {
  console.error(`[${action}] Error:`, error);
  
  const errorMessage = `Failed to ${action.toLowerCase()}. Please try again.`;
  
  if (setErrorState) {
    setErrorState(errorMessage);
  }
  
  toast.error(errorMessage);
}
