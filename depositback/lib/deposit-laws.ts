// ---------------------------------------------------------------------------
// State security deposit rules
// ---------------------------------------------------------------------------
// One entry per state + DC. This table drives the free check, the case page,
// and the demand letter, so every rule a renter sees comes from here.
//
// IMPORTANT: compiled from general knowledge of each state's statute and NOT
// yet verified against the current statute text. `verified` stays false until
// someone checks the entry against the cited statute. Do not launch with
// unverified entries. See LEGAL_REVIEW.md.
// ---------------------------------------------------------------------------

export type PenaltyBase = "withheld" | "deposit";

export interface DepositLaw {
  code: string;
  name: string;
  /** Days after move-out the landlord has to return the deposit or itemize deductions. */
  returnDays: number;
  /** Plain-English detail on how the deadline works (conditions, alternatives). */
  deadlineNote?: string;
  /**
   * The clock starts when the tenant gives a forwarding address in writing,
   * not at move-out. We don't collect that date, so the computed deadline is
   * the earliest it could be and the letter doesn't cite a specific date.
   */
  clockStartsOnForwardingAddress?: boolean;
  /** Whether the landlord must send a written, itemized list of deductions. */
  itemizationRequired: boolean;
  /**
   * Total a renter may recover when the landlord breaks the rule, as a
   * multiple of `penaltyBase`. 1 means no statutory multiplier (actual
   * damages only). Usually requires bad faith or willful withholding.
   */
  multiplier: number;
  penaltyBase: PenaltyBase;
  /** Flat statutory damages on top of (or instead of) the multiplier, in dollars. */
  flatPenalty?: number;
  /** Plain-English summary of the penalty and when it applies. */
  penaltySummary: string;
  /** Statute citation shown to the renter and printed in the letter. */
  statute: string;
  /** True only once the entry has been checked against the current statute text. */
  verified: boolean;
}

