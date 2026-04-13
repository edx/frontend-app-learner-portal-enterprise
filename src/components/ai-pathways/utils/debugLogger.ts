/**
 * debugLogger — no-op stub.
 * All debugging has been migrated to responseModel instrumentation.
 * This file is kept to avoid breaking any external references.
 */
export const debugLogger = {
  isEnabled(): boolean {
    return false;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log(_message: string, _data?: any) {},

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(_message: string, _data?: any) {},

  summarizeList(list: string[], limit = 5): string {
    if (!list || list.length === 0) {
      return '0 items';
    }
    const items = list.slice(0, limit).join(', ');
    const suffix = list.length > limit ? `... (+${list.length - limit} more)` : '';
    return `${list.length} items: [${items}${suffix}]`;
  },
};
