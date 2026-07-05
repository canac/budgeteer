/**
 * Extract the message from an error
 **/
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
