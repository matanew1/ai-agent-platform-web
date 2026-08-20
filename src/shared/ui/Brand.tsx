/** Product mark used across authentication and workspace navigation.
 *
 * The glyph itself is a CSS background-image, not an <img> - it needs to swap
 * between a white-line and a dark-line rendering of the same mark depending on
 * the app's theme (see .brand-glyph / [data-theme="light"] .brand-glyph in
 * styles.css), and only the variant matching the active `data-theme` on <html>
 * is ever fetched this way, unlike two stacked <img> elements toggled by
 * visibility, which would both download. */
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-glyph" />
      </span>
      <span><strong>Wyrmind</strong><small>Forge intelligent agents</small></span>
    </div>
  );
}
