/**
 * Deterministic Markdown → HTML renderer for blog posts
 * 
 * This produces the EXACT HTML format used in existing posts:
 * - Code blocks with CSS variable styling and syntax highlighting
 * - Tweet embeds with blockquote structure
 * - Images with figure and rounded-lg classes
 * - Links with target="_blank" rel="noopener noreferrer"
 * - Proper escaping and formatting
 */

// Syntax highlighting keywords by language
const KEYWORDS: Record<string, string[]> = {
  typescript: ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'async', 'await', 'default', 'new', 'this', 'typeof', 'extends', 'implements'],
  javascript: ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'async', 'await', 'default', 'new', 'this', 'typeof'],
  bash: ['npm', 'npx', 'pnpm', 'yarn', 'git', 'curl', 'rm', 'mkdir', 'cd', 'echo', 'export', 'if', 'then', 'fi', 'for', 'do', 'done'],
  yaml: ['strategy', 'matrix', 'model', 'name', 'run', 'uses', 'with', 'env', 'if', 'steps', 'jobs'],
};

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Apply syntax highlighting to code
 */
function highlightCode(code: string, language: string): string {
  let result = escapeHtml(code);
  
  const lang = language.toLowerCase().replace(/^(ts|tsx)$/, 'typescript').replace(/^(js|jsx)$/, 'javascript').replace(/^(sh|shell)$/, 'bash').replace(/^(yml)$/, 'yaml');
  
  // Highlight comments
  result = result.replace(/(\/\/.*?)(\n|$)/g, '<span style="color: var(--code-comment);">$1</span>$2');
  result = result.replace(/(#.*?)(\n|$)/g, '<span style="color: var(--code-comment);">$1</span>$2');
  
  // Highlight strings (single and double quotes)
  result = result.replace(/(&quot;[^&]*?&quot;)/g, '<span style="color: var(--code-string);">$1</span>');
  result = result.replace(/('(?:[^'\\]|\\.)*?')/g, '<span style="color: var(--code-string);">$1</span>');
  result = result.replace(/(`(?:[^`\\]|\\.)*?`)/g, '<span style="color: var(--code-string);">$1</span>');
  
  // Highlight keywords
  const keywords = KEYWORDS[lang] || KEYWORDS['typescript'];
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b(${keyword})\\b(?![^<]*>)`, 'g');
    result = result.replace(regex, '<span style="color: var(--code-keyword);">$1</span>');
  }
  
  // Highlight types (PascalCase words)
  result = result.replace(/\b([A-Z][a-zA-Z0-9]*)\b(?![^<]*>)/g, '<span style="color: var(--code-type);">$1</span>');
  
  // Highlight numbers
  result = result.replace(/\b(\d+)\b(?![^<]*>)/g, '<span style="color: var(--code-number);">$1</span>');
  
  return result;
}

/**
 * Render a code block with proper styling
 */
function renderCodeBlock(code: string, language: string, isAsciiArt: boolean = false): string {
  const margin = isAsciiArt ? '2rem 0' : '1.5rem 0';
  const highlighted = isAsciiArt ? escapeHtml(code) : highlightCode(code, language);
  
  return `<pre style="margin: ${margin}; border-radius: 0.75rem; border: 1px solid var(--code-border); background: var(--code-bg); padding: 1.25rem; overflow-x: auto;"><code style="font-size: 13px; line-height: 1.6; font-family: ui-monospace, monospace; color: var(--code-text);">${highlighted}</code></pre>`;
}

/**
 * Render a tweet embed
 */
function renderTweetEmbed(url: string): string {
  // Convert x.com to twitter.com for the embed
  const twitterUrl = url.replace('x.com', 'twitter.com');
  return `<div class="my-8 flex justify-center">
  <blockquote class="twitter-tweet" data-dnt="true" data-theme="dark"><a href="${twitterUrl}"></a></blockquote>
</div>`;
}

/**
 * Render an image
 */
function renderImage(src: string, alt: string): string {
  return `<figure class="my-8"><img src="${src}" alt="${alt}" class="w-full rounded-lg" /></figure>`;
}

/**
 * Render inline markdown (bold, italic, code, links)
 */
