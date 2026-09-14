export type ProviderMandateState = "setup" | "pending" | "inactive" | "active" | "failed" | string | null;

export type DirectDebitStatus =
  | "NOT_CONFIGURED"
  | "SETUP_REQUESTED"
  | "PENDING_AUTHORISATION"
  | "ACTIVE"
  | "FAILED"
  | "UNKNOWN";

export interface DirectDebitStatusCopy {
  label: string;
  description: string;
  action: string;
  tone: "neutral" | "info" | "success" | "warning" | "error";
}

export function mapDirectDebitStatus(
  providerState: ProviderMandateState,
  hasVerifiedContact: boolean
): DirectDebitStatus {
  if (!hasVerifiedContact) return "NOT_CONFIGURED";
  if (providerState === "setup") return "SETUP_REQUESTED";
  if (providerState === "pending") return "PENDING_AUTHORISATION";
  if (providerState === "active") return "ACTIVE";
  if (providerState === "inactive" || providerState === "failed") return "FAILED";
  return "UNKNOWN";
}

export function directDebitStatusCopy(status: DirectDebitStatus): DirectDebitStatusCopy {
  switch (status) {
    case "NOT_CONFIGURED":
      return {
        label: "Setup has not been started",
        description: "FoxTutor will send a secure Direct Debit authorisation request when setup is started.",
        action: "If you expected a request, contact FoxTutor.",
        tone: "neutral"
      };
    case "SETUP_REQUESTED":
      return {
        label: "Authorisation request sent",
        description: "Open the secure request from your email and complete the bank authorisation there.",
        action: "If the request is missing or expired, contact FoxTutor.",
        tone: "info"
      };
    case "PENDING_AUTHORISATION":
      return {
        label: "Setup is awaiting your authorisation",
        description: "Complete the secure authorisation request. The provider may then take up to three working days to finish setup.",
        action: "Return here after authorising to check whether Direct Debit is active.",
        tone: "warning"
      };
    case "ACTIVE":
      return {
        label: "Direct Debit is active",
        description: "Your payment method is ready for eligible FoxTutor lesson collections.",
        action: "No action is needed.",
        tone: "success"
      };
    case "FAILED":
      return {
        label: "Direct Debit setup needs attention",
        description: "The payment provider has not confirmed an active mandate.",
        action: "Contact FoxTutor so the setup can be checked safely.",
        tone: "error"
      };
    case "UNKNOWN":
      return {
        label: "We're checking the status of your Direct Debit",
        description: "FoxTutor could not safely confirm the current provider status.",
        action: "Do not submit bank details to FoxTutor Learn. Contact FoxTutor if this persists.",
        tone: "warning"
      };
  }
}
