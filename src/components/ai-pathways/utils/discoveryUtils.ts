import { sanitizeTags } from './tagUtils';

/**
 * Merges two tag arrays, ensuring they are unique and sanitized.
 */
export function mergeTags(existing?: string[], next?: string[]): string[] | undefined {
  return sanitizeTags([...(existing || []), ...(next || [])]);
}

/**
 * Merges two discovery objects from Xpert.
 * If both objects contain a 'documents' array, they are concatenated.
 */
export function mergeDiscovery(existing: any, next: any): any {
  if (!next) {
    return existing;
  }
  if (!existing) {
    return next;
  }

  const merged = { ...existing, ...next };

  if (Array.isArray(existing.documents) && Array.isArray(next.documents)) {
    // Combine documents from both discoveries
    merged.documents = [...existing.documents, ...next.documents];

    // Optional: unique by id if present
    const seenIds = new Set();
    merged.documents = merged.documents.filter((doc: any) => {
      if (!doc.id) {
        return true;
      }
      if (seenIds.has(doc.id)) {
        return false;
      }
      seenIds.add(doc.id);
      return true;
    });
  }

  return merged;
}
