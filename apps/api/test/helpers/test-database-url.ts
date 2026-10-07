/** `postgres://u:p@host/app` becomes `postgres://u:p@host/app_test`. */
export function toTestDatabaseUrl(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = parsed.pathname.endsWith('_test') ? parsed.pathname : `${parsed.pathname}_test`;
  return parsed.toString();
}
