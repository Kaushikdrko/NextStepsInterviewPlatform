// A deliberately small response cache.
//
// The dashboard re-issues the same request constantly — paging back and forth,
// toggling a filter and toggling it back, reopening a drawer. Serving those from
// memory keeps the table from flashing and keeps load off the aggregation query.
// Entries are short-lived so a champion never studies stale numbers for long.

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

export class ResponseCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 50,
  ) {}

  read(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.storedAt > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  write(key: string, value: T): void {
    // Re-inserting moves the key to the end, so the first key is the oldest.
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: Date.now() });

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) {
        break;
      }
      this.entries.delete(oldest.value);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