function renderInline(text: string): string {
  let result = text;
  
  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    if (url.startsWith('/')) {
      return `<a href="${url}">${text}</a>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  
  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
  
  // Inline code: `text`
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  return result;
}

/**
 * Check if a code block is ASCII art (diagrams, etc.)
 */
function isAsciiArt(code: string): boolean {
  const lines = code.split('\n');
  const boxChars = /[│├┤┬┴┼╭╮╰╯┌┐└┘─═║╔╗╚╝╠╣╦╩╬▶◀►◄▲▼]/;
  const hasBoxChars = lines.some(line => boxChars.test(line));
  const hasArrows = code.includes('───') || code.includes('──▶') || code.includes('◄──');
  return hasBoxChars || hasArrows;
}

/**
 * Main function: Convert markdown to styled HTML
 */
export function markdownToHtml(markdown: string, images?: { position: string; src: string; alt: string }[]): string {
  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let i = 0;
  let imageIndex = 0;

  // Some Notion → Markdown pipelines accidentally put the language on the first
  // line *inside* the code fence:
  // ```
  //
  // typescript
  // const x = 1
  // ```
  // We treat that as metadata (language) and do not render it.
  const KNOWN_CODE_LANGS = new Set([
    'bash',
    'sh',
    'shell',
    'javascript',
    'js',
    'typescript',
    'ts',
    'tsx',
    'yaml',
    'yml',
    'markdown',
    'md',
    'python',
    'py',
    'json',
    'html',
    'css',
    'text',
    'plain text',
  ]);
  
  // Helper to insert images after headings or at specific positions
  const insertImagesAfter = (afterHeading?: string) => {
    if (!images) return;
    while (imageIndex < images.length) {
      const img = images[imageIndex];
      if (afterHeading && img.position === afterHeading) {
        htmlParts.push(renderImage(img.src, img.alt));
        imageIndex++;
      } else if (!afterHeading && img.position === 'inline') {
        htmlParts.push(renderImage(img.src, img.alt));
        imageIndex++;
      } else {
        break;
      }
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    
    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }
    
    // Horizontal rule
    if (line.trim() === '---') {
      htmlParts.push('<hr class="my-12" />');
      i++;
      continue;
    }
    
    // Heading 2
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim();
      htmlParts.push(`<h2>${renderInline(heading)}</h2>`);
      insertImagesAfter(heading);
      i++;
      continue;
    }
    
    // Heading 3
    if (line.startsWith('### ')) {
      const heading = line.slice(4).trim();
      htmlParts.push(`<h3>${renderInline(heading)}</h3>`);
      i++;
      continue;
    }
    
    // Code block
    if (line.startsWith('```')) {
      const fenceLanguage = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      
      // If no language was provided on the fence, try to infer + strip a
      // "language line" inside the code block (common Notion export quirk).
      let language = fenceLanguage || 'text';
      let normalizedCodeLines = codeLines;
      if (!fenceLanguage) {
        // Drop leading blank lines for detection and rendering.
        let start = 0;
        while (start < normalizedCodeLines.length && normalizedCodeLines[start].trim() === '') {
          start++;
        }
        const firstNonEmpty = normalizedCodeLines[start]?.trim() ?? '';
        const maybeLang = firstNonEmpty.toLowerCase();
        if (firstNonEmpty && KNOWN_CODE_LANGS.has(maybeLang)) {
          language = firstNonEmpty;
          normalizedCodeLines = normalizedCodeLines.slice(start + 1);
          // Also drop a single blank line after the language, if present.
          if (normalizedCodeLines[0]?.trim() === '') {
            normalizedCodeLines = normalizedCodeLines.slice(1);
          }
        } else if (start > 0) {
          normalizedCodeLines = normalizedCodeLines.slice(start);
        }
      }

      const code = normalizedCodeLines.join('\n');
      const ascii = isAsciiArt(code);
      htmlParts.push(renderCodeBlock(code, language, ascii));
      continue;
    }
    
    // Tweet embed
    const tweetMatch = line.match(/<tweet>(.*?)<\/tweet>/);
    if (tweetMatch) {
      htmlParts.push(renderTweetEmbed(tweetMatch[1].trim()));
      i++;
      continue;
    }
    
    // Image (markdown format)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      htmlParts.push(renderImage(imgMatch[2], imgMatch[1]));
      i++;
      continue;
    }
    
    // Bullet list
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      htmlParts.push('<ul>');
      for (const item of items) {
        htmlParts.push(`<li>${renderInline(item)}</li>`);
      }
      htmlParts.push('</ul>');
      continue;
    }
    
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, '').trim());
        i++;
      }
      htmlParts.push('<ol>');
      for (const item of items) {
        htmlParts.push(`<li>${renderInline(item)}</li>`);
      }
      htmlParts.push('</ol>');
      continue;
    }
    
    // Paragraph
    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('- ') &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith('---') &&
      !/<tweet>/.test(lines[i]) &&
      !/^!\[/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    
    const paragraph = paragraphLines.join(' ').trim();
    if (paragraph) {
      htmlParts.push(`<p>${renderInline(paragraph)}</p>`);
    }
  }
  
  return htmlParts.join('\n\n');
}

/**
 * Calculate reading time from text
 */
export function calculateReadingTime(text: string): number {
  const plainText = text.replace(/<[^>]*>/g, '').replace(/[#*`\[\]()]/g, '');
  const wordCount = plainText.trim().split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
