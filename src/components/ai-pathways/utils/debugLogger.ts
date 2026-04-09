/**
 * Simple debug logger for the MVP flow.
 * Logs are only output if localStorage.getItem('DEBUG_MVP_FLOW') === 'true'.
 */
export const debugLogger = {
  isEnabled(): boolean {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('DEBUG_MVP_FLOW') === 'true';
    } catch {
      return false;
    }
  },

  log(message: string, data?: any) {
    if (this.isEnabled()) {
      // eslint-disable-next-line no-console
      console.log(`[MVP_DEBUG] ${message}`, data || '');
    }
  },

  warn(message: string, data?: any) {
    if (this.isEnabled()) {
      // eslint-disable-next-line no-console
      console.warn(`[MVP_DEBUG] ${message}`, data || '');
    }
  },

  /**
   * Summarizes a list of strings by providing count and first few items.
   */
  summarizeList(list: string[], limit = 5): string {
    if (!list || list.length === 0) {
      return '0 items';
    }
    const items = list.slice(0, limit).join(', ');
    const suffix = list.length > limit ? `... (+${list.length - limit} more)` : '';
    return `${list.length} items: [${items}${suffix}]`;
  },
};
