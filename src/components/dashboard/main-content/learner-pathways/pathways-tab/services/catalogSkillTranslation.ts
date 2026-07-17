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

/**
 * Curated synonym map for taxonomy/intent terms that don't exact-match a catalog facet
 * value verbatim but resolve to one under a known alias. A local copy (not imported from
 * `ai-pathways/`), matching how `careerRetrieval.ts` already re-declares `isMalformedCompound`
 * rather than importing it.
 */
const CATALOG_ALIAS_MAP: Record<string, string> = {
  python: 'Python (Programming Language)',
  javascript: 'JavaScript (Programming Language)',
  sql: 'SQL (Programming Language)',
  'front end': 'Front End (Software Engineering)',
  frontend: 'Front End (Software Engineering)',
};

type CatalogSkillField = 'skill_names' | 'skills.name';

export interface CatalogSkillMatch {
  catalogSkill: string;
  catalogField: CatalogSkillField;
}

export interface CatalogTranslation {
  query: string;
  queryAlternates: string[];
  strictSkillFilters: CatalogSkillMatch[];
  boostSkillFilters: CatalogSkillMatch[];
}

type SkillTier = 'strict' | 'boost';

interface SkillSignal {
  name: string;
  tier: SkillTier;
  /** Dedup priority: required(0) > preferred(1) > career(2) — lower wins. */
  priority: number;
}

const normalizeText = (value?: string | null): string => (value || '').trim();

const normalizeCatalogTerm = (value: string): string => value.trim().toLowerCase();

const isMalformedCompound = (name: string): boolean => name.includes(' & ') || name.includes(' + ');

/**
 * Builds the deduplicated skill signal list from all three sources — required skills
 * (strict), preferred skills (boost), and the selected career's development skills
 * (boost) — dropping malformed compound terms and keeping only the highest-priority
 * source when the same skill name appears more than once.
 */
const buildSkillSignals = (options: CourseSearchOptions): SkillSignal[] => {
  const { intent, selectedCareer } = options;

  const candidates: SkillSignal[] = [
    ...intent.skillsRequired.map((name) => ({ name: normalizeText(name), tier: 'strict' as const, priority: 0 })),
    ...intent.skillsPreferred.map((name) => ({ name: normalizeText(name), tier: 'boost' as const, priority: 1 })),
    ...(selectedCareer.skillsToDevelop ?? []).map((name) => ({ name: normalizeText(name), tier: 'boost' as const, priority: 2 })),
  ];

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

interface CatalogLookupEntry {
  value: string;
  field: CatalogSkillField;
}

/**
 * Builds a normalized-term -> catalog-value lookup from the facet snapshot.
 * `skill_names` takes priority over `skills.name` on a collision; `subjects` is
 * intentionally excluded — subjects are never valid filter candidates here.
 */
const buildCatalogLookup = (facetSnapshot: CatalogFacetSnapshot): Map<string, CatalogLookupEntry> => {
  const lookup = new Map<string, CatalogLookupEntry>();

  facetSnapshot.skill_names.forEach((value) => {
    lookup.set(normalizeCatalogTerm(value), { value, field: 'skill_names' });
  });

  facetSnapshot['skills.name'].forEach((value) => {
    const key = normalizeCatalogTerm(value);
    if (!lookup.has(key)) {
      lookup.set(key, { value, field: 'skills.name' });
    }
  });

  return lookup;
};

/**
 * Grounds a single skill signal against the catalog lookup: exact case-insensitive
 * match first, then the curated alias map (only accepted if the alias *target* itself
 * resolves in the snapshot). Returns `null` when the signal can't be grounded at all —
 * it's dropped, not passed through as an ungrounded filter.
 */
const groundSignal = (signal: SkillSignal, lookup: Map<string, CatalogLookupEntry>): CatalogSkillMatch | null => {
  const normalized = normalizeCatalogTerm(signal.name);

  const direct = lookup.get(normalized);
  if (direct) {
    return { catalogSkill: direct.value, catalogField: direct.field };
  }

  const aliasTarget = CATALOG_ALIAS_MAP[normalized];
  if (aliasTarget) {
    const aliasMatch = lookup.get(normalizeCatalogTerm(aliasTarget));
    if (aliasMatch) {
      return { catalogSkill: aliasMatch.value, catalogField: aliasMatch.field };
    }
  }

  return null;
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
  const lookup = buildCatalogLookup(facetSnapshot);

  const groundedStrict: CatalogSkillMatch[] = [];
  const groundedBoost: CatalogSkillMatch[] = [];

  signals.forEach((signal) => {
    const match = groundSignal(signal, lookup);
    if (!match) {
      return;
    }
    (signal.tier === 'strict' ? groundedStrict : groundedBoost).push(match);
  });

  const maxStrict = intent.learnerLevel === 'introductory' ? BEGINNER_MAX_STRICT_SKILLS : MAX_STRICT_SKILLS;

  let strictSkillFilters = groundedStrict.slice(0, maxStrict);
  let boostSkillFilters: CatalogSkillMatch[];

  if (strictSkillFilters.length) {
    boostSkillFilters = groundedBoost.slice(0, MAX_BOOST_SKILLS);
  } else if (groundedBoost.length) {
    const promoted = groundedBoost.slice(0, FALLBACK_PROMOTION_LIMIT);
    strictSkillFilters = promoted;
    boostSkillFilters = groundedBoost.slice(promoted.length, promoted.length + MAX_BOOST_SKILLS);
  } else {
    boostSkillFilters = [];
  }

  const careerTitle = normalizeText(selectedCareer.title);
  const requiredSkills = intent.skillsRequired.map(normalizeText).filter(Boolean);

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
