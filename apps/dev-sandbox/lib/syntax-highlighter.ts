/**
 * Syntax Highlighting Utilities
 * Provides code highlighting and formatting capabilities
 */

import { codeToHtml, bundledLanguages } from 'shiki';

export type Language = keyof typeof bundledLanguages;

export interface HighlightOptions {
  language: Language;
  theme?: 'github-light' | 'github-dark' | 'nord' | 'dracula';
  lineNumbers?: boolean;
  highlightLines?: number[];
  wrapLines?: boolean;
}

/**
 * Highlight code with syntax highlighting
 */
export async function highlightCode(
  code: string,
  options: HighlightOptions
): Promise<string> {
  const {
    language,
    theme = 'github-dark',
    lineNumbers = false,
    highlightLines = [],
    wrapLines = true,
  } = options;

  try {
    const html = await codeToHtml(code, {
      lang: language,
      theme,
      transformers: [
        {
          line(node, line) {
            if (highlightLines.includes(line)) {
              node.properties['data-highlighted'] = 'true';
            }
            if (lineNumbers) {
              node.properties['data-line'] = line;
            }
          },
        },
      ],
    });

    if (wrapLines) {
      return wrapWithContainer(html, { language, lineNumbers });
    }

    return html;
  } catch (error) {
    console.error('Syntax highlighting error:', error);
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * Format code with proper indentation
 */
export function formatCode(code: string, language: Language): string {
  // Basic formatting based on language
  switch (language) {
    case 'javascript':
    case 'typescript':
    case 'jsx':
    case 'tsx':
      return formatJavaScript(code);
    case 'css':
    case 'scss':
    case 'less':
      return formatCSS(code);
    case 'html':
    case 'xml':
      return formatHTML(code);
    case 'json':
      return formatJSON(code);
    default:
      return code;
  }
}

/**
 * Extract code snippets from markdown
 */
export function extractCodeBlocks(markdown: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }
  
  return blocks;
}

/**
 * Add line numbers to code
 */
export function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  const lineNumberWidth = String(lines.length).length;
  
  return lines
    .map((line, index) => {
      const lineNumber = String(index + 1).padStart(lineNumberWidth, ' ');
      return `${lineNumber} | ${line}`;
    })
    .join('\n');
}

/**
 * Tokenize code for analysis
 */
export function tokenizeCode(code: string, language: Language): Token[] {
  const tokens: Token[] = [];
  
  // Simple tokenizer for demonstration
  const patterns: Record<string, RegExp> = {
    keyword: /\b(const|let|var|function|class|if|else|for|while|return|import|export|from)\b/g,
    string: /(["'])(?:(?=(\\?))\2.)*?\1/g,
    number: /\b\d+(\.\d+)?\b/g,
    comment: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    operator: /[+\-*/%=<>!&|?:]/g,
    punctuation: /[{}[\]();,.]/g,
  };
  
  Object.entries(patterns).forEach(([type, pattern]) => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      tokens.push({
        type: type as TokenType,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  });
  
  return tokens.sort((a, b) => a.start - b.start);
}

/**
 * Generate code statistics
 */
export function getCodeStats(code: string): CodeStats {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  const commentLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
  });
  
  return {
    totalLines: lines.length,
    codeLines: nonEmptyLines.length - commentLines.length,
    commentLines: commentLines.length,
    emptyLines: lines.length - nonEmptyLines.length,
    characters: code.length,
    tokens: tokenizeCode(code, 'javascript').length,
  };
}

/**
 * Diff two code snippets
 */
export function diffCode(oldCode: string, newCode: string): DiffResult[] {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const result: DiffResult[] = [];
  
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      result.push({ type: 'add', line: newLines[j], lineNumber: j + 1 });
      j++;
    } else if (j >= newLines.length) {
      result.push({ type: 'remove', line: oldLines[i], lineNumber: i + 1 });
      i++;
    } else if (oldLines[i] === newLines[j]) {
      result.push({ type: 'unchanged', line: oldLines[i], lineNumber: i + 1 });
      i++;
      j++;
    } else {
      result.push({ type: 'remove', line: oldLines[i], lineNumber: i + 1 });
      result.push({ type: 'add', line: newLines[j], lineNumber: j + 1 });
      i++;
      j++;
    }
  }
  
  return result;
}

// Helper functions
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapWithContainer(
  html: string,
  options: { language: string; lineNumbers?: boolean }
): string {
  const classes = ['code-container'];
  if (options.lineNumbers) classes.push('with-line-numbers');
  
  return `
    <div class="${classes.join(' ')}" data-language="${options.language}">
      <div class="code-header">
        <span class="language-label">${options.language}</span>
      </div>
      <div class="code-content">
        ${html}
      </div>
    </div>
  `;
}

function formatJavaScript(code: string): string {
  // Basic JavaScript formatting
  return code
    .replace(/\s*{\s*/g, ' {\n  ')
    .replace(/\s*}\s*/g, '\n}')
    .replace(/;\s*/g, ';\n')
    .replace(/,\s*/g, ',\n  ')
    .trim();
}

function formatCSS(code: string): string {
  // Basic CSS formatting
  return code
    .replace(/\s*{\s*/g, ' {\n  ')
    .replace(/\s*}\s*/g, '\n}')
    .replace(/;\s*/g, ';\n  ')
    .replace(/,\s*/g, ',\n')
    .trim();
}

function formatHTML(code: string): string {
  // Basic HTML formatting
  let formatted = '';
  let indent = 0;
  const lines = code.split(/>\s*</);
  
  lines.forEach((line, index) => {
    if (index !== 0) line = '<' + line;
    if (index !== lines.length - 1) line = line + '>';
    
    if (line.match(/^<\/\w/)) indent--;
    formatted += '  '.repeat(Math.max(0, indent)) + line.trim() + '\n';
    if (line.match(/^<\w[^>]*[^\/]>.*$/)) indent++;
  });
  
  return formatted.trim();
}

function formatJSON(code: string): string {
  try {
    return JSON.stringify(JSON.parse(code), null, 2);
  } catch {
    return code;
  }
}

// Type definitions
export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export type TokenType = 
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'operator'
  | 'punctuation'
  | 'identifier';

export interface CodeStats {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  emptyLines: number;
  characters: number;
  tokens: number;
}

export interface DiffResult {
  type: 'add' | 'remove' | 'unchanged';
  line: string;
  lineNumber: number;
}