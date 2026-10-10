/**
 * Where to go after logging in or signing up: the page the user was heading
 * for (`?redirect=`), but only a path in this app. Anything else, such as
 * `https://…` or a protocol-relative `//…` (which browsers also read from
 * `/\…`), goes to the dashboard instead.
 */
export function safeRedirect(url: string | undefined): string {
  return url?.startsWith('/') && !/^\/[/\\]/.test(url) ? url : '/'
}
