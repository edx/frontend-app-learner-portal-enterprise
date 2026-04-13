/**
 * exportResponseModel — utilities for exporting the full AI Pathways responseModel
 * as a downloadable JSON file.
 *
 * No console logging. No backend persistence. Browser-only download.
 */
import { AIPathwaysResponseModel } from '../types';

/**
 * Formats a Date into the required filename timestamp segment.
 * Output format: YYYY-MM-DD_HH-mm-ss
 */
export function formatExportTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Builds the export filename with the required prefix and timestamp.
 * Example: learner-rec-output-2026-04-13_16-42-09.json
 */
export function buildExportFilename(date: Date = new Date()): string {
  return `learner-rec-output-${formatExportTimestamp(date)}.json`;
}

/**
 * Safely serializes a value to a JSON string, normalizing any
 * non-serializable values (e.g. undefined, circular refs) rather than throwing.
 * Uses 2-space indentation for readability.
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
 * @param filename - the name for the downloaded file
 * @param content  - UTF-8 text content to include in the file
 * @param mimeType - MIME type (defaults to application/json)
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
 * This is the single entry-point for the DebugConsole Export button.
 *
 * @param responseModel - the complete AIPathwaysResponseModel to export
 * @param date          - optional Date override (useful for testing)
 */
export function exportResponseModel(
  responseModel: AIPathwaysResponseModel,
  date: Date = new Date(),
): void {
  const filename = buildExportFilename(date);
  const content = safeSerialize(responseModel);
  triggerDownload(filename, content);
}
