import {
  claimBillingInvoiceOperation,
  createBillingAlert,
  ensureBillingInvoiceForEvent,
  findBillingEvent,
  findBillingInvoice,
  invoiceCancellationStatement,
  listDueBillingInvoiceOperations,
  markBillingInvoiceOperation,
  applyCreditToInvoice,
  reverseInvoiceCreditApplications,
  resetInvoiceCreditAllocation,
  updateBillingEventStatus,
  updateBillingInvoice,
  type BillingInvoiceOperation,
  type BillingEvent
} from "../db/billing";
import { findExternalAccountingLink } from "../db/accounting";
import {
  configuredInvoiceFromDatabase,
  providerCall,
  type AccountingEnvironment
} from "../accounting/service";
import { FreeAgentApiError, freeAgentFetch } from "../accounting/freeagent/client";
import { formatMinorUnits, nextAccountingRetryAt } from "../domain/accounting";
import { datedInvoiceReference, isCollectionDateReached } from "../domain/billing";
import { classifyDirectDebitState } from "../domain/direct-debit";
import { mapFreeAgentInvoicePaymentStatus, mapFreeAgentPaymentStatus } from "../domain/payment-status";
import { sendMailDetailed, type MailDeliveryResult, type MailEnvironment } from "../mail/client";
import { frame } from "../notifications/templates";

function providerReference(url: string): string {
  return url.split("/").pop() ?? url;
}

function providerFailure(error: unknown): FreeAgentApiError | null {
  return error instanceof FreeAgentApiError ? error : null;
}

function providerAmountIsPositive(value: string | null | undefined): boolean {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function providerAmountIsNotOutstanding(value: string | null | undefined): boolean {
  const amount = Number(value);
  return Number.isFinite(amount) && amount <= 0;
}

function escapeMailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character
  ));
}

class BillingMailError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly unknown: boolean
  ) {
    super(message);
    this.name = "BillingMailError";
  }
}

export interface CreditSourceProvenance {
  invoiceReference: string | null;
  lessonDate: string | null;
  amountMinor: number | string;
}

