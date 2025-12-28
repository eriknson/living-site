#!/usr/bin/env tsx
/**
 * Validate a generated HTML build for quality issues.
 * 
 * Usage:
 *   pnpm run validate-build -- generated/gemini-3-pro.html
 *   pnpm run validate-build -- generated/composer-1.html --json
 */

import { readFileSync } from 'fs';
import * as cheerio from 'cheerio';

interface ValidationResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
  checks: Record<string, { passed: boolean; detail?: string }>;
}

function validateBuild(html: string): ValidationResult {
  const $ = cheerio.load(html);
  const styleContent = $('style').text() || '';
  const inlineStyles = $('[style]').map((_, el) => $(el).attr('style')).get().join(' ');
  const allStyles = styleContent + ' ' + inlineStyles;
  
  const issues: string[] = [];
  const warnings: string[] = [];
  const checks: Record<string, { passed: boolean; detail?: string }> = {};

  // 1. Max-width constraint (640px or ~40rem/40em)
  const hasMaxWidth = 
    allStyles.includes('max-width') && 
    (allStyles.includes('640px') || allStyles.includes('40rem') || allStyles.includes('40em') || allStyles.includes('38rem'));
  
  checks['max-width'] = { 
    passed: hasMaxWidth,
    detail: hasMaxWidth ? 'Found max-width constraint' : 'Missing max-width: 640px on main container'
  };
  if (!hasMaxWidth) {
    issues.push('Missing or incorrect max-width constraint (should be 640px/40rem)');
  }

  // 2. Dark mode support via prefers-color-scheme
  const hasDarkModeQuery = styleContent.includes('prefers-color-scheme: dark') || 
                           styleContent.includes('prefers-color-scheme:dark');
  
  checks['dark-mode-query'] = {
    passed: hasDarkModeQuery,
    detail: hasDarkModeQuery ? 'Has @media (prefers-color-scheme: dark)' : 'Missing dark mode media query'
  };
  if (!hasDarkModeQuery) {
    issues.push('Missing dark mode support (@media prefers-color-scheme: dark)');
  }

  // 3. Viewport meta tag
  const viewport = $('meta[name="viewport"]');
  const hasViewport = viewport.length > 0 && 
                      (viewport.attr('content')?.includes('width=device-width') ?? false);
  
  checks['viewport'] = {
    passed: hasViewport,
    detail: hasViewport ? 'Viewport meta tag present' : 'Missing viewport meta tag'
  };
  if (!hasViewport) {
    issues.push('Missing or incorrect viewport meta tag');
  }

  // 4. Check for inverted dark mode (light bg in dark mode = BAD)
  // Extract the dark mode block and check for light colors
  const darkModeRegex = /@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*\{([\s\S]*?)(?=\n\s*@media|\n\s*\/\*|\n\s*\}$|\n\s*$)/;
  const darkModeMatch = styleContent.match(darkModeRegex);
  
  let darkModeInverted = false;
  if (darkModeMatch) {
    const darkStyles = darkModeMatch[1];
    
    // Look for background colors in dark mode
    // Light colors that shouldn't be backgrounds in dark mode
    const lightBgPatterns = [
      /background[^:]*:\s*#f[a-f0-9]{2,5}/i,  // #fXXX colors (light)
      /background[^:]*:\s*#e[a-f0-9]{2,5}/i,  // #eXXX colors (light)
      /background[^:]*:\s*white/i,
      /background[^:]*:\s*#fff/i,
      /--bg[^:]*:\s*#f[a-f0-9]{2,5}/i,        // CSS var --bg with light color
      /--bg[^:]*:\s*#e[a-f0-9]{2,5}/i,
    ];
    
    // Dark colors that SHOULD be backgrounds in dark mode (this is correct)
    const darkBgPatterns = [
      /background[^:]*:\s*#[0-3][a-f0-9]{2,5}/i,  // #0XXX, #1XXX, #2XXX, #3XXX (dark)
      /--bg[^:]*:\s*#[0-3][a-f0-9]{2,5}/i,
    ];
    
    const hasLightBgInDark = lightBgPatterns.some(p => p.test(darkStyles));
    const hasDarkBgInDark = darkBgPatterns.some(p => p.test(darkStyles));
    
    // If we find light backgrounds and no dark backgrounds, it's likely inverted
    if (hasLightBgInDark && !hasDarkBgInDark) {
      darkModeInverted = true;
    }
  }
  
  checks['dark-mode-colors'] = {
    passed: !darkModeInverted,
    detail: darkModeInverted 
      ? 'Dark mode appears inverted (light background in dark mode)' 
      : 'Dark mode colors look correct'
  };
  if (darkModeInverted) {
    issues.push('Dark mode has light background colors (theme is inverted)');
  }

  // 5. Mobile responsiveness
  const hasResponsiveBreakpoint = 
    (styleContent.includes('@media') && 
     (styleContent.includes('max-width: 5') || 
      styleContent.includes('max-width: 6') ||
      styleContent.includes('max-width:5') ||
      styleContent.includes('max-width:6'))) ||
    styleContent.includes('min-width');
  
  checks['responsive'] = {
    passed: hasResponsiveBreakpoint,
    detail: hasResponsiveBreakpoint ? 'Has responsive breakpoints' : 'No responsive breakpoints found'
  };
  if (!hasResponsiveBreakpoint) {
    warnings.push('No responsive media query breakpoints found');
  }

  // 6. Core content present
  const allLinks = $('a').map((_, el) => ({
    href: $(el).attr('href') || '',
    text: $(el).text().toLowerCase()
  })).get();
  
  const hasCursorLink = allLinks.some(l => 
    l.href.includes('cursor.com') || l.text.includes('cursor')
  );
  const hasXLink = allLinks.some(l => 
    l.href.includes('x.com') || l.href.includes('twitter.com') || 
    l.text.includes('twitter') || (l.text === 'x' && l.href.includes('x.com'))
  );
  const hasGitHubLink = allLinks.some(l => 
    l.href.includes('github') || l.text.includes('github')
  );
  
  const hasKeyLinks = hasCursorLink && hasXLink && hasGitHubLink;
  const missingLinks = [
    !hasCursorLink && 'Cursor',
    !hasXLink && 'X/Twitter',
    !hasGitHubLink && 'GitHub'
  ].filter(Boolean);
  
  checks['core-links'] = {
    passed: hasKeyLinks,
    detail: hasKeyLinks 
      ? 'Core links present (Cursor, X, GitHub)' 
      : `Missing: ${missingLinks.join(', ')}`
  };
  if (!hasKeyLinks) {
    warnings.push(`Missing some expected links: ${missingLinks.join(', ')}`);
  }

  // 7. Has title
  const title = $('title').text();
  const hasTitle = title.length > 0 && title.toLowerCase().includes('erik');
  
  checks['title'] = {
    passed: hasTitle,
    detail: hasTitle ? `Title: "${title}"` : 'Missing or incorrect title'
  };
  if (!hasTitle) {
    warnings.push('Page title may be missing or incorrect');
  }

  // 8. CSS variables for theming (best practice)
  const usesCssVars = styleContent.includes('var(--');
  checks['css-variables'] = {
    passed: usesCssVars,
    detail: usesCssVars ? 'Uses CSS custom properties' : 'Not using CSS variables (not required, but recommended)'
  };

  // 9. Centered container
  const hasCentering = allStyles.includes('margin: 0 auto') || 
                       allStyles.includes('margin:0 auto') ||
                       allStyles.includes('margin-inline: auto') ||
                       (allStyles.includes('margin-left: auto') && allStyles.includes('margin-right: auto'));
  
  checks['centered'] = {
    passed: hasCentering,
    detail: hasCentering ? 'Container is centered' : 'Container may not be centered'
  };
  if (!hasCentering) {
    warnings.push('Container may not be horizontally centered');
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    checks
  };
}

