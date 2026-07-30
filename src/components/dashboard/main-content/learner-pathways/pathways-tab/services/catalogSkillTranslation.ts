import { isMalformedCompound, normalizeString } from './algoliaStrings';
import type { CatalogFacetSnapshot, CourseSearchOptions } from '../types';

/** Reduced strict-skill cap for introductory learners (fewer hard filters = broader results). */
const BEGINNER_MAX_STRICT_SKILLS = 3;
/** Maximum number of broad-anchor skills to use as hard facet filters. */
const MAX_STRICT_SKILLS = 4;
/** Maximum number of boost skills to use as optional filters. */
const MAX_BOOST_SKILLS = 8;
/** Maximum number of boost skills promoted to strict when zero strict matches survive grounding. */
const FALLBACK_PROMOTION_LIMIT = 2;
/** Maximum number of query terms drawn from required skills / strict catalog skills. */
const MAX_QUERY_TERMS = 3;

export interface CatalogSkillMatch {
  catalogSkill: string;
  catalogField: string;
}

export interface CatalogTranslation {
  query: string;
  queryAlternates: string[];
  strictSkillFilters: CatalogSkillMatch[];
  boostSkillFilters: CatalogSkillMatch[];
}

export type SkillTier = 'strict' | 'boost';

export interface SkillSignal {
  name: string;
  tier: SkillTier;
  /** Dedup priority: lower wins on a collision (e.g. required(0) > preferred(1) > career(2)). */
  priority: number;
}

export const normalizeCatalogTerm = (value: string): string => value.trim().toLowerCase();

/**
 * Dedupes a candidate skill signal list by normalized name, keeping the highest-priority
 * (lowest `priority` number) source on a collision, and dropping blank/malformed-compound
 * names. Shared by every caller that builds its own signal list (course's three sources,
 * career's two) so the dedup rule stays identical across both.
 */
export const dedupeSkillSignals = (candidates: SkillSignal[]): SkillSignal[] => {
  const deduped = new Map<string, SkillSignal>();
  candidates.forEach((signal) => {
    if (!signal.name || isMalformedCompound(signal.name)) {
      return;
    }
    const key = normalizeCatalogTerm(signal.name);
    const existing = deduped.get(key);
    if (!existing || signal.priority < existing.priority) {
      deduped.set(key, signal);
    }
  });

  return Array.from(deduped.values());
};

/**
 * Builds the deduplicated skill signal list from all three sources — required skills
 * (strict), preferred skills (boost), and the selected career's development skills
 * (boost) — dropping malformed compound terms and keeping only the highest-priority
 * source when the same skill name appears more than once.
 */
const buildSkillSignals = (options: CourseSearchOptions): SkillSignal[] => {
  const { intent, selectedCareer } = options;

  const candidates: SkillSignal[] = [
    ...intent.skillsRequired.map((name) => ({ name: normalizeString(name), tier: 'strict' as const, priority: 0 })),
    ...intent.skillsPreferred.map((name) => ({ name: normalizeString(name), tier: 'boost' as const, priority: 1 })),
    ...(selectedCareer.skillsToDevelop ?? []).map((name) => ({ name: normalizeString(name), tier: 'boost' as const, priority: 2 })),
  ];

  return dedupeSkillSignals(candidates);
};

export interface CatalogLookupEntry {
  value: string;
  field: string;
}

/**
 * Builds a normalized-term -> catalog-value lookup from one or more `{field, values}`
 * facet groups. Earlier groups take priority over later ones on a collision — e.g. course
 * retrieval passes `skill_names` before `skills.name` to preserve that field's priority.
 */
export const buildLookupFromFacetGroups = (
  facetGroups: Array<{ field: string; values: string[] }>,
): Map<string, CatalogLookupEntry> => {
  const lookup = new Map<string, CatalogLookupEntry>();

  facetGroups.forEach(({ field, values }) => {
    values.forEach((value) => {
      const key = normalizeCatalogTerm(value);
      if (!lookup.has(key)) {
        lookup.set(key, { value, field });
      }
    });
  });

  return lookup;
};

/**
 * Grounds a single skill signal against the catalog lookup: exact case-insensitive match
 * only. Returns `null` when the signal isn't literally present in the catalog — it's
 * dropped, not passed through as an ungrounded filter, and never resolved via aliasing or
 * fuzzy matching.
 */
const groundSignal = (signal: SkillSignal, lookup: Map<string, CatalogLookupEntry>): CatalogSkillMatch | null => {
  const normalized = normalizeCatalogTerm(signal.name);

  const direct = lookup.get(normalized);
  if (direct) {
    return { catalogSkill: direct.value, catalogField: direct.field };
  }

  return null;
};

