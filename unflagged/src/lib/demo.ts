// Demo mode (`npm run build:demo`): the whole app runs in the browser against an in-memory fake backend,
// so it can be shown before Supabase, Gemini and Dodo are connected. Nothing entered leaves the page.
import { ApiError } from './errors';
import type { CreateScanPayload, FreeReport, LockedCounts, PublicScan, Report } from './types';

export const DEMO = import.meta.env.VITE_DEMO === '1';

const SAMPLE_TITLES = [
  'Top 10 Scariest Places in Japan',
  'Top 10 Scariest Places in Mexico',
  'Top 10 Scariest Places in Brazil',
  'The Tunnel Tokyo Tried to Forget',
  'Top 10 Scariest Places in Canada',
  'Top 10 Scariest Places in Italy',
  'I Spent a Night Reading Every Hotel Ghost Report',
  'Top 10 Scariest Places in Peru',
];

export const SAMPLE_REPORT: Report = {
  overall: 'elevated',
  headline: 'Most of your titles follow one template, but your two story videos show the original input the policy rewards.',
  categories: [
    {
      key: 'generic_repetitive',
      level: 'high',
      summary: '6 of 8 titles use the same "Top 10 Scariest Places in ___" frame, and most videos run about 10 minutes.',
      evidence: [
        '"Top 10 Scariest Places in Japan", "Top 10 Scariest Places in Mexico" and "Top 10 Scariest Places in Brazil" differ by one word.',
        '6 of 8 videos run between 10:02 and 10:31.',
        'Thumbnails repeat one layout: dark photo, red "TOP 10" text, arrow pointing left.',
      ],
      fixes: [
        'Retitle list videos around the single most surprising entry.',
        'Let video length follow the story instead of a fixed 10-minute target.',
        'Use at least three different thumbnail layouts across your next uploads.',
      ],
    },
    {
      key: 'off_putting',
      level: 'low',
      summary: 'Spooky, but no shock or distress formulas in titles or thumbnails.',
      evidence: [],
      fixes: ['Keep thumbnails free of gore or fake injury imagery.'],
    },
    {
      key: 'ai_persona_sensitive',
      level: 'low',
      summary: 'You use an AI voice, but not for health, finance or legal topics.',
      evidence: [],
      fixes: ['If you ever cover medical or legal subjects, use your own voice or cite sources on screen.'],
    },
    {
      key: 'reused',
      level: 'elevated',
      summary: 'Stock footage with light-edit AI scripts gives little original commentary in the list videos.',
      evidence: [
        'Script 1 opens with "In today\'s video we delve into the scariest places", a stock AI opener.',
        'You answered "Stock footage" and "AI drafts, light edits".',
      ],
      fixes: [
        'Add one segment per video with your own take: why this place, what the sources disagree on.',
        'Replace stock B-roll with maps, timelines or documents you assemble yourself.',
      ],
    },
  ],
  top_findings: [
    {
      title: 'Your titles follow one fill-in-the-blank frame',
      evidence: '"Top 10 Scariest Places in Japan", "Top 10 Scariest Places in Mexico" and "Top 10 Scariest Places in Peru" swap one word.',
      why_it_matters: 'This matches the "template-based, easily replicable at scale" pattern the policy describes.',
      fix: 'Retitle your next 3 uploads around one specific story, like your video "The Tunnel Tokyo Tried to Forget".',
    },
    {
      title: 'Video lengths are nearly identical',
      evidence: '6 of 8 videos run 10:02–10:31, a 3% spread.',
      why_it_matters: 'Uniform lengths are a signal of mass production rather than story-led editing.',
      fix: 'Cut each video to what its story needs. Some will run 7 minutes, others 15.',
    },
    {
      title: 'Narration uses stock AI phrases',
      evidence: 'Script 1: "In today\'s video we delve into the scariest places" and "Buckle up".',
      why_it_matters: 'Generic narration that could fit any channel reads as low original input.',
      fix: 'Rewrite your intros in your own words and open with the strangest fact first.',
    },
    {
      title: 'Your strongest videos are the story ones',
      evidence: '"I Spent a Night Reading Every Hotel Ghost Report" breaks the template and shows your own research.',
      why_it_matters: 'Original research and a personal angle are what lower your risk the most.',
      fix: 'Make at least half of your next 6 uploads story-led like this one.',
    },
    {
      title: 'Thumbnails repeat one layout',
      evidence: 'Dark photo, red "TOP 10" text and a left arrow on 6 of 8 thumbnails.',
      why_it_matters: 'Identical packaging adds to the repetitive pattern.',
      fix: 'Test a map-based and a document-based thumbnail style.',
    },
    {
      title: 'Upload bursts',
      evidence: '3 uploads on the same day, 2 days ago.',
      why_it_matters: 'Bursts of near-identical uploads look like volume over value.',
      fix: 'Spread uploads out and spend the time on one segment of original analysis per video.',
    },
  ],
  videos_to_review: [
    { title: 'Top 10 Scariest Places in Peru', reason: 'Most generic title, stock-only visuals, and the newest upload.' },
    { title: 'Top 10 Scariest Places in Canada', reason: 'Same frame and thumbnail as three others.' },
    { title: 'Top 10 Scariest Places in Italy', reason: 'Uploaded in the same-day burst.' },
  ],
  action_plan_7_days: [
    'Day 1: Retitle "Top 10 Scariest Places in Peru" around its single strangest location.',
    'Day 2: Rewrite your intro template in your own words; drop "delve" and "buckle up".',
    'Day 3: Design two new thumbnail layouts and apply one to your three newest videos.',
    'Day 4: Script your next video as a single story, like your hotel ghost report video.',
    'Day 5: Add a 60-second "my take" segment to the script: what the sources get wrong.',
    'Day 6: Swap half the stock B-roll for maps, timelines and documents you assemble.',
    'Day 7: Publish it, and unlist or rework the two most generic list videos.',
  ],
  before_you_apply_checklist: [
    'Your last 10 titles don\'t share one frame',
    'Video lengths vary with the story',
    'Every script has a segment with your own analysis or opinion',
    'No stock AI phrases in intros and outros',
    'At least three thumbnail layouts in your recent uploads',
    'Uploads are spread out, with no same-day bursts',
    'Visuals include material you assembled yourself',
    'Wait the full 30 days after a rejection before reapplying',
  ],
  confidence_note:
    'We read 8 videos and 1 script. We couldn\'t see your descriptions, the videos themselves, or audio, so originality in editing and voice delivery isn\'t reflected here.',
};

