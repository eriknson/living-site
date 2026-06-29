/**
 * DOM helpers for the Design Mode element picker.
 *
 * Elements are identified by a stable child-index path relative to the editable
 * root. The path survives an `outerHTML` swap of the selected element (its
 * position among siblings is unchanged), so we can re-find and re-select it
 * after an edit.
 */

export interface PickedElement {
  selectorPath: number[];
  tagName: string;
  classes: string[];
  text: string;
  outerHTML: string;
}

/** Child-index path from `root` (exclusive) down to `el` (inclusive). */
export function computePath(el: Element, root: Element): number[] {
  const path: number[] = [];
  let cur: Element | null = el;
  while (cur && cur !== root) {
    const parent: Element | null = cur.parentElement;
    if (!parent) break;
    const idx = Array.prototype.indexOf.call(parent.children, cur);
    if (idx < 0) break;
    path.unshift(idx);
    cur = parent;
  }
  return path;
}

/** Resolve a child-index path back to a live element under `root`. */
export function findByPath(root: Element, path: number[]): HTMLElement | null {
  let cur: Element = root;
  for (const idx of path) {
    const child = cur.children[idx];
    if (!child) return null;
    cur = child;
  }
  return cur === root ? null : (cur as HTMLElement);
}

export function describe(el: Element): {
  tagName: string;
  classes: string[];
  text: string;
} {
  const tagName = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).slice(0, 8);
  const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  return { tagName, classes, text };
}

/**
 * Resolve a mouse event target to a meaningful, editable element: it must live
 * inside `root` and must not be `root` itself.
 */
export function meaningfulFrom(
  target: EventTarget | null,
  root: Element
): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target === root || !root.contains(target)) return null;
  return target as HTMLElement;
}

export function toPayload(el: HTMLElement, root: Element): PickedElement {
  const { tagName, classes, text } = describe(el);
  return {
    selectorPath: computePath(el, root),
    tagName,
    classes,
    text,
    outerHTML: el.outerHTML,
  };
}
