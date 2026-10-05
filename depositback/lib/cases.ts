// ---------------------------------------------------------------------------
// Deposit case helpers — validation and DB <-> app conversion
// ---------------------------------------------------------------------------

import type { DepositCase, Prisma } from "@prisma/client";
import { getDepositLaw } from "./deposit-laws";
import type { Deduction, LetterInput } from "./letter";

/** A case as the app uses it: plain numbers, ISO dates, typed deductions. */
export interface CaseRecord extends LetterInput {
  id: string;
  letter: string | null;
  letterGeneratedAt: string | null;
  createdAt: string;
}

export function toCaseRecord(row: DepositCase): CaseRecord {
  return {
    id: row.id,
    state: row.state,
    depositAmount: Number(row.depositAmount),
    amountReturned: Number(row.amountReturned),
    moveOutDate: row.moveOutDate.toISOString().slice(0, 10),
    itemizedListReceived: row.itemizedListReceived,
    forwardingAddressSent: row.forwardingAddressSent,
    tenantName: row.tenantName,
    tenantAddress: row.tenantAddress,
    landlordName: row.landlordName,
    landlordAddress: row.landlordAddress,
    rentalAddress: row.rentalAddress,
    deductions: parseDeductions(row.deductions),
    story: row.story,
    letter: row.letter,
    letterGeneratedAt: row.letterGeneratedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function parseDeductions(value: Prisma.JsonValue): Deduction[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const d = item as Record<string, unknown>;
    return [
      {
        reason: String(d.reason ?? ""),
        amount: Number(d.amount) || 0,
        dispute: String(d.dispute ?? ""),
      },
    ];
  });
}

const MAX_TEXT = 4000;
const MAX_DEDUCTIONS = 20;

type ValidationResult =
  | { ok: true; data: Omit<Prisma.DepositCaseUncheckedCreateInput, "userId"> }
  | { ok: false; error: string };

function text(value: unknown, field: string, required: boolean, max = 300): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) throw new Error(`${field} is required`);
  if (s.length > max) throw new Error(`${field} is too long`);
  return s;
}

function money(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new Error(`${field} must be a dollar amount`);
  return Math.round(n * 100) / 100;
}

/** Validates a create/update body from the case form. */
export function validateCaseInput(body: unknown): ValidationResult {
  try {
    if (!body || typeof body !== "object") throw new Error("Invalid request body");
    const b = body as Record<string, unknown>;

    const state = text(b.state, "State", true, 2).toUpperCase();
    if (!getDepositLaw(state)) throw new Error("Choose a US state");

    const moveOutDate = text(b.moveOutDate, "Move-out date", true, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveOutDate) || Number.isNaN(Date.parse(moveOutDate))) {
      throw new Error("Move-out date must be a valid date");
    }

    const depositAmount = money(b.depositAmount, "Deposit");
    if (depositAmount <= 0) throw new Error("Deposit must be more than $0");
    const amountReturned = money(b.amountReturned ?? 0, "Amount returned");
    if (amountReturned > depositAmount) throw new Error("Amount returned can't be more than the deposit");

    const rawDeductions = Array.isArray(b.deductions) ? b.deductions : [];
    if (rawDeductions.length > MAX_DEDUCTIONS) throw new Error(`At most ${MAX_DEDUCTIONS} deductions`);
    const deductions: Deduction[] = rawDeductions.map((d, i) => {
      const item = (d ?? {}) as Record<string, unknown>;
      return {
        reason: text(item.reason, `Deduction ${i + 1} reason`, true, 200),
        amount: money(item.amount, `Deduction ${i + 1} amount`),
        dispute: text(item.dispute, `Deduction ${i + 1} dispute`, false, 1000),
      };
    });

    return {
      ok: true,
      data: {
        state,
        depositAmount,
        amountReturned,
        moveOutDate: new Date(`${moveOutDate}T00:00:00Z`),
        itemizedListReceived: b.itemizedListReceived === true,
        forwardingAddressSent: b.forwardingAddressSent === true,
        tenantName: text(b.tenantName, "Your name", true),
        tenantAddress: text(b.tenantAddress, "Your mailing address", true, 500),
        landlordName: text(b.landlordName, "Landlord name", true),
        landlordAddress: text(b.landlordAddress, "Landlord address", true, 500),
        rentalAddress: text(b.rentalAddress, "Rental address", true, 500),
        deductions: deductions as unknown as Prisma.InputJsonValue,
        story: text(b.story, "What happened", false, MAX_TEXT),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid input" };
  }
}
