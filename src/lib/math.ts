export function add(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

export function sub(a: number[], b: number[]): number[] {
  return a.map((val, i) => val - b[i]);
}

export function mul(a: number[], scalar: number): number[] {
  return a.map(val => val * scalar);
}

export function div(a: number[], scalar: number): number[] {
  return a.map(val => val / scalar);
}

export function norm(a: number[]): number {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

export function dot(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

export function mean(a: number[]): number {
  if (a.length === 0) return 0;
  return a.reduce((sum, val) => sum + val, 0) / a.length;
}

export function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function randnArray(size: number): number[] {
  return Array.from({ length: size }, () => randn());
}
