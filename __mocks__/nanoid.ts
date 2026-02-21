// Manual mock for nanoid — CJS-compatible, returns deterministic IDs
let _counter = 0;

export function nanoid(_size?: number): string {
    return `test-${String(++_counter).padStart(8, "0")}`;
}

/** Reset the counter between test suites */
export function __resetCounter(): void {
    _counter = 0;
}