export const DEPOSIT_LAWS: readonly DepositLaw[] = [
  { code: "AL", name: "Alabama", returnDays: 60, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "If the landlord misses the deadline, the tenant may recover double the deposit.", statute: "Ala. Code § 35-9A-201", verified: false },
  { code: "AK", name: "Alaska", returnDays: 14, deadlineNote: "14 days if the tenant gave proper notice to end the tenancy; 30 days if not.", itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "A landlord who fails to comply may owe up to twice the amount wrongfully withheld.", statute: "Alaska Stat. § 34.03.070", verified: false },
  { code: "AZ", name: "Arizona", returnDays: 14, deadlineNote: "14 business days (excluding weekends and holidays).", itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "Tenant may recover the amount wrongfully withheld plus damages equal to twice that amount.", statute: "Ariz. Rev. Stat. § 33-1321", verified: false },
  { code: "AR", name: "Arkansas", returnDays: 60, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "Willful failure to return may allow recovery of twice the amount wrongfully withheld.", statute: "Ark. Code § 18-16-305", verified: false },
  { code: "CA", name: "California", returnDays: 21, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "Bad-faith retention can add statutory damages of up to twice the deposit, on top of actual damages.", statute: "Cal. Civ. Code § 1950.5", verified: false },
  { code: "CO", name: "Colorado", returnDays: 30, deadlineNote: "One month, or up to 60 days if the lease says so.", itemizationRequired: true, multiplier: 3, penaltyBase: "withheld", penaltySummary: "Willful retention can make the landlord liable for three times the amount wrongfully withheld, plus attorney fees.", statute: "Colo. Rev. Stat. § 38-12-103", verified: false },
  { code: "CT", name: "Connecticut", returnDays: 21, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "A landlord who misses the deadline may owe twice the deposit.", statute: "Conn. Gen. Stat. § 47a-21", verified: false },
  { code: "DE", name: "Delaware", returnDays: 20, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "Failure to return within 20 days can entitle the tenant to double the amount wrongfully withheld.", statute: "Del. Code tit. 25, § 5514", verified: false },
  { code: "DC", name: "District of Columbia", returnDays: 45, itemizationRequired: true, multiplier: 3, penaltyBase: "deposit", penaltySummary: "Bad-faith retention may make the landlord liable for three times the deposit.", statute: "D.C. Code § 42-3502.17; 14 DCMR § 309", verified: false },
  { code: "FL", name: "Florida", returnDays: 15, deadlineNote: "15 days if nothing is deducted. To keep any of it, the landlord must send written notice of the claim by certified mail within 30 days.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "A landlord who misses the notice deadline forfeits the right to deduct anything; the tenant can also recover court costs and attorney fees.", statute: "Fla. Stat. § 83.49", verified: false },
  { code: "GA", name: "Georgia", returnDays: 30, itemizationRequired: true, multiplier: 3, penaltyBase: "withheld", penaltySummary: "Wrongful retention may make the landlord liable for three times the amount withheld, plus attorney fees.", statute: "Ga. Code § 44-7-34, § 44-7-35", verified: false },
  { code: "HI", name: "Hawaii", returnDays: 14, itemizationRequired: true, multiplier: 3, penaltyBase: "deposit", penaltySummary: "Wrongful, willful retention may allow the tenant to recover up to three times the deposit.", statute: "Haw. Rev. Stat. § 521-44", verified: false },
  { code: "ID", name: "Idaho", returnDays: 21, deadlineNote: "21 days, or up to 30 days if the lease says so.", itemizationRequired: true, multiplier: 3, penaltyBase: "withheld", penaltySummary: "Wrongful withholding can make the landlord liable for three times the amount withheld.", statute: "Idaho Code § 6-321, § 6-316", verified: false },
  { code: "IL", name: "Illinois", returnDays: 45, deadlineNote: "Itemized deductions are due within 30 days and the balance within 45. Applies to buildings with 5 or more units; Chicago has stricter rules.", itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "Failure to comply may make the landlord liable for twice the deposit, plus court costs and attorney fees.", statute: "765 ILCS 710/1", verified: false },
  { code: "IN", name: "Indiana", returnDays: 45, itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "Failure to send an itemized list means the landlord must return the full deposit, plus attorney fees.", statute: "Ind. Code § 32-31-3-12, § 32-31-3-16", verified: false },
  { code: "IA", name: "Iowa", returnDays: 30, itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", flatPenalty: 200, penaltySummary: "Bad-faith retention may add punitive damages of up to $200 on top of actual damages.", statute: "Iowa Code § 562A.12", verified: false },
  { code: "KS", name: "Kansas", returnDays: 30, itemizationRequired: true, multiplier: 1.5, penaltyBase: "withheld", penaltySummary: "Wrongful retention can add damages equal to 1.5 times the amount wrongfully withheld.", statute: "Kan. Stat. § 58-2550", verified: false },
  { code: "KY", name: "Kentucky", returnDays: 30, deadlineNote: "30 to 60 days depending on whether the tenant disputes the deductions.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "No statutory multiplier; the tenant can sue for the amount wrongfully withheld.", statute: "Ky. Rev. Stat. § 383.580", verified: false },
  { code: "LA", name: "Louisiana", returnDays: 30, deadlineNote: "One month after the lease ends.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", flatPenalty: 300, penaltySummary: "Willful failure to return may allow the tenant to recover actual damages or $300, whichever is greater.", statute: "La. Rev. Stat. § 9:3251, § 9:3253", verified: false },
  { code: "ME", name: "Maine", returnDays: 30, deadlineNote: "30 days for a written lease; 21 days for a tenancy at will.", itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "Wrongful retention may allow the tenant to recover twice the deposit, plus attorney fees.", statute: "Me. Rev. Stat. tit. 14, § 6033, § 6034", verified: false },
  { code: "MD", name: "Maryland", returnDays: 45, itemizationRequired: true, multiplier: 3, penaltyBase: "withheld", penaltySummary: "Unreasonable withholding may make the landlord liable for up to three times the amount withheld, plus attorney fees.", statute: "Md. Code, Real Prop. § 8-203", verified: false },
  { code: "MA", name: "Massachusetts", returnDays: 30, itemizationRequired: true, multiplier: 3, penaltyBase: "deposit", penaltySummary: "Violations can make the landlord liable for three times the deposit, plus interest and attorney fees.", statute: "Mass. Gen. Laws ch. 186, § 15B", verified: false },
  { code: "MI", name: "Michigan", returnDays: 30, deadlineNote: "The tenant must give a forwarding address in writing within 4 days of moving out.", itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "A landlord who doesn't comply may owe twice the deposit.", statute: "Mich. Comp. Laws § 554.609, § 554.613", verified: false },
  { code: "MN", name: "Minnesota", returnDays: 21, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", flatPenalty: 500, penaltySummary: "Failure to comply can cost the landlord twice the amount withheld; bad faith can add up to $500 in punitive damages.", statute: "Minn. Stat. § 504B.178", verified: false },
  { code: "MS", name: "Mississippi", returnDays: 45, itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", flatPenalty: 200, penaltySummary: "Bad-faith retention may add punitive damages of up to $200.", statute: "Miss. Code § 89-8-21", verified: false },
  { code: "MO", name: "Missouri", returnDays: 30, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "Wrongful withholding may allow recovery of up to twice the amount wrongfully withheld.", statute: "Mo. Rev. Stat. § 535.300", verified: false },
  { code: "MT", name: "Montana", returnDays: 30, deadlineNote: "10 days if nothing is deducted; 30 days if the landlord deducts.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "The tenant can sue for the amount wrongfully withheld.", statute: "Mont. Code § 70-25-202", verified: false },
  { code: "NE", name: "Nebraska", returnDays: 14, itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "Bad-faith retention may add damages of up to one month's rent, plus attorney fees.", statute: "Neb. Rev. Stat. § 76-1416", verified: false },
  { code: "NV", name: "Nevada", returnDays: 30, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "Bad-faith retention can make the landlord liable for up to twice the deposit.", statute: "Nev. Rev. Stat. § 118A.242", verified: false },
  { code: "NH", name: "New Hampshire", returnDays: 30, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "A landlord who fails to comply may owe twice the deposit, plus court costs.", statute: "N.H. Rev. Stat. § 540-A:7, § 540-A:8", verified: false },
  { code: "NJ", name: "New Jersey", returnDays: 30, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "The tenant may recover twice the amount wrongfully withheld, plus court costs and attorney fees.", statute: "N.J. Stat. § 46:8-21.1", verified: false },
  { code: "NM", name: "New Mexico", returnDays: 30, itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", flatPenalty: 250, penaltySummary: "Bad-faith retention may add a $250 civil penalty, plus attorney fees.", statute: "N.M. Stat. § 47-8-18", verified: false },
  { code: "NY", name: "New York", returnDays: 14, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "A landlord who misses the 14-day itemization deadline forfeits the right to keep any of the deposit; willful violations may add damages up to twice the deposit.", statute: "N.Y. Gen. Oblig. Law § 7-108", verified: false },
  { code: "NC", name: "North Carolina", returnDays: 30, deadlineNote: "30 days, extendable to 60 if the landlord needs more time to determine damages.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "Willful failure to account may let the tenant recover attorney fees on top of the amount withheld.", statute: "N.C. Gen. Stat. § 42-52, § 42-55", verified: false },
  { code: "ND", name: "North Dakota", returnDays: 30, itemizationRequired: true, multiplier: 3, penaltyBase: "withheld", penaltySummary: "Bad-faith retention can make the landlord liable for three times the amount withheld.", statute: "N.D. Cent. Code § 47-16-07.1", verified: false },
  { code: "OH", name: "Ohio", returnDays: 30, deadlineNote: "The tenant must give the landlord a forwarding address in writing to get the penalty.", itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "The tenant may recover the amount wrongfully withheld plus an equal amount in damages, plus attorney fees.", statute: "Ohio Rev. Code § 5321.16", verified: false },
  { code: "OK", name: "Oklahoma", returnDays: 45, deadlineNote: "45 days after the tenant asks for the deposit back in writing.", itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "A landlord who doesn't comply may owe twice the deposit.", statute: "Okla. Stat. tit. 41, § 115", verified: false },
  { code: "OR", name: "Oregon", returnDays: 31, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "The tenant may recover twice the amount wrongfully withheld.", statute: "Or. Rev. Stat. § 90.300", verified: false },
  { code: "PA", name: "Pennsylvania", returnDays: 30, deadlineNote: "The tenant must give a forwarding address in writing.", itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "A landlord who misses the deadline forfeits the right to withhold and may owe twice the amount wrongfully withheld.", statute: "68 Pa. Stat. § 250.512", verified: false },
  { code: "RI", name: "Rhode Island", returnDays: 20, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "The tenant may recover twice the amount wrongfully withheld, plus attorney fees.", statute: "R.I. Gen. Laws § 34-18-19", verified: false },
  { code: "SC", name: "South Carolina", returnDays: 30, itemizationRequired: true, multiplier: 3, penaltyBase: "withheld", penaltySummary: "Willful retention can make the landlord liable for three times the amount withheld, plus attorney fees.", statute: "S.C. Code § 27-40-410", verified: false },
  { code: "SD", name: "South Dakota", returnDays: 14, deadlineNote: "14 days to return the deposit or give a reason; up to 45 days to provide an itemized list if requested.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", flatPenalty: 200, penaltySummary: "Bad-faith retention may add punitive damages of up to $200.", statute: "S.D. Codified Laws § 43-32-24", verified: false },
  { code: "TN", name: "Tennessee", returnDays: 30, deadlineNote: "Applies in counties covered by the Uniform Residential Landlord and Tenant Act.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "No statutory multiplier; the tenant can sue for the amount wrongfully withheld.", statute: "Tenn. Code § 66-28-301", verified: false },
  { code: "TX", name: "Texas", returnDays: 30, clockStartsOnForwardingAddress: true, deadlineNote: "The clock starts once the tenant gives a forwarding address in writing.", itemizationRequired: true, multiplier: 3, penaltyBase: "withheld", flatPenalty: 100, penaltySummary: "Bad-faith retention can make the landlord liable for $100 plus three times the amount wrongfully withheld, plus attorney fees.", statute: "Tex. Prop. Code § 92.103, § 92.109", verified: false },
  { code: "UT", name: "Utah", returnDays: 30, itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", flatPenalty: 100, penaltySummary: "Bad-faith retention may add a $100 penalty plus court costs.", statute: "Utah Code § 57-17-3, § 57-17-5", verified: false },
  { code: "VT", name: "Vermont", returnDays: 14, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "Willful failure to return within 14 days forfeits the right to withhold and may cost twice the deposit.", statute: "Vt. Stat. tit. 9, § 4461", verified: false },
  { code: "VA", name: "Virginia", returnDays: 45, itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "The tenant may recover the amount wrongfully withheld plus actual damages and attorney fees.", statute: "Va. Code § 55.1-1226", verified: false },
  { code: "WA", name: "Washington", returnDays: 30, itemizationRequired: true, multiplier: 2, penaltyBase: "deposit", penaltySummary: "Intentional refusal to return can cost the landlord up to twice the deposit; missing the statement deadline forfeits deductions.", statute: "Wash. Rev. Code § 59.18.280", verified: false },
  { code: "WV", name: "West Virginia", returnDays: 60, deadlineNote: "60 days, or 45 days after a new tenant moves in, whichever is sooner.", itemizationRequired: true, multiplier: 1.5, penaltyBase: "withheld", penaltySummary: "Wrongful retention may add damages of up to 1.5 times the amount withheld.", statute: "W. Va. Code § 37-6A-2, § 37-6A-5", verified: false },
  { code: "WI", name: "Wisconsin", returnDays: 21, itemizationRequired: true, multiplier: 2, penaltyBase: "withheld", penaltySummary: "The tenant may recover twice the amount wrongfully withheld, plus attorney fees.", statute: "Wis. Stat. § 704.28; Wis. Admin. Code ATCP § 134.06", verified: false },
  { code: "WY", name: "Wyoming", returnDays: 30, deadlineNote: "30 days, or 15 days after receiving the tenant's forwarding address, whichever is later.", itemizationRequired: true, multiplier: 1, penaltyBase: "withheld", penaltySummary: "No statutory multiplier; the tenant can sue for the amount wrongfully withheld plus court costs.", statute: "Wyo. Stat. § 1-21-1208", verified: false },
];

const BY_CODE = new Map(DEPOSIT_LAWS.map((law) => [law.code, law]));

export function getDepositLaw(code: string): DepositLaw | undefined {
  return BY_CODE.get(code.toUpperCase());
}

// ---------------------------------------------------------------------------
// Assessment — turns a renter's facts into the numbers we show them
// ---------------------------------------------------------------------------

export interface CaseFacts {
  state: string;
  /** Deposit paid, in dollars. */
  depositAmount: number;
  /** Amount the landlord has returned so far, in dollars. */
  amountReturned: number;
  /** Move-out date, ISO yyyy-mm-dd. */
  moveOutDate: string;
  /** Whether the landlord sent a written, itemized list of deductions. */
  itemizedListReceived: boolean;
}

export type CaseStatus =
  /** Deadline hasn't passed and nothing has been withheld yet. */
  | "waiting"
  /** Landlord returned everything. */
  | "returned"
  /** Deadline passed and money is still missing. */
  | "overdue"
  /** Money was withheld before/at the deadline; deductions may be challengeable. */
  | "withheld";

export interface CaseAssessment {
  law: DepositLaw;
  status: CaseStatus;
  /** ISO yyyy-mm-dd the landlord's deadline falls on. */
  deadline: string;
  /** Days past the deadline (0 if not past). */
  daysOverdue: number;
  /** Days left before the deadline (0 if passed). */
  daysLeft: number;
  /** Dollars still not returned. */
  withheld: number;
  /** Upper bound the renter may be able to recover under the statute, in dollars. */
  maxRecovery: number;
  /** True when the landlord missed a required itemized list. */
  missingItemization: boolean;
}

const DAY_MS = 86_400_000;

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Adds days, skipping weekends when `businessDays` is set (US holidays are not skipped). */
function addDays(start: Date, days: number, businessDays: boolean): Date {
  if (!businessDays) return new Date(start.getTime() + days * DAY_MS);
  const date = new Date(start);
  let added = 0;
  while (added < days) {
    date.setTime(date.getTime() + DAY_MS);
    const dow = date.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date;
}

/** States whose deadline is counted in business days. */
const BUSINESS_DAY_STATES = new Set(["AZ"]);

export function assessCase(facts: CaseFacts, today: Date = new Date()): CaseAssessment | null {
  const law = getDepositLaw(facts.state);
  if (!law || !facts.moveOutDate) return null;

  const deposit = Math.max(0, facts.depositAmount);
  const returned = Math.min(deposit, Math.max(0, facts.amountReturned));
  const withheld = round2(deposit - returned);

  const deadlineDate = addDays(parseDate(facts.moveOutDate), law.returnDays, BUSINESS_DAY_STATES.has(law.code));
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diffDays = Math.round((todayUtc - deadlineDate.getTime()) / DAY_MS);
  const pastDeadline = diffDays > 0;

  let status: CaseStatus;
  if (withheld <= 0) status = "returned";
  else if (pastDeadline) status = "overdue";
  else if (returned > 0 || facts.itemizedListReceived) status = "withheld";
  else status = "waiting";

  const missingItemization =
    law.itemizationRequired && withheld > 0 && pastDeadline && !facts.itemizedListReceived;

  const base = law.penaltyBase === "deposit" ? deposit : withheld;
  const statutory = law.multiplier > 1 ? base * law.multiplier : withheld;
  const maxRecovery =
    withheld > 0 ? round2(Math.max(withheld, statutory) + (law.flatPenalty ?? 0)) : 0;

  return {
    law,
    status,
    deadline: toIso(deadlineDate),
    daysOverdue: pastDeadline ? diffDays : 0,
    daysLeft: pastDeadline ? 0 : -diffDays,
    withheld,
    maxRecovery,
    missingItemization,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

export function formatLongDate(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
