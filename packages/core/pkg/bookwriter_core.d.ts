/* tslint:disable */
/* eslint-disable */

/**
 * Parse a .bk file from string and return as JavaScript object
 *
 * # Arguments
 * * `input` - The .bk file content as a string
 * * `created_at` - Optional creation timestamp (ISO 8601/RFC 3339 format)
 * * `updated_at` - Optional modification timestamp (ISO 8601/RFC 3339 format)
 *
 * # Returns
 * A JavaScript object representing the parsed Book with all fields:
 * - id (UUID)
 * - title, author, dedication
 * - created_at, updated_at
 * - chapters (array of Chapter objects with blocks)
 *
 * # Errors
 * Throws a JavaScript Error if parsing fails. The error message includes:
 * - Description of what went wrong
 * - Helpful guidance on how to fix it
 *
 * # Examples
 * ```javascript
 * // Simple usage with auto timestamps
 * const book = parse_bk(fileContent);
 *
 * // With custom timestamps
 * const book = parse_bk(
 *     fileContent,
 *     "2025-01-15T10:30:00Z",
 *     "2025-12-09T14:30:00Z"
 * );
 *
 * // Error handling
 * try {
 *     const book = parse_bk(fileContent);
 *     console.log(book.title);
 * } catch (error) {
 *     console.error("Parse failed:", error);
 * }
 * ```
 */
export function parse_bk(input: string, created_at?: string | null, updated_at?: string | null): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly parse_bk: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
