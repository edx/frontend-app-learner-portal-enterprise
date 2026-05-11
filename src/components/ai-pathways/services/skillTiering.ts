import { SkillSignal, TieredSkillSignal } from '../types';
import { RetrievalSkillTier } from '../types/translationContracts';

/**
 * Returns true when a skill name is a compound artifact like "AutomationSQL & Python".
 * These are parsing artifacts — not real skills — and should be excluded from retrieval.
 */
export function isMalformedCompound(name: string): boolean {
  return name.includes(' & ') || name.includes(' + ');
}

function median(values: number[]): number {
  if (!values.length) { return 0; }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Classifies a single SkillSignal into a tier.
 *
 * Tiering is entirely source-driven — no hardcoded skill name lists:
 * - intent_required  → broad_anchor  (Xpert prompt classifies these as broad career areas)
 * - intent_preferred → narrow_signal (Xpert prompt classifies these as tools/languages)
 * - career_taxonomy  → Lightcast type_name determines tier
 */
export function tierSkillSignal(signal: SkillSignal, allSignals: SkillSignal[] = []): TieredSkillSignal {
  const normalizedName = signal.name.trim().toLowerCase();

  if (isMalformedCompound(signal.name)) {
    return {
      ...signal,
      tier: 'noise',
      reasons: ['malformed-compound'],
      normalizedName,
      score: 0,
    };
  }

  if (signal.source === 'intent_required') {
    return {
      ...signal,
      tier: 'broad_anchor',
      reasons: ['source=intent_required'],
      normalizedName,
      score: 80,
    };
  }

  if (signal.source === 'intent_preferred') {
    return {
      ...signal,
      tier: 'narrow_signal',
      reasons: ['source=intent_preferred'],
      normalizedName,
      score: 40,
    };
  }

  // career_taxonomy: use Lightcast type_name as primary tier signal
  let tier: RetrievalSkillTier;
  let baseScore: number;
  let reasons: string[];

  switch (signal.typeName) {
    case 'Software Product':
      tier = 'narrow_signal';
      baseScore = 30;
      reasons = ['lightcast-type=Software Product'];
      break;
    case 'Specialized Skill':
      tier = 'narrow_signal';
      baseScore = 35;
      reasons = ['lightcast-type=Specialized Skill'];
      break;
    case 'Common Skill':
      tier = 'role_differentiator';
      baseScore = 50;
      reasons = ['lightcast-type=Common Skill'];
      break;
    case 'Certification':
      tier = 'role_differentiator';
      baseScore = 45;
      reasons = ['lightcast-type=Certification'];
      break;
    default:
      tier = 'role_differentiator';
      baseScore = 40;
      reasons = ['lightcast-type=unknown-fallback'];
  }

  // Score within tier using significance relative to peers
  const taxonomySignificances = allSignals
    .filter(s => s.source === 'career_taxonomy' && s.significance !== undefined)
    .map(s => s.significance as number);
  const medianSig = median(taxonomySignificances);
  const sigBonus = (signal.significance !== undefined && medianSig > 0)
    ? Math.min(20, (signal.significance / medianSig) * 10)
    : 0;

  // Demote extremely rare narrow skills to noise
  if (tier === 'narrow_signal' && signal.uniquePostings !== undefined && signal.uniquePostings < 50) {
    return {
      ...signal,
      tier: 'noise',
      reasons: [...reasons, 'rare-skill-demoted'],
      normalizedName,
      score: 0,
    };
  }

  return {
    ...signal,
    tier,
    reasons,
    normalizedName,
    score: baseScore + sigBonus,
  };
}

/**
 * Tiers all signals, deduplicating by normalized name and keeping the
 * highest-priority source when duplicates exist (intent_required wins over others).
 */
export function tierAllSignals(signals: SkillSignal[]): TieredSkillSignal[] {
  const SOURCE_PRIORITY: Record<string, number> = {
    intent_required: 0,
    intent_preferred: 1,
    career_taxonomy: 2,
  };

  // Dedupe by normalized name, keeping highest-priority source
  const deduped = new Map<string, SkillSignal>();
  for (const signal of signals) {
    const key = signal.name.trim().toLowerCase();
    const existing = deduped.get(key);
    if (!existing || SOURCE_PRIORITY[signal.source] < SOURCE_PRIORITY[existing.source]) {
      deduped.set(key, signal);
    }
  }

  const dedupedSignals = Array.from(deduped.values());
  return dedupedSignals.map(signal => tierSkillSignal(signal, dedupedSignals));
}
