export function pluck<T, K extends keyof T>(array: T[], field: K): T[K][] {
  return array.map((item) => item[field]);
}
