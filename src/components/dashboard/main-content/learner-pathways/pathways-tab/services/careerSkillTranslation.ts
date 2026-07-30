import { normalizeString } from './algoliaStrings';
import {
  buildLookupFromFacetGroups, classifySkillSignals, dedupeSkillSignals,
} from './catalogSkillTranslation';
import type { SkillClassification, SkillSignal } from './catalogSkillTranslation';
import type { CareerFacetSnapshot, CareerSearchIntent } from '../types';

/** Maximum number of required (strict) skills to use as hard facet filters. */
const CAREER_REQUIRED_OPTIONAL_FILTER_LIMIT = 4;
/** Maximum number of preferred (boost) skills to use as optional filters. */
const CAREER_PREFERRED_OPTIONAL_FILTER_LIMIT = 2;
/** Maximum number of boost skills promoted to strict when zero strict matches survive grounding. */
const CAREER_FALLBACK_PROMOTION_LIMIT = 2;

/**
 * Builds career retrieval's skill signal list: required skills are the strict-tier
 * source, preferred skills are the boost-tier source. Preferred skills are dropped
 * entirely for introductory learners, matching the pre-existing suppression behavior
 * (avoids over-narrowing for a learner just starting out) — unlike course retrieval,
 * career retrieval has no third "selected career" boost source, since career retrieval
 * generates the candidate careers in the first place.
 */
const buildCareerSkillSignals = (intent: CareerSearchIntent): SkillSignal[] => {
  const preferredSkills = intent.learnerLevel === 'introductory' ? [] : intent.skillsPreferred;

  const candidates: SkillSignal[] = [
    ...intent.skillsRequired.map((name) => ({ name: normalizeString(name), tier: 'strict' as const, priority: 0 })),
    ...preferredSkills.map((name) => ({ name: normalizeString(name), tier: 'boost' as const, priority: 1 })),
  ];

  return dedupeSkillSignals(candidates);
};

/**
 * Translates a career/taxonomy search's skill signals (`skillsRequired`/`skillsPreferred`)
 * into a grounded strict/boost `SkillClassification`, reusing course retrieval's exact
 * grounding + tiering + fallback-promotion mechanism (`classifySkillSignals`) with
 * career's own, smaller caps — required/strict skills cap at 4, preferred/boost skills
 * cap at 2, matching the pre-existing optional-filter caps this replaces.
 */
export const translateCareerSkillsToCatalog = (
  intent: CareerSearchIntent,
  facetSnapshot: CareerFacetSnapshot,
): SkillClassification => {
  const signals = buildCareerSkillSignals(intent);
  const lookup = buildLookupFromFacetGroups([
    { field: 'skills.name', values: facetSnapshot['skills.name'] },
  ]);

  return classifySkillSignals(signals, lookup, {
    maxStrict: CAREER_REQUIRED_OPTIONAL_FILTER_LIMIT,
    maxBoost: CAREER_PREFERRED_OPTIONAL_FILTER_LIMIT,
    fallbackPromotionLimit: CAREER_FALLBACK_PROMOTION_LIMIT,
  });
};
