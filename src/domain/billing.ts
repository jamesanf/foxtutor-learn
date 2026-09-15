import { formatMinorUnits } from "./accounting";

export type BillingEventType = "WEEKLY_LESSON" | "ADMIN_CANCELLATION";
export type CreditLedgerTransactionType = "GRANT" | "CONSUMPTION" | "REFUND" | "REVERSAL";

export interface AvailableCredit {
  creditId: string;
  remainingMinor: bigint;
  createdAt: string;
}

export interface CreditAllocation {
  creditId: string;
  amountMinor: bigint;
}

export interface InvoiceCreditApplication {
  grossAmountMinor: bigint;
  creditAppliedMinor: bigint;
  netAmountMinor: bigint;
  allocations: CreditAllocation[];
}

export interface BillingDates {
  lessonDate: string;
  billingDate: string;
  dueDate: string | null;
  collectionDate: string;
  cancellationDate: string | null;
  creditNoteDate: string | null;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Billing dates must be ISO calendar dates.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (parsed.toISOString().slice(0, 10) !== value) throw new Error("Billing dates must be valid ISO calendar dates.");
  return parsed;
}

export function subtractCalendarDays(date: string, days: number): string {
  if (!Number.isInteger(days) || days < 0) throw new Error("Calendar day count must be a non-negative integer.");
  const result = parseDate(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result.toISOString().slice(0, 10);
}

export function collectionDateSevenDaysBeforeLesson(lessonDate: string): string {
  return subtractCalendarDays(lessonDate, 7);
}

export function isCollectionDateReached(collectionDate: string, today: string): boolean {
  parseDate(collectionDate);
  parseDate(today);
  return collectionDate <= today;
}

export function isInvoiceIssuanceReached(collectionDate: string, now: string): boolean {
  parseDate(collectionDate);
  const instant = new Date(now);
  if (!Number.isFinite(instant.getTime())) throw new Error("Billing issuance time must be a valid instant.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const londonDate = `${value("year")}-${value("month")}-${value("day")}`;
  const londonTime = `${value("hour")}:${value("minute")}`;
  return collectionDate < londonDate || (collectionDate === londonDate && londonTime >= "22:00");
}

export function applyAvailableCredits(
  grossAmountMinor: bigint,
  credits: readonly AvailableCredit[]
): InvoiceCreditApplication {
  if (grossAmountMinor <= 0n) throw new Error("Invoice gross amount must be positive.");
  let remaining = grossAmountMinor;
  const allocations: CreditAllocation[] = [];
  for (const credit of credits) {
    if (remaining === 0n) break;
    if (credit.remainingMinor <= 0n) continue;
    const amount = credit.remainingMinor < remaining ? credit.remainingMinor : remaining;
    allocations.push({ creditId: credit.creditId, amountMinor: amount });
    remaining -= amount;
  }
  return {
    grossAmountMinor,
    creditAppliedMinor: grossAmountMinor - remaining,
    netAmountMinor: remaining,
    allocations
  };
}

export function assertCreditInvariant(originalMinor: bigint, consumedMinor: bigint): void {
  if (originalMinor <= 0n) throw new Error("Credit amount must be positive.");
  if (consumedMinor < 0n || consumedMinor > originalMinor) {
    throw new Error("Credit consumption must remain within the original credit amount.");
  }
}

export function creditStatus(originalMinor: bigint, consumedMinor: bigint, refundedMinor = 0n): "AVAILABLE" | "PARTIALLY_CONSUMED" | "CONSUMED" | "REFUNDED" {
  assertCreditInvariant(originalMinor, consumedMinor + refundedMinor);
  if (refundedMinor === originalMinor) return "REFUNDED";
  if (consumedMinor === originalMinor) return "CONSUMED";
  if (consumedMinor > 0n || refundedMinor > 0n) return "PARTIALLY_CONSUMED";
  return "AVAILABLE";
}

export function billingReference(prefix: "INV" | "CRN" | "BILL", id: string): string {
  const uuid = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  const date = id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1];
  if (uuid) return `FT-${prefix}-${uuid.toUpperCase()}${date ? `-${date}` : ""}`;
  const compact = id.replace(/[^A-Za-z0-9]/g, "");
  if (!compact) throw new Error("Billing reference requires a stable identifier.");
  return `FT-${prefix}-${compact}`;
}

export function datedInvoiceReference(date: string, sequence: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(sequence) || sequence < 1 || sequence > 99) {
    throw new Error("Dated invoice references require a valid date and a sequence from 1 to 99.");
  }
  return `FT-INV-${date.slice(2).replaceAll("-", "")}${String(sequence).padStart(2, "0")}`;
}

export function creditGrantIdempotencyKey(sourceEventId: string): string {
  return `credit-grant:${sourceEventId}`;
}

export function creditConsumptionIdempotencyKey(invoiceId: string, creditId: string): string {
  return `credit-consumption:${invoiceId}:${creditId}`;
}

export function refundIdempotencyKey(refundId: string): string {
  return `credit-refund:${refundId}`;
}

export function creditApplicationIsRecoverable(status: "RECORDED" | "PROVIDER_PENDING" | "PROVIDER_APPLIED" | "PROVIDER_FAILED" | "RECONCILIATION_REQUIRED"): boolean {
  return status !== "PROVIDER_APPLIED";
}

export function billingAmountText(amountMinor: bigint): string {
  if (amountMinor <= 0n) throw new Error("Billing amount must be positive.");
  return formatMinorUnits(amountMinor);
}

export function billingDatesForLesson(input: {
  lessonDate: string;
  billingDate: string;
  dueDate?: string | null;
  collectionDate?: string;
}): BillingDates {
  parseDate(input.billingDate);
  if (input.dueDate) parseDate(input.dueDate);
  const collectionDate = input.collectionDate ?? collectionDateSevenDaysBeforeLesson(input.lessonDate);
  parseDate(collectionDate);
  return {
    lessonDate: input.lessonDate,
    billingDate: input.billingDate,
    dueDate: input.dueDate ?? null,
    collectionDate,
    cancellationDate: null,
    creditNoteDate: null
  };
}
