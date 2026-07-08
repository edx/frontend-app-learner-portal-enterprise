import { useMemo } from 'react';
import {
  CONTENT_TYPE_COURSE,
  CONTENT_TYPE_PATHWAY,
  CONTENT_TYPE_PROGRAM,
  CONTENT_TYPE_VIDEO,
} from '../../../search/constants';
import { AlgoliaFilterBuilder } from '../../../AlgoliaFilterBuilder';

/**
 * Parameters for the useContentTypeFilter hook
 */
type UseContentTypeFilterParams = {
  /** Base filter string to be combined with content type filters */
  filter: string;
  /** Optional array of content types to filter by */
  contentType: string | null;
  /** Optional learning type to filter by */
  learningType: string | null;
};

/**
 * Result object returned by the useContentTypeFilter hook
 */
type ContentTypeFilterResult = {
  /** Filter string for course content type */
  courseFilter: string;
  /** Filter string for program content type */
  programFilter: string;
  /** Filter string for pathway content type */
  pathwayFilter: string;
  /** Filter string for video content type */
  videoFilter: string;
  /** Filter string for the first content type in the contentTypes array, or null if none provided */
  contentTypeFilter: string | null;
  /** Filter string combining learning type and content type, or null if no learning type provided */
  learningTypeFilter: string | null;
};

/**
 * Builds an Algolia filter string for a specific content type
 * @param filter - Base filter string to be combined with content type filter
 * @param contentType - The content type to filter by
 * @returns A combined filter string
 */
const buildContentTypeFilter = (filter: string, contentType: string): string => {
  const baseFilter = new AlgoliaFilterBuilder().and('content_type', contentType);
  if (filter) {
    baseFilter.andRaw(filter);
  }
  return baseFilter.build();
};
const buildLearningTypeFilter = (filter: string, learningType: string): string => {
  const baseFilter = new AlgoliaFilterBuilder().and('learning_type', learningType, {
    stringify: true,
  });
  if (filter) {
    baseFilter.andRaw(filter);
  }
  return baseFilter.build();
};

/**
 * A hook that generates filter strings for different content types
 * @param params - The parameters for the hook
 * @param params.filter - Base filter string to be combined with content type filters
 * @param params.contentType - Optional string of a content type to filter by
 * @returns An object containing filter strings for different content types
 */
const useContentTypeFilter = (
  { filter, contentType = null, learningType = null }: UseContentTypeFilterParams,
): ContentTypeFilterResult => useMemo(() => ({
  courseFilter: buildContentTypeFilter(filter, CONTENT_TYPE_COURSE),
  programFilter: buildContentTypeFilter(filter, CONTENT_TYPE_PROGRAM),
  pathwayFilter: buildContentTypeFilter(filter, CONTENT_TYPE_PATHWAY),
  videoFilter: buildContentTypeFilter(filter, CONTENT_TYPE_VIDEO),
  contentTypeFilter: contentType
    ? buildContentTypeFilter(filter, contentType)
    : null,
  learningTypeFilter: learningType
    ? buildLearningTypeFilter(
      contentType ? buildContentTypeFilter(filter, contentType) : filter,
      learningType,
    )
    : null,
}), [contentType, filter, learningType]);

export default useContentTypeFilter;
