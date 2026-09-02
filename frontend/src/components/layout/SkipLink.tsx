/** First focusable element on every page: jumps to <main id="main">. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-950 focus:shadow-glow"
    >
      Skip to content
    </a>
  );
}
