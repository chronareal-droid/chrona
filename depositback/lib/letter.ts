// ---------------------------------------------------------------------------
// Demand letter generation
// ---------------------------------------------------------------------------
// The letter is a fixed template (addresses, statute, amounts, deadline,
// demand) with one AI-written section: the renter's account of what happened
// and a rebuttal of each deduction. Every legal claim comes from the template
// and lib/deposit-laws.ts, never from the model. If the AI call is unavailable
// or fails, a plain-language fallback fills that section.
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import {
  assessCase,
  formatLongDate,
  formatUsd,
  type CaseAssessment,
} from "./deposit-laws";

export interface Deduction {
  reason: string;
  amount: number;
  /** The renter's reason the deduction is wrong. */
  dispute: string;
}

export interface LetterInput {
  state: string;
  depositAmount: number;
  amountReturned: number;
  moveOutDate: string;
  itemizedListReceived: boolean;
  forwardingAddressSent: boolean;
  tenantName: string;
  tenantAddress: string;
  landlordName: string;
  landlordAddress: string;
  rentalAddress: string;
  deductions: Deduction[];
  story: string;
}

/** Days the landlord gets to respond to the letter before the renter files in small claims. */
export const RESPONSE_DAYS = 14;

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `You draft one section of a security deposit demand letter for a US renter. The rest of the letter (addresses, the statute, amounts, deadlines and the demand itself) is written separately, so do not repeat or restate any of it.

Write the section titled "What happened" in the renter's voice (first person), addressed to the landlord. Use only the facts provided. Do not invent dates, amounts, conditions, repairs, conversations or legal rules. Do not cite any law or name any statute. Do not threaten anything beyond what the renter states.

Cover, in order:
1. A short, factual account of the move-out and the condition the unit was left in, from the renter's notes.
2. For each deduction the landlord took, a short paragraph naming the deduction and amount and explaining, from the renter's dispute notes, why it should be refunded (for example: normal wear and tear, pre-existing condition, no receipts, charged twice, cleaned before leaving). If the renter gave no dispute note for a deduction, ask the landlord to provide receipts or photos supporting it.

Tone: firm, calm and professional. Plain English. No headings, bullet points, markdown, greeting or sign-off. Between 120 and 350 words. Output only the section text.`;

function describeFacts(input: LetterInput, assessment: CaseAssessment): string {
  const lines = [
    `Rental address: ${input.rentalAddress}`,
    `Moved out: ${formatLongDate(input.moveOutDate)}`,
    `Deposit paid: ${formatUsd(input.depositAmount)}`,
    `Returned so far: ${formatUsd(input.amountReturned)}`,
    `Still withheld: ${formatUsd(assessment.withheld)}`,
    `Itemized list of deductions received: ${input.itemizedListReceived ? "yes" : "no"}`,
    "",
    "Deductions the landlord took:",
  ];
  if (input.deductions.length === 0) {
    lines.push("(none listed — the landlord kept money without itemizing it)");
  }
  for (const d of input.deductions) {
    lines.push(`- ${d.reason || "Unspecified"}: ${formatUsd(d.amount)}. Renter's dispute: ${d.dispute || "(none given)"}`);
  }
  lines.push("", "Renter's notes on what happened:", input.story.trim() || "(none given)");
  return lines.join("\n");
}

function fallbackStory(input: LetterInput, assessment: CaseAssessment): string {
  const parts = ["I left the unit clean and in good condition, apart from normal wear and tear."];
  if (input.story.trim()) parts.push(input.story.trim());
  if (input.deductions.length === 0) {
    parts.push(
      `You have kept ${formatUsd(assessment.withheld)} of my deposit without giving me a reason for any deduction.`,
    );
  }
  for (const d of input.deductions) {
    const reason = d.reason ? d.reason.charAt(0).toLowerCase() + d.reason.slice(1) : "an unspecified charge";
    parts.push(
      d.dispute.trim()
        ? `You deducted ${formatUsd(d.amount)} for ${reason}. I dispute this charge: ${d.dispute.trim()}`
        : `You deducted ${formatUsd(d.amount)} for ${reason}. Please provide receipts or photos supporting this charge, or refund it.`,
    );
  }
  return parts.join("\n\n");
}

