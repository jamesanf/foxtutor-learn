export type ProviderMandateState = "setup" | "pending" | "inactive" | "active" | "failed" | string | null;

export type DirectDebitStatus =
  | "NOT_CONFIGURED"
  | "SETUP_REQUIRED"
  | "AUTHORISATION_PENDING"
  | "ACTIVE"
  | "FAILED"
  | "INACTIVE"
  | "UNKNOWN";

export interface DirectDebitStatusCopy {
  label: string;
  description: string;
  action: string;
  tone: "neutral" | "info" | "success" | "warning" | "error";
}

export type DirectDebitDiagnosticCode =
  | "WRONG_CONTACT_MAPPING"
  | "MISSING_CONTACT_LINK"
  | "UNVERIFIED_ACCOUNTING_LINK"
  | "FREEAGENT_AUTH_FAILURE"
  | "FREEAGENT_NOT_FOUND"
  | "FREEAGENT_5XX"
  | "FREEAGENT_RATE_LIMIT"
  | "FREEAGENT_TIMEOUT"
  | "MALFORMED_PROVIDER_RESPONSE"
  | "UNEXPECTED_MANDATE_STATE"
  | "PROPERTY_MAPPING_BUG"
  | "ENVIRONMENT_MISMATCH"
  | "SANDBOX_CAPABILITY_LIMIT"
  | "STALE_LOCAL_STATE"
  | "CORRECT_NO_MANDATE_STATE"
  | "CORRECT_PENDING_STATE"
  | "CORRECT_ACTIVE_STATE"
  | "OTHER";

export function normalizeProviderMandateState(value: unknown): ProviderMandateState {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return "__MALFORMED__";
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function mapDirectDebitStatus(
  providerState: ProviderMandateState,
  hasVerifiedContact: boolean
): DirectDebitStatus {
  if (!hasVerifiedContact) return "SETUP_REQUIRED";
  const normalized = normalizeProviderMandateState(providerState);
  if (normalized === "setup") return "SETUP_REQUIRED";
  if (normalized === "pending") return "AUTHORISATION_PENDING";
  if (normalized === "active") return "ACTIVE";
  if (normalized === "inactive") return "INACTIVE";
  if (normalized === "failed") return "FAILED";
  return "UNKNOWN";
}

export function directDebitStatusCopy(status: DirectDebitStatus): DirectDebitStatusCopy {
  switch (status) {
    case "NOT_CONFIGURED":
    case "SETUP_REQUIRED":
      return {
        label: "Direct Debit setup required",
        description: "Direct Debit setup is required before automatic billing can begin.",
        action: "Your billing administrator will start the secure provider setup when required.",
        tone: "neutral"
      };
    case "AUTHORISATION_PENDING":
      return {
        label: "Direct Debit authorisation pending",
        description: "Your Direct Debit authorisation is being completed.",
        action: "Return here after authorising to check whether Direct Debit is active.",
        tone: "info"
      };
    case "ACTIVE":
      return {
        label: "Direct Debit active",
        description: "Your lessons will be billed automatically using Direct Debit.",
        action: "No action is needed.",
        tone: "success"
      };
    case "FAILED":
      return {
        label: "Direct Debit needs attention",
        description: "The provider could not confirm an active Direct Debit authorisation.",
        action: "Contact billing so the setup can be checked safely.",
        tone: "error"
      };
    case "INACTIVE":
      return {
        label: "Direct Debit needs attention",
        description: "The previous Direct Debit authorisation is no longer active.",
        action: "Contact billing so a new secure provider authorisation can be arranged.",
        tone: "error"
      };
    case "UNKNOWN":
      return {
        label: "Direct Debit status unavailable",
        description: "FoxTutor is temporarily unable to confirm the current Direct Debit status.",
        action: "No action is needed unless FoxTutor asks you to take one.",
        tone: "warning"
      };
  }
}
