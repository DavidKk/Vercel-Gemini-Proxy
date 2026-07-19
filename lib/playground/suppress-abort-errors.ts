/**
 * Inline script installed with next/script beforeInteractive.
 * Stops AbortError from aborted navigations/fetches reaching the Next.js
 * Dev Tools overlay (which registers later and treats abort as Runtime Error).
 */
export const SUPPRESS_ABORT_ERRORS_SCRIPT = `
(function () {
  function isAbort(value) {
    if (!value) return false;
    if (typeof value === 'string') {
      return /abort|operation was aborted|aborted without reason|The user aborted|signal is aborted/i.test(value);
    }
    if (typeof value !== 'object') return false;
    if (value.name === 'AbortError') return true;
    var msg = value.message != null ? String(value.message) : '';
    return /operation was aborted|aborted without reason|The user aborted|signal is aborted/i.test(msg);
  }

  function looksLikeAbortArgs(args) {
    for (var i = 0; i < args.length; i++) {
      if (isAbort(args[i])) return true;
      if (typeof args[i] === 'string' && isAbort(args[i])) return true;
    }
    return false;
  }

  window.addEventListener(
    'unhandledrejection',
    function (event) {
      if (isAbort(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    function (event) {
      if (isAbort(event.error) || isAbort(event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  // Next Dev Tools also watches console.error for some runtime issues.
  var origError = console.error;
  console.error = function () {
    if (looksLikeAbortArgs(arguments)) return;
    return origError.apply(console, arguments);
  };
})();
`.trim()
