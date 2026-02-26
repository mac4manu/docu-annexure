export function preprocessLaTeX(content: string): string {
  let result = content;

  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return `\n$$\n${math.trim()}\n$$\n`;
  });

  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);

  result = ensureDisplayMathNewlines(result);

  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

function ensureDisplayMathNewlines(text: string): string {
  const parts: string[] = [];
  let i = 0;
  let inDisplayMath = false;

  while (i < text.length) {
    if (!inDisplayMath && text[i] === '$' && text[i + 1] === '$' && text[i + 2] !== '$') {
      const before = parts.length > 0 ? parts[parts.length - 1] : '';
      if (before && !before.endsWith('\n')) {
        parts.push('\n');
      }
      parts.push('$$');
      i += 2;
      const afterDollar = text[i];
      if (afterDollar && afterDollar !== '\n') {
        parts.push('\n');
      }
      inDisplayMath = true;
    } else if (inDisplayMath && text[i] === '$' && text[i + 1] === '$' && text[i + 2] !== '$') {
      const before = parts.length > 0 ? parts[parts.length - 1] : '';
      if (before && !before.endsWith('\n')) {
        parts.push('\n');
      }
      parts.push('$$');
      i += 2;
      if (i < text.length && text[i] !== '\n') {
        parts.push('\n');
      }
      inDisplayMath = false;
    } else {
      parts.push(text[i]);
      i++;
    }
  }

  return parts.join('');
}