function freeView(r: Report): { free: FreeReport; locked: LockedCounts } {
  return {
    free: {
      overall: r.overall,
      headline: r.headline,
      categories: r.categories.map(({ key, level, summary }) => ({ key, level, summary })),
      top_findings: r.top_findings.slice(0, 2),
      confidence_note: r.confidence_note,
    },
    locked: {
      more_findings: Math.max(0, r.top_findings.length - 2),
      videos_to_review: r.videos_to_review.length,
      plan_days: r.action_plan_7_days.length,
      checklist_items: r.before_you_apply_checklist.length,
    },
  };
}

// ---------- fake backend ----------

interface DemoScan {
  createdAt: number;
  paid: boolean;
  paidAt: number | null;
  rescanOf?: string;
}
const scans = new Map<string, DemoScan>();
const STAGES: [number, PublicScan['stage']][] = [
  [2_500, 'extract'],
  [5_000, 'signals'],
  [8_500, 'judge'],
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function newId(): string {
  return crypto.randomUUID?.() ?? `demo-${scans.size + 1}-${performance.now().toFixed(0)}`;
}

export const demoApi = {
  async createScan(p: CreateScanPayload): Promise<{ id: string }> {
    await wait(600);
    const id = newId();
    scans.set(id, { createdAt: Date.now(), paid: !!p.rescanOf, paidAt: p.rescanOf ? Date.now() : null, rescanOf: p.rescanOf });
    return { id };
  },
  async getScan(id: string): Promise<PublicScan> {
    await wait(150);
    const s = scans.get(id);
    if (!s) throw new ApiError(404, 'not_found');
    const elapsed = Date.now() - s.createdAt;
    const base: PublicScan = {
      id,
      created_at: new Date(s.createdAt).toISOString(),
      status: 'processing',
      stage: 'extract',
      error_code: null,
      paid: s.paid,
      videos_read: null,
    };
    const stage = STAGES.find(([until]) => elapsed < until);
    if (stage) return { ...base, stage: stage[1], videos_read: stage[1] === 'extract' ? null : SAMPLE_TITLES.length };
    const done: PublicScan = { ...base, status: 'done', stage: null, videos_read: SAMPLE_TITLES.length };
    if (!s.paid) return { ...done, ...freeView(SAMPLE_REPORT) };
    const until = s.paidAt! + 30 * 86_400_000;
    const rescanUsed = [...scans.values()].some((x) => x.rescanOf === id);
    return {
      ...done,
      report: SAMPLE_REPORT,
      rescan: { available: !s.rescanOf && !rescanUsed, until: new Date(until).toISOString() },
    };
  },
  async createCheckout(id: string): Promise<{ url: string }> {
    await wait(700);
    const s = scans.get(id);
    if (s) {
      s.paid = true;
      s.paidAt = Date.now();
    }
    // A path (not a URL) tells the report page to navigate in-app instead of leaving for a hosted checkout.
    return { url: `/r/${id}?paid=1` };
  },
  async joinWaitlist(): Promise<{ ok: true }> {
    await wait(400);
    return { ok: true };
  },
};

// ---------- sample screenshots ----------

const THUMB_COLORS = ['#3b0d0d', '#1f2937', '#2a1530', '#0f2a2a'];

/** Draws a phone screenshot of a Videos tab with sample titles, as a JPEG data URL. */
export function sampleScreenshot(page: number): string {
  const w = 590;
  const h = 1280;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0f0f0f';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#f1f1f1';
  g.font = 'bold 30px system-ui, sans-serif';
  g.fillText('Night Atlas', 32, 70);
  g.font = '22px system-ui, sans-serif';
  g.fillStyle = '#aaaaaa';
  g.fillText('Home     Videos     Shorts     Playlists', 32, 120);
  g.fillStyle = '#f1f1f1';
  g.fillRect(150, 132, 76, 4);

  const titles = SAMPLE_TITLES.slice(page * 4, page * 4 + 4);
  titles.forEach((title, i) => {
    const y = 170 + i * 270;
    g.fillStyle = THUMB_COLORS[(i + page) % THUMB_COLORS.length];
    g.fillRect(32, y, w - 64, 170);
    if (title.startsWith('Top 10')) {
      g.fillStyle = '#ef4444';
      g.font = '900 52px system-ui, sans-serif';
      g.fillText('TOP 10', 56, y + 100);
    }
    g.fillStyle = 'rgba(0,0,0,.8)';
    g.fillRect(w - 120, y + 132, 72, 28);
    g.fillStyle = '#fff';
    g.font = '18px system-ui, sans-serif';
    g.fillText(i % 3 === 2 ? '14:48' : `10:${String(2 + i * 7).padStart(2, '0')}`, w - 112, y + 152);
    g.fillStyle = '#f1f1f1';
    g.font = '24px system-ui, sans-serif';
    g.fillText(title, 32, y + 210, w - 64);
    g.fillStyle = '#aaaaaa';
    g.font = '19px system-ui, sans-serif';
    g.fillText(`${12 + i * 7}K views · ${page * 4 + i + 1} days ago`, 32, y + 242);
  });
  return c.toDataURL('image/jpeg', 0.8);
}

export const SAMPLE_SCRIPT =
  "In today's video we delve into the scariest places in Peru. Buckle up, because this list is a testament to how fear shapes " +
  'the stories a country tells about itself. Number ten is a mountain pass where travellers have reported voices on the wind ' +
  'for more than a century. Locals say the pass was a burial route long before the road was built, and many drivers still ' +
  'refuse to stop there after dark. Number nine is an abandoned hospital on the edge of Lima. It closed in the nineteen ' +
  'nineties, and urban explorers describe doors that close on their own and footsteps on the upper floors. I think the ' +
  'real reason these stories last is simpler than ghosts: the building was never properly sealed, and the wind through ' +
  'broken windows makes exactly the sounds people describe. Here is why that matters for the rest of this list. Almost ' +
  'every place we look at today has a physical explanation that is stranger than the legend, and once you see the pattern ' +
  'you cannot unsee it. Number eight is a desert cemetery where the dry air has preserved the dead for centuries, and the ' +
  'sight of it unsettles visitors far more than any story. Number seven is a colonial mansion in Cusco with a sealed room.';
