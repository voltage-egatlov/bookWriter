import init, { parse_bk as wasmParseBk } from '../../../core/pkg/bookwriter_core.js';
import type { Book } from './types';

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module
 * This must be called before using parse_bk
 */
export async function initWasm(): Promise<void> {
  if (wasmInitialized) return;

  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = init().then(() => {
    wasmInitialized = true;
  });

  return wasmInitPromise;
}

/**
 * Parse a .bk file content and return a Book object
 *
 * @param content - The .bk file content as a string
 * @param createdAt - Optional creation timestamp (ISO 8601)
 * @param updatedAt - Optional update timestamp (ISO 8601)
 * @returns Parsed Book object
 * @throws Error if parsing fails
 */
export async function parseBk(
  content: string,
  createdAt?: string,
  updatedAt?: string
): Promise<Book> {
  // Ensure WASM is initialized
  await initWasm();

  try {
    // Call the WASM parse function
    const result = wasmParseBk(content, createdAt, updatedAt);
    return result as Book;
  } catch (error) {
    // Re-throw with better error message
    if (error instanceof Error) {
      throw new Error(`Failed to parse .bk file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if WASM is initialized
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}
