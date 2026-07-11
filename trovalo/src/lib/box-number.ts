export function boxNumber(id: string): string {
  const m = id.match(/-(\d+)$/);
  return m ? m[1] : id;
}
