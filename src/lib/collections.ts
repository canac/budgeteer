export function find<T, K extends keyof T>(array: T[], key: K, value: T[K]): T | null {
  return array.find((item) => item[key] === value) ?? null;
}

export function pluck<T, K extends keyof T>(array: T[], field: K): T[K][] {
  return array.map((item) => item[field]);
}
