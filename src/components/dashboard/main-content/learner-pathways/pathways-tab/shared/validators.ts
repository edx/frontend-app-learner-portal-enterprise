/**
 * Returns a React Hook Form validate function that rejects empty and whitespace-only values.
 *
 * @param errorMessage - Localised message returned when the field fails validation.
 */
export const requiredNonWhitespace = (errorMessage: string) => (value: string): true | string => (
  value.trim().length > 0 || errorMessage
);
