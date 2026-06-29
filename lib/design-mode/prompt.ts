/**
 * Design Mode prompt + parsing helpers.
 *
 * The edit engine asks a warm cloud agent to transform a SINGLE selected
 * element's HTML and return it inline (fenced ```html block). These helpers
 * build that prompt, extract the HTML from the streamed reply, and sanitize it
 * before it is sent back to the browser and spliced into the page.
 */

export interface DesignElementPayload {
  tagName: string;
  classes: string[];
  text: string;
  outerHTML: string;
  selectorPath: number[];
}

const MAX_CONTEXT_CHARS = 6000;

export function buildEditPrompt(opts: {
  instruction: string;
  element: DesignElementPayload;
  pageContext: string;
}): string {
  const { instruction, element, pageContext } = opts;
  const context = pageContext.slice(0, MAX_CONTEXT_CHARS);
  const pathLabel = element.selectorPath.length
    ? element.selectorPath.join(" > ")
    : "(root)";

  return `You are working on a personal website inside a live "design mode". The user selected an element and gave an instruction. Decide between two kinds of changes and return HTML accordingly.

## Selected element (position path: ${pathLabel})
\`\`\`html
${element.outerHTML}
\`\`\`

## Page context (reference + data source — do NOT return this, do NOT edit other parts)
\`\`\`html
${context}
\`\`\`

## Instruction
${instruction}

## Choose ONE mode

### Mode A — Visual / content edit (default for restyling or rewording)
Edit the selected element's styles, text, or structure.
- This page's CSS (Tailwind) is compiled ahead of time, so any NEW Tailwind class you add has NO effect. Express EVERY visual change (color, background, font, size, weight, spacing, border, radius, shadow, alignment, etc.) as inline CSS in the element's \`style\` attribute — inline styles always render and win over classes.
- You may keep existing classes/text and may change text or add/remove/restructure children.
- The page may be in light or dark mode — pick concrete colors that look good now.
- Return a SINGLE root HTML element. Do NOT include any <script>.

### Mode B — Interactive widget (when the user asks for functionality or an app)
Use this when the instruction asks to build/add something interactive — e.g. "make a calculator", "add a todo list", "turn my posts into a quiz". A new widget will be ADDED next to the selected element.
- Return a self-contained fragment: the widget markup plus its OWN inline <style> AND inline <script>.
- It runs in an ISOLATED sandbox with NO access to the page and NO network: the page's CSS is unavailable and fetch/XHR/external requests are blocked. So make it fully self-contained, responsive (width:100%), and pure client-side (vanilla JS, no external libraries/fonts/APIs).
- You MAY use the page content above as data for the widget.
- Including a <script> is what signals widget mode to the host.

## Output (STRICT)
- Output exactly ONE \`\`\`html code block and nothing else (no prose).
- Mode A: a single root element, no <script>, preserve existing \`data-*\` attributes.
- Mode B: the widget fragment including its inline <style> and <script>.
- Never use file-editing tools or write files — output the HTML directly.`;
}

/** Widget mode is signalled by the presence of an inline <script>. */
export function isWidgetHtml(html: string): boolean {
  return /<script[\s>]/i.test(html);
}

/** Remove document wrappers, keeping the contents of <head> and <body>. */
function stripDocWrappers(html: string): string {
  let out = html.replace(/<!doctype[^>]*>/gi, "");
  const head = out.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const body = out.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (head || body) {
    out = (head ? head[1] : "") + (body ? body[1] : "");
  }
  return out
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
}

/**
 * Wrap an agent-produced interactive fragment into a full document suitable for
 * an isolated sandboxed iframe `srcdoc`. A strict CSP blocks all network access
 * (no exfiltration / external calls) while allowing the widget's own inline
 * script/style. A tiny script reports height to the parent for auto-sizing.
 */
export function buildWidgetSrcdoc(fragment: string): string {
  const csp = [
    "default-src 'none'",
    "img-src data: https:",
    "media-src data: https:",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "font-src data: https:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join("; ");

  const resize = `(function(){function p(){try{var h=Math.ceil(document.documentElement.getBoundingClientRect().height);parent.postMessage({__designWidget:true,height:h},'*');}catch(e){}}window.addEventListener('load',p);window.addEventListener('resize',p);if(window.ResizeObserver){try{new ResizeObserver(p).observe(document.documentElement);}catch(e){}}setTimeout(p,60);setTimeout(p,400);})();`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>:root{color-scheme:light dark}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif}</style></head><body>${stripDocWrappers(
    fragment
  )}<script>${resize}<\/script></body></html>`;
}

/**
 * Extract the edited element HTML from an assistant reply.
 * Prefers a fenced ```html block, falls back to any fenced block, then to raw
 * HTML-looking text.
 */
export function parseEditedHtml(text: string): string | null {
  if (!text) return null;

  const htmlFence = text.match(/```html\s*([\s\S]*?)```/i);
  if (htmlFence && htmlFence[1].trim()) return htmlFence[1].trim();

  const anyFence = text.match(/```[a-z]*\s*([\s\S]*?)```/i);
  if (anyFence && anyFence[1].includes("<") && anyFence[1].trim()) {
    return anyFence[1].trim();
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("<") && trimmed.includes(">")) return trimmed;

  return null;
}

/**
 * Strip active content from agent-produced HTML before it touches the DOM.
 * Edits are session-only and never shared, but we still remove scripts and
 * inline handlers as a self-XSS guard.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<\/script\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')
    .trim();
}
