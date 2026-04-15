/**
 * Utility for exporting the full AI Pathways response model as a downloadable JSON file.
 * This is primarily used for debugging and sharing generation traces between developers
 * and prompt engineers.
 */
import { AIPathwaysResponseModel } from '../types';
import { formatExportTimestamp } from './dateUtils';

/**
 * Builds a standardized export filename with a timestamp.
 *
 * @param date The date to include in the filename (defaults to now).
 * @returns A string in the format 'learner-rec-output-YYYY-MM-DD_HH-mm-ss.json'.
 */
export function buildExportFilename(date: Date = new Date()): string {
  return `learner-rec-output-${formatExportTimestamp(date)}.json`;
}

/**
 * Safely serializes a value to a JSON string, handling circular references
 * and normalizing undefined values to null for consistent JSON output.
 *
 * @param value The object to serialize.
 * @returns A 2-space indented JSON string.
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
 * Triggers a programmatic browser download of the provided text content.
 *
 * @param filename The desired name for the downloaded file.
 * @param content The string content to be included in the file.
 * @param mimeType The MIME type of the file (defaults to application/json).
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
 * Exports the complete AIPathwaysResponseModel as a timestamped JSON file.
 *
 * @param responseModel The complete staged state and trace of a pathway generation.
 * @param date Optional date override for the filename timestamp.
 */
export function exportResponseModel(
  responseModel: AIPathwaysResponseModel,
  date: Date = new Date(),
): void {
  const filename = buildExportFilename(date);
  const content = safeSerialize(responseModel);
  triggerDownload(filename, content);
}
