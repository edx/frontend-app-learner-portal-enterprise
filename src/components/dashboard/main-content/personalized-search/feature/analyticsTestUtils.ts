/** Every payload must be flat: primitives or arrays of primitives (the warehouse stores them as is). */
export const expectFlat = (properties: Record<string, unknown>) => {
  Object.entries(properties).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((v) => {
      expect([null, 'string', 'number', 'boolean']).toContain(v === null ? null : typeof v);
    });
    expect(key).not.toMatch(/(^|_)(count|total|rate|cost|age)(_|$)/);
  });
};
