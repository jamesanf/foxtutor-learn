import type { FreeAgentDirectDebitMandateState, FreeAgentInvoice } from "./client";

export type SyntheticFixtureLabel =
  | "LOCAL_PROVIDER_FIXTURE"
  | "SYNTHETIC_GOCARDLESS_FIXTURE";

export interface FreeAgentContactFixture {
  label: "LOCAL_PROVIDER_FIXTURE";
  contact: {
    url: string;
    first_name: string;
    last_name: string;
    email: string;
    direct_debit_mandate_state?: FreeAgentDirectDebitMandateState | null;
  };
}

export interface GoCardlessPaymentFixture {
  label: "SYNTHETIC_GOCARDLESS_FIXTURE";
  status: "scheduled" | "submitted" | "pending" | "confirmed" | "failed";
  amount: string;
  currency: "GBP";
  providerReference: string;
  relatedInvoiceReference: string;
  relatedMandateReference: string;
}

const contactStates: Record<string, FreeAgentDirectDebitMandateState | null> = {
  setup: "setup",
  pending: "pending",
  inactive: "inactive",
  active: "active",
  failed: "failed",
  null: null,
  unknown: "future_provider_state"
};

export function freeAgentContactFixture(
  state: keyof typeof contactStates,
  input: { id?: string; email?: string } = {}
): FreeAgentContactFixture {
  const id = input.id ?? "900001";
  return {
    label: "LOCAL_PROVIDER_FIXTURE",
    contact: {
      url: `https://api.sandbox.freeagent.com/v2/contacts/${id}`,
      first_name: "Synthetic",
      last_name: "Customer",
      email: input.email ?? "synthetic@example.invalid",
      direct_debit_mandate_state: contactStates[state]
    }
  };
}

export function freeAgentInvoiceFixture(
  status: "Open" | "Paid" | "Payment pending" | "Payment submitted" | "Payment failed",
  input: { id?: string; reference?: string; paymentStatus?: string } = {}
): FreeAgentInvoice {
  const id = input.id ?? "910001";
  return {
    url: `https://api.sandbox.freeagent.com/v2/invoices/${id}`,
    reference: input.reference ?? "FT-SYNTHETIC-001",
    status,
    paymentStatus: input.paymentStatus ?? status
  };
}

export function goCardlessPaymentFixture(
  status: GoCardlessPaymentFixture["status"],
  input: Partial<Omit<GoCardlessPaymentFixture, "label" | "status">> = {}
): GoCardlessPaymentFixture {
  return {
    label: "SYNTHETIC_GOCARDLESS_FIXTURE",
    status,
    amount: input.amount ?? "55.00",
    currency: "GBP",
    providerReference: input.providerReference ?? "PM_SYNTHETIC_001",
    relatedInvoiceReference: input.relatedInvoiceReference ?? "INV_SYNTHETIC_001",
    relatedMandateReference: input.relatedMandateReference ?? "MD_SYNTHETIC_001"
  };
}