/** Asks Claude for the "What happened" section. Returns null if the API isn't configured or fails. */
async function draftStory(input: LetterInput, assessment: CaseAssessment): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: describeFacts(input, assessment) }],
    });

    if (response.stop_reason === "refusal") return null;
    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    return text || null;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`[Letter] Claude API error ${error.status}:`, error.message);
    } else {
      console.error("[Letter] Claude request failed:", error);
    }
    return null;
  }
}

export interface GeneratedLetter {
  text: string;
  /** True when the "What happened" section was written by Claude. */
  aiDrafted: boolean;
}

export async function generateLetter(input: LetterInput, today: Date = new Date()): Promise<GeneratedLetter> {
  const assessment = assessCase(
    {
      state: input.state,
      depositAmount: input.depositAmount,
      amountReturned: input.amountReturned,
      moveOutDate: input.moveOutDate,
      itemizedListReceived: input.itemizedListReceived,
    },
    today,
  );
  if (!assessment) throw new Error(`Unsupported state: ${input.state}`);

  const aiStory = await draftStory(input, assessment);
  const story = aiStory ?? fallbackStory(input, assessment);
  return { text: renderLetter(input, assessment, story, today), aiDrafted: aiStory !== null };
}

export function renderLetter(
  input: LetterInput,
  a: CaseAssessment,
  story: string,
  today: Date,
): string {
  const { law } = a;
  const todayIso = today.toISOString().slice(0, 10);
  const respondBy = new Date(today.getTime() + RESPONSE_DAYS * 86_400_000).toISOString().slice(0, 10);

  const lawParagraph = [
    `Under ${law.name} law (${law.statute}), a landlord must return a tenant's security deposit${law.itemizationRequired ? ", or provide a written, itemized list of any deductions," : ""} within ${law.returnDays} days after the tenancy ends.`,
    law.deadlineNote ?? "",
    law.clockStartsOnForwardingAddress
      ? input.forwardingAddressSent
        ? "I gave you my forwarding address in writing."
        : `My forwarding address is ${input.tenantAddress.replace(/\s*\n\s*/g, ", ")}.`
      : a.daysOverdue > 0
        ? `That deadline was ${formatLongDate(a.deadline)}, ${a.daysOverdue} day${a.daysOverdue === 1 ? "" : "s"} ago.`
        : `That deadline is ${formatLongDate(a.deadline)}.`,
    a.missingItemization ? "I have not received an itemized list of deductions." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const penaltyParagraph =
    law.multiplier > 1 || law.flatPenalty
      ? `${law.penaltySummary} If this matter goes to court, I will ask for every remedy the statute allows, which may total up to ${formatUsd(a.maxRecovery)}, plus court costs.`
      : `${law.penaltySummary} If this matter goes to court, I will ask for the full amount withheld plus court costs.`;

  return [
    input.tenantName,
    input.tenantAddress,
    "",
    formatLongDate(todayIso),
    "",
    input.landlordName,
    input.landlordAddress,
    "",
    "SENT BY CERTIFIED MAIL, RETURN RECEIPT REQUESTED",
    "",
    `Re: Demand for return of security deposit — ${input.rentalAddress}`,
    "",
    `Dear ${input.landlordName},`,
    "",
    `I was your tenant at ${input.rentalAddress} and moved out on ${formatLongDate(input.moveOutDate)}. I paid a security deposit of ${formatUsd(input.depositAmount)}. To date you have returned ${formatUsd(input.amountReturned)}, leaving ${formatUsd(a.withheld)} unpaid.`,
    "",
    story,
    "",
    lawParagraph,
    "",
    penaltyParagraph,
    "",
    `I am asking you to pay ${formatUsd(a.withheld)} by ${formatLongDate(respondBy)}. Please send payment to the address above. If I do not receive payment by that date, I intend to file a claim in small claims court without further notice.`,
    "",
    "I would prefer to resolve this without going to court.",
    "",
    "Sincerely,",
    "",
    "",
    input.tenantName,
  ].join("\n");
}