// CLI
const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');

if (!filePath) {
  console.error('Usage: validate-build <file.html> [--json]');
  process.exit(1);
}

try {
  const html = readFileSync(filePath, 'utf-8');
  const result = validateBuild(html);
  
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('');
    console.log(`=== Build Validation: ${filePath} ===`);
    console.log('');
    
    // Show checks
    for (const [name, check] of Object.entries(result.checks)) {
      const icon = check.passed ? '✓' : '✗';
      const color = check.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${icon}\x1b[0m ${name}: ${check.detail || ''}`);
    }
    
    console.log('');
    
    if (result.issues.length > 0) {
      console.log('\x1b[31m⚠ ISSUES (must fix):\x1b[0m');
      result.issues.forEach(i => console.log(`  • ${i}`));
      console.log('');
    }
    
    if (result.warnings.length > 0) {
      console.log('\x1b[33m⚡ WARNINGS:\x1b[0m');
      result.warnings.forEach(w => console.log(`  • ${w}`));
      console.log('');
    }
    
    if (result.passed) {
      console.log('\x1b[32m✓ PASSED - Build meets quality requirements\x1b[0m');
    } else {
      console.log('\x1b[31m✗ FAILED - Build has issues that need fixing\x1b[0m');
    }
    console.log('');
  }
  
  process.exit(result.passed ? 0 : 1);
} catch (error) {
  console.error(`Error reading file: ${error}`);
  process.exit(1);
}
