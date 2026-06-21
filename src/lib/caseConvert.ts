// Convert object keys between the backend's snake_case (DRF) and the frontend's
// camelCase. Applied at the apiClient boundary so the rest of the app stays
// camelCase. Values are left untouched — only keys are transformed. Non-plain
// objects (File, Blob, FormData, Date) pass through unchanged.

type Plain = Record<string, unknown>;

const toCamel = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());

const toSnake = (key: string): string =>
  key.replace(/([A-Z])/g, (char) => `_${char.toLowerCase()}`);

function isPlainObject(value: unknown): value is Plain {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  if (typeof File !== 'undefined' && value instanceof File) return false;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return false;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return false;
  if (value instanceof Date) return false;
  return true;
}

function convertKeys(value: unknown, transform: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, transform));
  }
  if (isPlainObject(value)) {
    const result: Plain = {};
    for (const [key, val] of Object.entries(value)) {
      result[transform(key)] = convertKeys(val, transform);
    }
    return result;
  }
  return value;
}

export function camelizeKeys<T = unknown>(value: unknown): T {
  return convertKeys(value, toCamel) as T;
}

export function snakeizeKeys<T = unknown>(value: unknown): T {
  return convertKeys(value, toSnake) as T;
}
