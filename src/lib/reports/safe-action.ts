export async function safeReportAction<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[reports] ${name} failed:`, err);
    return fallback;
  }
}