function statementDate(value: string | null): string {
  if (!value) return "date not recorded";
  const [year, month, day] = value.split("-");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${day} ${months[Number(month) - 1] ?? month} ${year}`;
}

function sourceProvenanceText(source: CreditSourceProvenance): string {
  const origin = source.invoiceReference
    ? `Invoice ${source.invoiceReference}`
    : "a previous FoxTutor credit from a cancelled lesson";
  const lesson = source.lessonDate ? ` - lesson on ${statementDate(source.lessonDate)}` : "";
  return `${origin}${lesson} - £${formatMinorUnits(BigInt(source.amountMinor))}`;
}

export function renderCreditCoveredStatement(
  studentName: string,
  invoiceReference: string,
  lessonDate: string,
  amountMinor: number | string,
  sources: CreditSourceProvenance[]
): { subject: string; text: string; html: string } {
  const sourceLines = sources.length
    ? sources.map(sourceProvenanceText)
    : ["a previous FoxTutor credit; source lesson history is not available"];
  const sourceHtml = sourceLines.map((line) => `<li>${escapeMailHtml(line)}</li>`).join("");
  const coveredLesson = statementDate(lessonDate);
  const amount = formatMinorUnits(BigInt(amountMinor));
  const sourceLabel = sourceLines.length === 1 ? "Credit source" : "Credit sources";
  const text = `Hello ${studentName},\n\nYour FoxTutor lesson on ${coveredLesson} has been paid for using credit from an earlier FoxTutor payment. No payment is needed from you.\n\nStatement reference: ${invoiceReference}\n\nLesson paid for: ${coveredLesson}\nLesson fee: £${amount}\nCredit used: £${amount}\n${sourceLabel}:\n- ${sourceLines.join("\n- ")}\nAmount due: £0.00\n\nYou do not need to make a payment or set up Direct Debit for this lesson.\n\nThis statement is for your records. If you have any questions, please contact billing@foxtutor.org.`;
  const htmlBody = `<p>Hello ${escapeMailHtml(studentName)},</p><p>Your FoxTutor lesson on <strong>${escapeMailHtml(coveredLesson)}</strong> has been paid for using credit from an earlier FoxTutor payment. No payment is needed from you.</p><dl><dt>Statement reference</dt><dd>${escapeMailHtml(invoiceReference)}</dd><dt>Lesson paid for</dt><dd>${escapeMailHtml(coveredLesson)}</dd><dt>Lesson fee</dt><dd>£${escapeMailHtml(amount)}</dd><dt>Credit used</dt><dd>£${escapeMailHtml(amount)}</dd><dt>${sourceLabel}</dt><dd><ul>${sourceHtml}</ul></dd><dt>Amount due</dt><dd>£0.00</dd></dl><p>You do not need to make a payment or set up Direct Debit for this lesson.</p><p>This statement is for your records. If you have any questions, please contact <a href="mailto:billing@foxtutor.org">billing@foxtutor.org</a>.</p>`;
  return {
    subject: `Your FoxTutor lesson is paid - ${coveredLesson}`,
    text,
    html: frame("Payment received", "FoxTutor Learn", htmlBody, "Billing")
  };
}

function legacyInvoiceReference(id: string): string {
  const compact = id.replace(/[^A-Za-z0-9]/g, "");
  if (!compact) throw new Error("Billing reference requires a stable identifier.");
  return `FT-INV-${compact}`;
}

async function creditSourceProvenance(db: D1Database, invoiceId: string): Promise<CreditSourceProvenance[]> {
  const result = await db.prepare(
    `SELECT DISTINCT a.amount_minor,
            source_invoice.freeagent_reference,
            source_reference.business_date,
            source_reference.sequence,
            COALESCE(c.source_lesson_id, source_event.lesson_id) AS source_lesson_id,
            COALESCE(source_event.lesson_date, substr(source_lesson.start_at, 1, 10)) AS source_lesson_date
     FROM billing_invoice_credit_applications a
     JOIN customer_credits c ON c.id = a.credit_id
     LEFT JOIN billing_events source_event
       ON source_event.id = c.source_event_id
       OR (c.source_lesson_id IS NOT NULL AND source_event.lesson_id = c.source_lesson_id)
     LEFT JOIN lessons source_lesson ON source_lesson.id = c.source_lesson_id
     LEFT JOIN billing_invoices source_invoice ON source_invoice.billing_event_id = source_event.id
     LEFT JOIN billing_invoice_references source_reference ON source_reference.invoice_id = source_invoice.id
     WHERE a.invoice_id = ?`
  ).bind(invoiceId).all<{
    amount_minor: number | string;
    freeagent_reference: string | null;
    business_date: string | null;
    sequence: number | string | null;
    source_lesson_id: string | null;
    source_lesson_date: string | null;
  }>();
  return result.results
    .map((row) => ({
      invoiceReference: row.business_date && row.sequence !== null
        ? datedInvoiceReference(row.business_date, Number(row.sequence))
        : row.freeagent_reference?.startsWith("FT-INV-") ? row.freeagent_reference : null,
      lessonDate: row.source_lesson_date,
      amountMinor: row.amount_minor
    }));
}

async function invoiceReferenceFor(
  db: D1Database,
  invoice: { id: string; created_at: string }
): Promise<string> {
  const createdDate = invoice.created_at.slice(0, 10);
  const existing = await db.prepare(
    "SELECT sequence FROM billing_invoice_references WHERE invoice_id = ?"
  ).bind(invoice.id).first<{ sequence: number | string }>();
  if (existing) return datedInvoiceReference(createdDate, Number(existing.sequence));

  for (let attempt = 0; attempt < 99; attempt += 1) {
    const assigned = await db.prepare(
      "SELECT sequence FROM billing_invoice_references WHERE invoice_id = ?"
    ).bind(invoice.id).first<{ sequence: number | string }>();
    if (assigned) return datedInvoiceReference(createdDate, Number(assigned.sequence));
    const latest = await db.prepare(
      "SELECT MAX(sequence) AS sequence FROM billing_invoice_references WHERE business_date = ?"
    ).bind(createdDate).first<{ sequence: number | string | null }>();
    const sequence = Number(latest?.sequence ?? 0) + 1;
    if (sequence > 99) {
      throw new Error(`Invoice reference sequence exhausted for ${createdDate}.`);
    }
    try {
      await db.prepare(
        `INSERT INTO billing_invoice_references (invoice_id, business_date, sequence)
         VALUES (?, ?, ?)`
      ).bind(invoice.id, createdDate, sequence).run();
      return datedInvoiceReference(createdDate, sequence);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.toUpperCase().includes("UNIQUE")) throw error;
    }
  }
  throw new Error(`Unable to allocate an invoice reference sequence for ${createdDate}.`);
}

export function renderCreditCoveredInvoiceComment(sourceReferences: string[]): string {
  const safeReferences = sourceReferences.filter((reference) => /^FT-INV-\d{8,10}$/.test(reference));
  return `Credit from ${safeReferences.length ? `invoice ${safeReferences.join(", ")}` : "a previous FoxTutor invoice"} applied to this lesson; amount due £0.00. Direct Debit is not required. Please ignore the payment details above.`;
}

async function sendCreditCoveredStatement(
  db: D1Database,
  env: AccountingEnvironment & MailEnvironment,
  event: BillingEvent,
  invoiceReference: string,
  lessonDate: string,
  sourceProvenance: CreditSourceProvenance[],
  fetcher: typeof fetch
): Promise<Extract<MailDeliveryResult, { kind: "accepted" }>> {
  const student = await db.prepare("SELECT name, email FROM students WHERE id = ?")
    .bind(event.student_id)
    .first<{ name: string; email: string }>();
  if (!student?.email) throw new Error("A student email is required for the credit-covered billing statement.");
  const { subject, text, html } = renderCreditCoveredStatement(
    student.name,
    invoiceReference,
    lessonDate,
    event.gross_amount_minor,
    sourceProvenance
  );
  const result = await sendMailDetailed(env, {
    to: student.email,
    fromAddress: env.MAIL_API_BILLING_FROM ?? "billing@foxtutor.org",
    fromName: "FoxTutor Billing",
    replyTo: env.MAIL_API_REPLY_TO,
    subject,
    text,
    html,
    idempotencyKey: `billing-credit-statement-${event.id}`
  }, fetcher);
  if (result.kind === "failed") {
    throw new BillingMailError(result.safeMessage, result.retryable, result.unknown);
  }
  return result;
}

async function markOperationFailure(
  db: D1Database,
  operation: BillingInvoiceOperation,
  now: string,
  error: unknown,
  context: { studentId?: string | null; lessonId?: string | null; billingEventId?: string | null; invoiceId?: string | null }
): Promise<void> {
  console.error("billing_invoice_operation_failed", {
    operationId: operation.id,
    operationType: operation.operation_type,
    invoiceId: context.invoiceId ?? null,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message.slice(0, 200) : "Unknown billing provider failure"
  });
  const apiError = providerFailure(error);
  const shape = apiError?.shape;
  const code = shape?.code ?? "UNKNOWN";
  const message = apiError?.message ?? "Billing provider operation failed.";
  const unknown = Boolean(shape?.unknown) || code === "NETWORK" || code === "TIMEOUT";
  const mailError = error instanceof BillingMailError;
  const effectiveUnknown = mailError ? error.unknown : unknown;
  const effectiveRetryable = mailError ? error.retryable : shape?.retryable;
  const status = effectiveUnknown ? "UNKNOWN" : effectiveRetryable ? "RETRYABLE" : "FAILED";
  const retryAt = status === "RETRYABLE"
    ? shape?.retryAfterSeconds
      ? new Date(Date.parse(now) + shape.retryAfterSeconds * 1000).toISOString()
      : nextAccountingRetryAt(now, operation.attempt_count)
    : null;
  await markBillingInvoiceOperation(db, operation.id, {
    status,
    providerStatus: shape?.status ? String(shape.status) : mailError ? "MAIL_PROVIDER" : "ERROR",
    safeErrorCode: mailError ? "MAIL_PROVIDER" : code,
    safeErrorMessage: message,
    nextAttemptAt: retryAt
  }, now);
  if (context.invoiceId && operation.operation_type !== "CANCEL_INVOICE" && status === "FAILED") {
    await reverseInvoiceCreditApplications(db, context.invoiceId, now);
    await updateBillingInvoice(db, context.invoiceId, {
      status: "FAILED",
      providerStatus: mailError ? "MAIL_PROVIDER_FAILED" : "PROVIDER_FAILED",
      now
    });
  } else if (context.invoiceId && operation.operation_type !== "CANCEL_INVOICE" && mailError && status === "UNKNOWN") {
    await reverseInvoiceCreditApplications(db, context.invoiceId, now);
    const event = context.billingEventId ? await findBillingEvent(db, context.billingEventId) : null;
    if (event) {
      await resetInvoiceCreditAllocation(db, context.invoiceId, event.id, BigInt(event.gross_amount_minor), now);
    }
    await updateBillingInvoice(db, context.invoiceId, {
      status: "UNKNOWN",
      providerStatus: "RECONCILIATION_REQUIRED",
      now
    });
  } else if (context.invoiceId && operation.operation_type !== "CANCEL_INVOICE" && status === "UNKNOWN") {
    await updateBillingInvoice(db, context.invoiceId, {
      status: "UNKNOWN",
      providerStatus: "RECONCILIATION_REQUIRED",
      now
    });
  }
  if (context.billingEventId && operation.operation_type !== "CANCEL_INVOICE" && (status === "FAILED" || status === "UNKNOWN")) {
    await updateBillingEventStatus(
      db,
      context.billingEventId,
      status === "FAILED" ? "FAILED" : "UNKNOWN",
      now,
      null,
      null,
      status === "FAILED" ? "PROVIDER_FAILED" : "RECONCILIATION_REQUIRED"
    );
  }
  await createBillingAlert(db, {
    id: `billing-alert:${operation.id}:${status}`,
    deduplicationKey: `billing-operation:${operation.id}:${status}`,
    alertType: effectiveUnknown ? "PROVIDER_TIMEOUT" : status === "FAILED" ? "INVOICE_CREATION_FAILURE" : "RECONCILIATION_REQUIRED",
    severity: effectiveUnknown || status === "FAILED" ? "ERROR" : "WARNING",
    studentId: context.studentId,
    lessonId: context.lessonId,
    billingEventId: context.billingEventId,
    invoiceId: context.invoiceId,
    currentState: `${operation.operation_type}:${status}`,
    recommendedAction: effectiveUnknown
      ? "Reconcile the provider reference before retrying."
      : status === "FAILED"
        ? "Review the provider error and correct the billing configuration."
        : "Allow the bounded retry or reconcile the provider operation.",
    now
  });
}

async function processCreateInvoice(
  db: D1Database,
  env: AccountingEnvironment,
  operation: BillingInvoiceOperation,
  now: string,
  fetcher: typeof fetch
): Promise<void> {
  const invoice = await findBillingInvoice(db, operation.invoice_id);
  if (!invoice) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "INVOICE_NOT_FOUND",
      safeErrorCode: "VALIDATION",
      safeErrorMessage: "The local billing invoice does not exist."
    }, now);
    return;
  }
  const event = await findBillingEvent(db, invoice.billing_event_id);
  if (!event || event.status === "CANCELLED") {
    await updateBillingInvoice(db, invoice.id, { status: "CANCELLED", providerStatus: "LESSON_CANCELLED", now });
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "LESSON_CANCELLED",
      safeErrorCode: "CANCELLED",
      safeErrorMessage: "Cancelled lessons are never invoiced."
    }, now);
    return;
  }
  const allocated = BigInt(invoice.credit_applied_minor) > 0n
    ? { creditAppliedMinor: BigInt(invoice.credit_applied_minor), netAmountMinor: BigInt(invoice.net_amount_minor) }
    : await applyCreditToInvoice(db, {
      invoiceId: invoice.id,
      billingEventId: event.id,
      payerStudentId: event.payer_student_id,
      grossAmountMinor: BigInt(invoice.gross_amount_minor),
      now
    });
  try {
    const lessonDate = event.lesson_date ?? event.billing_date ?? now.slice(0, 10);
    const collectionDate = event.collection_date ?? lessonDate;
    const zeroValue = allocated.netAmountMinor === 0n;
    const reference = await invoiceReferenceFor(db, invoice);
    const sourceProvenance = zeroValue ? await creditSourceProvenance(db, invoice.id) : [];
    const comments = `Direct Debit collection scheduled for ${collectionDate} (7 days before the lesson).`;
    if (zeroValue) {
      const delivery = await sendCreditCoveredStatement(db, env, event, reference, lessonDate, sourceProvenance, fetcher);
      await updateBillingInvoice(db, invoice.id, {
        status: "PAID",
        creditAppliedMinor: allocated.creditAppliedMinor,
        netAmountMinor: allocated.netAmountMinor,
        freeagentReference: reference,
        freeagentUrl: null,
        providerStatus: "CREDIT_COVERED_EMAIL",
        now
      });
      await updateBillingEventStatus(db, event.id, "SETTLED", now, reference, null, "CREDIT_COVERED_EMAIL");
      await markBillingInvoiceOperation(db, operation.id, {
        status: "SUCCEEDED",
        providerReference: delivery.providerReference ?? reference,
        providerStatus: "CREDIT_COVERED_EMAIL"
      }, now);
      return;
    }
    const environment = env.FREEAGENT_ENVIRONMENT === "sandbox" || env.FREEAGENT_ENVIRONMENT === "production"
      ? env.FREEAGENT_ENVIRONMENT
      : null;
    if (!environment || invoice.provider_environment !== environment) {
      await markBillingInvoiceOperation(db, operation.id, {
        status: "BLOCKED",
        providerStatus: "ENVIRONMENT_MISMATCH",
        safeErrorCode: "CONFIGURATION",
        safeErrorMessage: "The billing invoice is not associated with the selected FreeAgent environment."
      }, now);
      return;
    }
    const config = await configuredInvoiceFromDatabase(db, env, now);
    const link = await findExternalAccountingLink(db, event.student_id, env.FREEAGENT_ENVIRONMENT === "sandbox" || env.FREEAGENT_ENVIRONMENT === "production" ? env.FREEAGENT_ENVIRONMENT : undefined);
    if (!config || !link || link.status !== "VERIFIED") {
      await reverseInvoiceCreditApplications(db, invoice.id, now);
      await resetInvoiceCreditAllocation(db, invoice.id, event.id, BigInt(invoice.gross_amount_minor), now);
      await markBillingInvoiceOperation(db, operation.id, {
        status: "RETRYABLE",
        providerStatus: !config ? "BILLING_MAPPING_REQUIRED" : "CONTACT_MAPPING_REQUIRED",
        safeErrorCode: "CONFIGURATION",
        safeErrorMessage: !config
          ? "FreeAgent billing mapping is not configured."
          : "A verified FreeAgent contact mapping is required.",
        nextAttemptAt: nextAccountingRetryAt(now, operation.attempt_count)
      }, now);
      await createBillingAlert(db, {
        id: `billing-alert:${operation.id}:configuration`,
        deduplicationKey: `billing-operation:${operation.id}:configuration`,
        alertType: !config ? "INVOICE_CREATION_FAILURE" : "INVOICE_NOT_CREATED",
        severity: "ERROR",
        studentId: event.student_id,
        payerStudentId: event.payer_student_id,
        lessonId: event.lesson_id,
        billingEventId: event.id,
        invoiceId: invoice.id,
        currentState: "INVOICE_BLOCKED",
        recommendedAction: !config ? "Configure the approved FreeAgent billing mapping." : "Verify the payer's FreeAgent contact mapping.",
        now
      });
      return;
    }
    const legacyReference = legacyInvoiceReference(event.id);
    let existing = await providerCall(db, env, now, fetcher, (client, token) =>
      client.findInvoiceByReference(token, link.external_url, legacyReference)
    );
    const providerReferenceValue = existing ? legacyReference : reference;
    if (!existing && providerReferenceValue !== legacyReference) {
      existing = await providerCall(db, env, now, fetcher, (client, token) =>
        client.findInvoiceByReference(token, link.external_url, providerReferenceValue)
      );
    }
    const contact = await providerCall(db, env, now, fetcher, (client, token) =>
      client.getContact(token, link.external_url)
    );
    const mandateState = classifyDirectDebitState(
      contact?.directDebitMandateState ?? null,
      Boolean(contact)
    );
    const draft = existing ?? await providerCall(db, env, now, fetcher, (client, token) =>
      client.createDraftInvoice(token, {
        contactUrl: link.external_url,
        reference: providerReferenceValue,
        datedOn: lessonDate,
        paymentTermsInDays: config.paymentTermsInDays,
        itemType: config.itemType,
        description: `FoxTutor lesson ${lessonDate} (1 Unit; 55 minutes)`,
        comments,
        price: formatMinorUnits(allocated.netAmountMinor),
        categoryUrl: config.categoryUrl,
        currency: config.currency,
        salesTaxRate: config.salesTaxRate,
        enableGoCardless: config.currency === "GBP" && mandateState.status === "ACTIVE"
      })
    );
    const sent = !draft.status || draft.status === "Draft"
      ? await providerCall(db, env, now, fetcher, (client, token) => client.markInvoiceSent(token, draft.url))
      : draft;
    const readBack = await providerCall(db, env, now, fetcher, (client, token) =>
      client.getInvoice(token, sent.url)
    );
    if (!readBack) throw new Error("FreeAgent invoice was not found after it was sent.");
    const referenceId = providerReference(readBack.url);
    await updateBillingInvoice(db, invoice.id, {
      status: zeroValue ? "PAID" : "SENT",
      creditAppliedMinor: allocated.creditAppliedMinor,
      netAmountMinor: allocated.netAmountMinor,
      freeagentReference: referenceId,
      freeagentUrl: readBack.url,
      providerStatus: zeroValue ? "CREDIT_COVERED" : (readBack.status ?? "SENT"),
      now
    });
    await updateBillingEventStatus(db, event.id, zeroValue ? "SETTLED" : "INVOICE_CREATED", now, referenceId, readBack.url, zeroValue ? "CREDIT_COVERED" : (readBack.status ?? "SENT"));
    await markBillingInvoiceOperation(db, operation.id, {
      status: "SUCCEEDED",
      providerReference: referenceId,
      providerUrl: readBack.url,
      providerStatus: zeroValue ? "CREDIT_COVERED" : (readBack.status ?? "SENT")
    }, now);
    const currentEvent = await findBillingEvent(db, event.id);
    if (currentEvent?.status === "CANCELLED") {
      await db.batch([invoiceCancellationStatement(db, invoice.id, now)]);
    }
  } catch (error) {
    await markOperationFailure(db, operation, now, error, {
      studentId: event.student_id,
      lessonId: event.lesson_id,
      billingEventId: event.id,
      invoiceId: invoice.id
    });
  }
}

async function processDirectDebit(
  db: D1Database,
  env: AccountingEnvironment,
  operation: BillingInvoiceOperation,
  now: string,
  fetcher: typeof fetch
): Promise<void> {
  const invoice = await findBillingInvoice(db, operation.invoice_id);
  if (!invoice || !invoice.freeagent_reference || BigInt(invoice.net_amount_minor) <= 0n) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "ZERO_OR_MISSING_INVOICE",
      safeErrorCode: "VALIDATION",
      safeErrorMessage: "Direct Debit requires a sent invoice with a positive outstanding amount."
    }, now);
    return;
  }
  const environment = env.FREEAGENT_ENVIRONMENT === "sandbox" || env.FREEAGENT_ENVIRONMENT === "production"
    ? env.FREEAGENT_ENVIRONMENT
    : null;
  if (!environment || invoice.provider_environment !== environment) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "ENVIRONMENT_MISMATCH",
      safeErrorCode: "CONFIGURATION",
      safeErrorMessage: "The billing invoice is not associated with the selected FreeAgent environment."
    }, now);
    return;
  }
  const event = await findBillingEvent(db, invoice.billing_event_id);
  if (!event || event.status === "CANCELLED") {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "LESSON_CANCELLED",
      safeErrorCode: "CANCELLED",
      safeErrorMessage: "Cancelled lessons are never collected."
    }, now);
    return;
  }
  const cancellationPending = await db.prepare(
    `SELECT 1 FROM billing_invoice_operations
     WHERE invoice_id = ? AND operation_type = 'CANCEL_INVOICE'
       AND status IN ('PENDING', 'PROCESSING')
     LIMIT 1`
  ).bind(invoice.id).first<{ 1: number }>();
  if (cancellationPending) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "CANCELLATION_PENDING",
      safeErrorCode: "CANCELLATION_PENDING",
      safeErrorMessage: "Direct Debit is blocked while provider invoice cancellation is pending."
    }, now);
    return;
  }
  if (environment === "production" && invoice.net_amount_minor.toString() === "100" && !operation.human_authorized_at) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "HUMAN_AUTHORIZATION_REQUIRED",
      safeErrorCode: "HUMAN_AUTHORIZATION_REQUIRED",
      safeErrorMessage: "The controlled £1 Production Direct Debit requires explicit administrator authorization."
    }, now);
    return;
  }
  if (!invoice.collection_date || !isCollectionDateReached(invoice.collection_date, now.slice(0, 10))) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "RETRYABLE",
      providerStatus: "NOT_YET_DUE",
      nextAttemptAt: `${invoice.collection_date ?? now.slice(0, 10)}T00:00:00.000Z`
    }, now);
    return;
  }
  const link = await findExternalAccountingLink(db, event.student_id, env.FREEAGENT_ENVIRONMENT === "sandbox" || env.FREEAGENT_ENVIRONMENT === "production" ? env.FREEAGENT_ENVIRONMENT : undefined);
  if (!link || link.status !== "VERIFIED") {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "CONTACT_MAPPING_REQUIRED",
      safeErrorCode: "CONTACT_MAPPING_REQUIRED",
      safeErrorMessage: "A verified FreeAgent contact mapping is required before collection."
    }, now);
    return;
  }
  try {
    const providerInvoice = await providerCall(db, env, now, fetcher, (client, token) =>
      client.getInvoice(token, invoice.freeagent_reference!)
    );
    if (!providerInvoice) {
      await markBillingInvoiceOperation(db, operation.id, {
        status: "BLOCKED",
        providerStatus: "INVOICE_NOT_FOUND",
        safeErrorCode: "INVOICE_NOT_FOUND",
        safeErrorMessage: "The FreeAgent invoice could not be read before collection."
      }, now);
      return;
    }
    const invoiceStatus = (providerInvoice.status ?? "").toLowerCase();
    if (invoiceStatus === "paid" || providerAmountIsPositive(providerInvoice.paidValue) || providerAmountIsNotOutstanding(providerInvoice.dueValue)) {
      await markBillingInvoiceOperation(db, operation.id, {
        status: "BLOCKED",
        providerStatus: "INVOICE_ALREADY_PAID",
        safeErrorCode: "INVOICE_ALREADY_PAID",
        safeErrorMessage: "A Direct Debit collection cannot be initiated for an already-paid invoice."
      }, now);
      return;
    }
    if (!["sent", "open"].includes(invoiceStatus)) {
      await markBillingInvoiceOperation(db, operation.id, {
        status: "BLOCKED",
        providerStatus: "INVOICE_NOT_READY",
        safeErrorCode: "INVOICE_NOT_SENT",
        safeErrorMessage: "Direct Debit requires a FreeAgent invoice in Sent or Open status."
      }, now);
      return;
    }
    if (providerInvoice.paymentMethods?.gocardless_preauth !== true) {
      await markBillingInvoiceOperation(db, operation.id, {
        status: "BLOCKED",
        providerStatus: "DIRECT_DEBIT_NOT_READY",
        safeErrorCode: "GOCARDLESS_PREAUTH_UNAVAILABLE",
        safeErrorMessage: "The FreeAgent invoice is not Direct-Debit-ready."
      }, now);
      return;
    }
    const mandate = await providerCall(db, env, now, fetcher, (client, token) => client.getContact(token, link.external_url));
    const mandateState = classifyDirectDebitState(mandate?.directDebitMandateState ?? null, Boolean(mandate));
    if (mandateState.status !== "ACTIVE") {
      const isUnknown = mandateState.status === "UNKNOWN";
      await markBillingInvoiceOperation(db, operation.id, {
        status: "BLOCKED",
        providerStatus: mandateState.diagnosticCode ?? mandateState.status,
        safeErrorCode: isUnknown ? mandateState.diagnosticCode ?? "UNKNOWN" : "MANDATE_INACTIVE",
        safeErrorMessage: mandateState.diagnosticMessage ?? "The FreeAgent GoCardless mandate is not active."
      }, now);
      await createBillingAlert(db, {
        id: `billing-alert:${operation.id}:mandate`,
        deduplicationKey: `billing-operation:${operation.id}:mandate`,
        alertType: isUnknown ? "RECONCILIATION_REQUIRED" : "MANDATE_INACTIVE",
        severity: "ERROR",
        studentId: event.student_id,
        payerStudentId: event.payer_student_id,
        lessonId: event.lesson_id,
        billingEventId: event.id,
        invoiceId: invoice.id,
        currentState: `MANDATE_${mandateState.status}`,
        recommendedAction: "Complete or repair the customer's FreeAgent Direct Debit mandate.",
        now
      });
      return;
    }
    const payment = await providerCall(db, env, now, fetcher, (client, token) =>
      client.initiateDirectDebit(token, invoice.freeagent_reference!)
    );
    const providerStatus = payment.status ?? "Unknown";
    const paymentStatus = mapFreeAgentPaymentStatus(providerStatus);
    await db.prepare(
      `INSERT INTO billing_payments
       (id, invoice_id, method, status, provider_reference, provider_status,
        collection_date, first_payment, idempotency_key, provider_environment, created_at, updated_at)
       VALUES (?, ?, 'FREEAGENT_GOCARDLESS', ?, ?, ?, ?, 0, ?, ?, ?, ?)
       ON CONFLICT(invoice_id) DO UPDATE SET
         status = excluded.status, provider_reference = excluded.provider_reference,
         provider_status = excluded.provider_status, updated_at = excluded.updated_at`
    ).bind(
      `payment:${invoice.id}`,
      invoice.id,
      paymentStatus,
      invoice.freeagent_reference,
      providerStatus,
      invoice.collection_date,
      `payment:${invoice.id}`,
      environment,
      now,
      now
    ).run();
    await updateBillingInvoice(db, invoice.id, {
      status: paymentStatus === "CONFIRMED"
        ? "PAID"
        : paymentStatus === "FAILED"
          ? "FAILED"
          : paymentStatus === "UNKNOWN"
            ? "UNKNOWN"
            : "PAYMENT_PENDING",
      providerStatus,
      now
    });
    if (paymentStatus === "CONFIRMED") await updateBillingEventStatus(db, event.id, "SETTLED", now, invoice.freeagent_reference, payment.url, providerStatus);
    await markBillingInvoiceOperation(db, operation.id, {
      status: "SUCCEEDED",
      providerReference: invoice.freeagent_reference,
      providerUrl: payment.url,
      providerStatus
    }, now);
    if (paymentStatus === "FAILED" || paymentStatus === "UNKNOWN") {
      await createBillingAlert(db, {
        id: `billing-alert:${operation.id}:${paymentStatus}`,
        deduplicationKey: `billing-operation:${operation.id}:${paymentStatus}`,
        alertType: paymentStatus === "FAILED" ? "COLLECTION_FAILURE" : "PAYMENT_UNKNOWN",
        severity: "ERROR",
        studentId: event.student_id,
        payerStudentId: event.payer_student_id,
        lessonId: event.lesson_id,
        billingEventId: event.id,
        invoiceId: invoice.id,
        providerReference: invoice.freeagent_reference,
        currentState: providerStatus,
        recommendedAction: paymentStatus === "FAILED" ? "Review the failed collection and contact the payer." : "Reconcile the FreeAgent payment before retrying collection.",
        now
      });
    }
  } catch (error) {
    await markOperationFailure(db, operation, now, error, {
      studentId: event.student_id,
      lessonId: event.lesson_id,
      billingEventId: event.id,
      invoiceId: invoice.id
    });
  }
}

async function processCancelInvoice(
  db: D1Database,
  env: AccountingEnvironment,
  operation: BillingInvoiceOperation,
  now: string,
  fetcher: typeof fetch
): Promise<void> {
  const invoice = await findBillingInvoice(db, operation.invoice_id);
  if (!invoice || !invoice.freeagent_url || !invoice.freeagent_reference) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "INVOICE_NOT_FOUND",
      safeErrorCode: "INVOICE_NOT_FOUND",
      safeErrorMessage: "The local provider invoice reference is missing; cancellation cannot be confirmed."
    }, now);
    return;
  }
  const collectionStarted = await db.prepare(
    `SELECT (
       EXISTS (
         SELECT 1 FROM billing_invoice_operations
         WHERE invoice_id = ? AND operation_type = 'INITIATE_DIRECT_DEBIT'
           AND status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
       )
       OR EXISTS (
         SELECT 1 FROM billing_payments
         WHERE invoice_id = ?
           AND status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN')
       )
     ) AS started`
  ).bind(invoice.id, invoice.id).first<{ started: number }>();
  if (collectionStarted?.started) {
    await markBillingInvoiceOperation(db, operation.id, {
      status: "BLOCKED",
      providerStatus: "COLLECTION_STARTED",
      safeErrorCode: "COLLECTION_STARTED",
      safeErrorMessage: "The invoice cannot be cancelled after Direct Debit collection has started."
    }, now);
    return;
  }
  try {
    const providerInvoice = await providerCall(db, env, now, fetcher, (client, token) =>
      client.getInvoice(token, invoice.freeagent_url!)
    );
    if (!providerInvoice) {
      await updateBillingInvoice(db, invoice.id, {
        status: "UNKNOWN",
        providerStatus: "RECONCILIATION_REQUIRED",
        now
      });
      await markBillingInvoiceOperation(db, operation.id, {
        status: "UNKNOWN",
        providerStatus: "INVOICE_NOT_FOUND",
        safeErrorCode: "INVOICE_NOT_FOUND",
        safeErrorMessage: "The provider invoice was not found; cancellation requires reconciliation."
      }, now);
      await createBillingAlert(db, {
        id: `billing-alert:${operation.id}:not-found`,
        deduplicationKey: `billing-operation:${operation.id}:not-found`,
        alertType: "RECONCILIATION_REQUIRED",
        severity: "ERROR",
        invoiceId: invoice.id,
        currentState: "CANCELLATION_PROVIDER_NOT_FOUND",
        recommendedAction: "Reconcile the provider invoice before retrying cancellation.",
        now
      });
      return;
    }
    const providerStatus = providerInvoice.status ?? "";
    const creditCoveredInvoice = invoice.status === "PAID"
      && invoice.provider_status === "CREDIT_COVERED"
      && BigInt(invoice.net_amount_minor) === 0n;
    if (providerStatus.toLowerCase() === "cancelled") {
      await updateBillingInvoice(db, invoice.id, {
        status: "CANCELLED",
        providerStatus,
        now
      });
      await markBillingInvoiceOperation(db, operation.id, {
        status: "SUCCEEDED",
        providerReference: invoice.freeagent_reference,
        providerUrl: invoice.freeagent_url,
        providerStatus
      }, now);
      return;
    }
    if (
      !creditCoveredInvoice
      && (
      providerStatus.toLowerCase() === "paid"
      || providerAmountIsPositive(providerInvoice.paidValue)
      || providerAmountIsNotOutstanding(providerInvoice.dueValue)
      )
    ) {
      await markBillingInvoiceOperation(db, operation.id, {
        status: "BLOCKED",
        providerStatus: "COLLECTION_STARTED",
        safeErrorCode: "COLLECTION_STARTED",
        safeErrorMessage: "The provider invoice is already paid or has no outstanding balance."
      }, now);
      return;
    }
    const cancelled = await providerCall(db, env, now, fetcher, (client, token) =>
      client.markInvoiceCancelled(token, invoice.freeagent_url!)
    );
    if ((cancelled.status ?? "").toLowerCase() !== "cancelled") {
      await updateBillingInvoice(db, invoice.id, {
        status: "UNKNOWN",
        providerStatus: "RECONCILIATION_REQUIRED",
        now
      });
      await markBillingInvoiceOperation(db, operation.id, {
        status: "UNKNOWN",
        providerStatus: cancelled.status ?? "UNKNOWN",
        safeErrorCode: "RECONCILIATION_REQUIRED",
        safeErrorMessage: "The provider did not confirm invoice cancellation."
      }, now);
      return;
    }
    await updateBillingInvoice(db, invoice.id, {
      status: "CANCELLED",
      providerStatus: cancelled.status,
      now
    });
    await markBillingInvoiceOperation(db, operation.id, {
      status: "SUCCEEDED",
      providerReference: invoice.freeagent_reference,
      providerUrl: invoice.freeagent_url,
      providerStatus: cancelled.status
    }, now);
  } catch (error) {
    await markOperationFailure(db, operation, now, error, {
      studentId: null,
      lessonId: null,
      billingEventId: null,
      invoiceId: invoice.id
    });
  }
}

export async function processBillingInvoiceOperation(
  db: D1Database,
  env: AccountingEnvironment,
  id: string,
  now: string,
  fetcher: typeof fetch = freeAgentFetch
): Promise<BillingInvoiceOperation | null> {
  const operation = await claimBillingInvoiceOperation(
    db,
    id,
    now,
    new Date(Date.parse(now) - 15 * 60_000).toISOString()
  );
  if (!operation) return null;
  if (operation.operation_type === "CREATE_INVOICE") await processCreateInvoice(db, env, operation, now, fetcher);
  else if (operation.operation_type === "INITIATE_DIRECT_DEBIT") await processDirectDebit(db, env, operation, now, fetcher);
  else if (operation.operation_type === "CANCEL_INVOICE") await processCancelInvoice(db, env, operation, now, fetcher);
  else await markBillingInvoiceOperation(db, operation.id, { status: "BLOCKED", providerStatus: "NOT_SUPPORTED" }, now);
  return db.prepare("SELECT * FROM billing_invoice_operations WHERE id = ?").bind(id).first<BillingInvoiceOperation>();
}

export async function processDueBillingInvoiceOperations(
  db: D1Database,
  env: AccountingEnvironment,
  now: string,
  fetcher: typeof fetch = freeAgentFetch,
  limit = 20
): Promise<void> {
  const operations = await listDueBillingInvoiceOperations(db, now, limit);
  await Promise.all(operations.map((operation) => processBillingInvoiceOperation(db, env, operation.id, now, fetcher)));
}

export async function reconcileBillingInvoices(
  db: D1Database,
  env: AccountingEnvironment,
  now: string,
  fetcher: typeof fetch = freeAgentFetch,
  limit = 20
): Promise<void> {
  const invoices = await db.prepare(
    `SELECT i.*, e.student_id, e.lesson_id, e.id AS billing_event_id
     FROM billing_invoices i
     JOIN billing_events e ON e.id = i.billing_event_id
     WHERE i.freeagent_reference IS NOT NULL
       AND i.provider_environment = ?
       AND i.status IN ('SENT', 'PAYMENT_PENDING', 'UNKNOWN', 'FAILED')
     ORDER BY i.updated_at ASC, i.id ASC LIMIT ?`
  ).bind(env.FREEAGENT_ENVIRONMENT, limit).all<{
    id: string;
    freeagent_reference: string;
    status: string;
    student_id: string;
    lesson_id: string | null;
    billing_event_id: string;
    net_amount_minor: number | string;
  }>();
  await Promise.all(invoices.results.map(async (invoice) => {
    try {
      const provider = await providerCall(db, env, now, fetcher, (client, token) =>
        client.getInvoice(token, invoice.freeagent_reference)
      );
      if (!provider) throw new Error("FreeAgent invoice was not found.");
      const providerStatus = provider.status ?? "Unknown";
      const paid = providerStatus.toLowerCase() === "paid" || providerAmountIsPositive(provider.paidValue);
      const cancelled = providerStatus === "Cancelled";
      await updateBillingInvoice(db, invoice.id, {
        status: paid ? "PAID" : cancelled ? "CANCELLED" : "SENT",
        providerStatus,
        now
      });
      const paymentStatus = paid
        ? "CONFIRMED"
        : cancelled
          ? "NOT_STARTED"
          : mapFreeAgentInvoicePaymentStatus(provider.status, provider.paymentStatus);
      if (paymentStatus !== "NOT_STARTED") {
        await db.prepare(
          `INSERT INTO billing_payments
           (id, invoice_id, method, status, provider_reference, provider_status,
            collection_date, first_payment, idempotency_key, provider_environment, created_at, updated_at)
           SELECT ?, ?, 'FREEAGENT_GOCARDLESS', ?, ?, ?, COALESCE(collection_date, ?), 0, ?, provider_environment, ?, ?
           FROM billing_invoices WHERE id = ?
           ON CONFLICT(invoice_id) DO UPDATE SET
             status = excluded.status,
             provider_reference = COALESCE(excluded.provider_reference, billing_payments.provider_reference),
             provider_status = excluded.provider_status,
             updated_at = excluded.updated_at`
        ).bind(
          `payment:${invoice.id}`, invoice.id, paymentStatus, invoice.freeagent_reference,
          provider.paymentStatus ?? provider.status ?? null, now.slice(0, 10),
          `payment:${invoice.id}`, now, now, invoice.id
        ).run();
      }
      if (paymentStatus === "CONFIRMED") {
        await db.prepare(
          "UPDATE billing_invoices SET status = 'PAID', provider_status = ?, updated_at = ? WHERE id = ?"
        ).bind(providerStatus, now, invoice.id).run();
        await updateBillingEventStatus(db, invoice.billing_event_id, "SETTLED", now, invoice.freeagent_reference, provider.url, providerStatus);
      } else if (paymentStatus === "FAILED") {
        await updateBillingInvoice(db, invoice.id, { status: "FAILED", providerStatus, now });
      } else if (paymentStatus === "UNKNOWN") {
        await updateBillingInvoice(db, invoice.id, { status: "UNKNOWN", providerStatus, now });
      } else {
        await updateBillingInvoice(db, invoice.id, { status: "PAYMENT_PENDING", providerStatus, now });
      }
    } catch (error) {
      const apiError = providerFailure(error);
      await updateBillingInvoice(db, invoice.id, {
        status: "UNKNOWN",
        providerStatus: apiError?.shape.code ?? "RECONCILIATION_REQUIRED",
        now
      });
      await updateBillingEventStatus(db, invoice.billing_event_id, "UNKNOWN", now, invoice.freeagent_reference, null, "RECONCILIATION_REQUIRED");
      await createBillingAlert(db, {
        id: `billing-alert:reconcile:${invoice.id}`,
        deduplicationKey: `billing-invoice-reconcile:${invoice.id}`,
        alertType: "RECONCILIATION_REQUIRED",
        severity: "ERROR",
        studentId: invoice.student_id,
        lessonId: invoice.lesson_id,
        billingEventId: invoice.billing_event_id,
        invoiceId: invoice.id,
        providerReference: invoice.freeagent_reference,
        currentState: "RECONCILIATION_REQUIRED",
        recommendedAction: "Check the FreeAgent invoice by provider reference before retrying collection.",
        now
      });
    }
  }));
}
