/** One attempt per user refresh. HTTP failures must not trigger hidden retries. */
export async function fetchCalendarEndpoint<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Calendar request failed: ${url} (HTTP ${response.status})`);
  }
  return response.json() as Promise<T>;
}
