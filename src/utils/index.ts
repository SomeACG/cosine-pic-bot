// 数组去重
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
