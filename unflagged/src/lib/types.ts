// Mirrors supabase/functions/_shared/report.ts (PublicScan) and schemas.ts (Report). Keep in sync.
export type Level = 'low' | 'elevated' | 'high';
export type CategoryKey = 'generic_repetitive' | 'off_putting' | 'ai_persona_sensitive' | 'reused';

export interface Finding {
  title: string;
  evidence: string;
  why_it_matters: string;
  fix: string;
}

export interface Report {
  overall: Level;
  headline: string;
  categories: { key: CategoryKey; level: Level; summary: string; evidence: string[]; fixes: string[] }[];
  top_findings: Finding[];
  videos_to_review: { title: string; reason: string }[];
  action_plan_7_days: string[];
  before_you_apply_checklist: string[];
  confidence_note: string;
}

export interface FreeReport {
  overall: Level;
  headline: string;
  categories: { key: CategoryKey; level: Level; summary: string }[];
  top_findings: Finding[];
  confidence_note: string;
}

export interface LockedCounts {
  more_findings: number;
  videos_to_review: number;
  plan_days: number;
  checklist_items: number;
}

export interface PublicScan {
  id: string;
  created_at: string;
  status: 'processing' | 'done' | 'error';
  stage: 'extract' | 'signals' | 'judge' | null;
  error_code: string | null;
  paid: boolean;
  videos_read: number | null;
  free?: FreeReport;
  locked?: LockedCounts;
  report?: Report;
  rescan?: { available: boolean; until: string | null };
}

export interface Answers {
  monetization: string;
  voice: string;
  visuals: string;
  scripts: string;
  opinion: string;
  uploads: string;
}

export interface CreateScanPayload {
  images: string[];
  scripts: string[];
  answers: Answers;
  niche?: string;
  email?: string;
  ageConfirmed: true;
  src?: string;
  rescanOf?: string;
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  generic_repetitive: 'Generic / repetitive',
  off_putting: 'Off-putting',
  ai_persona_sensitive: 'AI persona on sensitive topics',
  reused: 'Reused content',
};
