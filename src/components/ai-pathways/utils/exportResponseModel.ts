/**
 * exportResponseModel — utilities for exporting the full AI Pathways responseModel
 * as a downloadable JSON file.
 *
 * No console logging. No backend persistence. Browser-only download.
 */
import { AIPathwaysResponseModel } from '../types';
import { formatExportTimestamp } from './dateUtils';

/**
 * @typedef {Object} AIPathwaysResponseModel
 * @property {string} requestId - Unique ID for the request
 * @property {Object} stages - Metadata for each pipeline stage
 * @property {Array} [promptDebug] - Recorded Xpert prompt interceptions
 */

/**
 * Builds the export filename with the required prefix and timestamp.
 *
 * @param {Date} [date=new Date()] - Date to use for the timestamp
 * @returns {string} Formatted filename (e.g., learner-rec-output-2026-04-13_16-42-09.json)
 */
export function buildExportFilename(date: Date = new Date()): string {
  return `learner-rec-output-${formatExportTimestamp(date)}.json`;
}

/**
 * Safely serializes a value to a JSON string, normalizing any
 * non-serializable values (e.g. undefined, circular refs).
 *
 * @param {unknown} value - Value to serialize
 * @returns {string} 2-space indented JSON string
 */
export function safeSerialize(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === 'undefined') {
        return null;
      }
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    },
    2,
  );
}

/**
 * Triggers a browser file download for the given text content.
 *
 * @param {string} filename - The name for the downloaded file
 * @param {string} content - UTF-8 text content to include in the file
 * @param {string} [mimeType='application/json'] - MIME type
 */
export function triggerDownload(
  filename: string,
  content: string,
  mimeType = 'application/json',
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exports the full responseModel as a timestamped JSON file download.
 *
 * @param {AIPathwaysResponseModel} responseModel - The complete model to export
 * @param {Date} [date=new Date()] - Optional Date override (useful for testing)
 *
 * @remarks
 * Dependencies:
 * - formatExportTimestamp utility
 * - Browser DOM (for anchor-click download)
 */
export function exportResponseModel(
  responseModel: AIPathwaysResponseModel,
  date: Date = new Date(),
): void {
  const filename = buildExportFilename(date);
  const content = safeSerialize(responseModel);
  triggerDownload(filename, content);
}
