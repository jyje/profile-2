// Parse before dispatching to the static handler. Invalid network-path targets
// must become a client error rather than an uncaught server exception.
export function requestPath(target) {
  try {
    return new URL(target ?? '/', 'http://localhost').pathname;
  } catch {
    return null;
  }
}