export interface SkillClassificationCaps {
  maxStrict: number;
  maxBoost: number;
  fallbackPromotionLimit: number;
}

export interface SkillClassification {
  strictSkillFilters: CatalogSkillMatch[];
  boostSkillFilters: CatalogSkillMatch[];
}

/**
 * Grounds a signal list against a catalog lookup and tiers the survivors into strict/boost
 * groups, applying `caps` and the fallback-promotion safety net: when zero strict signals
 * survive grounding, up to `caps.fallbackPromotionLimit` boost signals are promoted to
 * strict instead, so a learner with only preferred/boost skills still gets a real hard
 * constraint rather than none at all. Catalog-agnostic and caller-parameterized so both
 * course retrieval (`translateSkillsToCatalog`) and career retrieval
 * (`translateCareerSkillsToCatalog`) share this exact mechanism with their own caps.
 */
export const classifySkillSignals = (
  signals: SkillSignal[],
  lookup: Map<string, CatalogLookupEntry>,
  caps: SkillClassificationCaps,
): SkillClassification => {
  const groundedStrict: CatalogSkillMatch[] = [];
  const groundedBoost: CatalogSkillMatch[] = [];

  signals.forEach((signal) => {
    const match = groundSignal(signal, lookup);
    if (!match) {
      return;
    }
    (signal.tier === 'strict' ? groundedStrict : groundedBoost).push(match);
  });

  let strictSkillFilters = groundedStrict.slice(0, caps.maxStrict);
  let boostSkillFilters: CatalogSkillMatch[];

  if (strictSkillFilters.length) {
    boostSkillFilters = groundedBoost.slice(0, caps.maxBoost);
  } else if (groundedBoost.length) {
    const promoted = groundedBoost.slice(0, caps.fallbackPromotionLimit);
    strictSkillFilters = promoted;
    boostSkillFilters = groundedBoost.slice(promoted.length, promoted.length + caps.maxBoost);
  } else {
    boostSkillFilters = [];
  }

  return { strictSkillFilters, boostSkillFilters };
};

/**
 * Translates a course search's skill signals (required/preferred intent skills plus the
 * selected career's development skills) into a grounded `CatalogTranslation` ready for
 * the course retrieval ladder: catalog-valid strict/boost skill filters, a primary query,
 * and query alternates.
 *
 * No Lightcast metadata (`type_name`/`significance`/`unique_postings`) is available on
 * `CareerMatch.skillsToDevelop` (plain `string[]`), so every career skill is treated as a
 * uniform boost signal rather than scored/branched by taxonomy type — the AI Pathways
 * prototype's own "unknown type" default branch already establishes this as the
 * sanctioned no-metadata behavior.
 */
export const translateSkillsToCatalog = (
  options: CourseSearchOptions,
  facetSnapshot: CatalogFacetSnapshot,
): CatalogTranslation => {
  const { intent, selectedCareer } = options;

  const signals = buildSkillSignals(options);
  const lookup = buildLookupFromFacetGroups([
    { field: 'skill_names', values: facetSnapshot.skill_names },
    { field: 'skills.name', values: facetSnapshot['skills.name'] },
  ]);

  const maxStrict = intent.learnerLevel === 'introductory' ? BEGINNER_MAX_STRICT_SKILLS : MAX_STRICT_SKILLS;
  const { strictSkillFilters, boostSkillFilters } = classifySkillSignals(signals, lookup, {
    maxStrict,
    maxBoost: MAX_BOOST_SKILLS,
    fallbackPromotionLimit: FALLBACK_PROMOTION_LIMIT,
  });

  const careerTitle = normalizeString(selectedCareer.title);
  const requiredSkills = intent.skillsRequired.map(normalizeString).filter(Boolean);

  let query: string;
  if (requiredSkills.length) {
    query = requiredSkills.slice(0, MAX_QUERY_TERMS).map((skill) => skill.toLowerCase()).join(' ');
  } else if (strictSkillFilters.length) {
    query = strictSkillFilters.slice(0, MAX_QUERY_TERMS).map((f) => f.catalogSkill.toLowerCase()).join(' ');
  } else {
    query = careerTitle;
  }

  const queryAlternates = (query !== careerTitle && careerTitle) ? [careerTitle] : [];

  return {
    query,
    queryAlternates,
    strictSkillFilters,
    boostSkillFilters,
  };
};
