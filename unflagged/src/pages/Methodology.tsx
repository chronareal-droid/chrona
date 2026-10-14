import { Link } from 'react-router-dom';
import { Prose } from '../components/ui';
import { BRAND } from '../lib/brand';

export default function Methodology() {
  return (
    <Prose>
      <h1>How {BRAND.name} reads your channel</h1>
      <p>
        {BRAND.name} is a pre-check. It looks for the risk patterns that YouTube’s published monetization policies describe,
        using only what you give us. Here’s exactly what we look at, how it maps to each policy category, and what we can’t see.
      </p>

      <h2>What we look at</h2>
      <ul>
        <li><strong>Titles</strong> from your Videos tab screenshots. We measure how many share the same 3-word opening or ending, and how much wording repeats between titles.</li>
        <li><strong>Thumbnails</strong>: style, colors, text on them, figures and layout, as described by the AI reading your screenshots.</li>
        <li><strong>Durations</strong>: how tightly your video lengths cluster. Hand-made videos rarely all land within 10% of each other.</li>
        <li><strong>Upload rhythm</strong>: an estimate of uploads per week from the “3 days ago” labels, and same-day bursts.</li>
        <li><strong>Scripts</strong> you paste: how often your own opinion and analysis show up (“here’s why”, “I think”), stock AI phrases (“let’s dive in”, “a testament to”), and sentences reused across scripts, like identical intros and outros.</li>
        <li><strong>Your answers</strong> about voice, visuals, how scripts are made, and your niche.</li>
      </ul>
      <p>
        The title, duration, rhythm and script numbers are computed by plain code, not AI, so they’re the same every time.
        An AI model then weighs those numbers with your uploads and writes the read. Every quote in your report is checked
        against what you uploaded, and any title or line we can’t find there is removed.
      </p>

      <h2>How that maps to the policy</h2>
      <ul>
        <li><strong>Generic, repetitive or template-based</strong>: templated titles, near-identical thumbnails and lengths, high-volume uploading, reused script structure, narration that could fit any channel.</li>
        <li><strong>Unsatisfying or off-putting</strong>: shock or distress formulas in titles and thumbnails, and scripts built to bait rather than deliver.</li>
        <li><strong>AI personas on sensitive topics</strong>: an AI voice or presenter giving health, finance or legal information.</li>
        <li><strong>Reused content</strong>: clips from other creators or media, or adapted material, without significant commentary or changes of your own.</li>
      </ul>
      <p>Using AI isn’t banned by itself. What the policy cares about is your original input and real variation from video to video.</p>

      <h2>What we can’t see</h2>
      <ul>
        <li>Your actual videos, audio, descriptions, comments or analytics.</li>
        <li>Anything YouTube sees internally, or how a human reviewer will judge your channel.</li>
        <li>Videos outside your screenshots, or scripts you didn’t paste.</li>
      </ul>
      <p>
        Every report includes a note on what we couldn’t see and how that limits the read. It’s a guide to lowering your
        risk, not a decision, and nobody can honestly promise approval.
      </p>
      <p><Link to="/scan">Run a free scan →</Link></p>
    </Prose>
  );
}
