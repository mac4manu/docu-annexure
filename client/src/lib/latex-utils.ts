export function preprocessLaTeX(content: string): string {
  let result = content;

  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`);

  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);

  result = result.replace(/(?<!\$)\$\$(?!\$)([\s\S]*?)(?<!\$)\$\$(?!\$)/g, (match, inner) => {
    const cleaned = inner.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    return `$$${cleaned}$$`;
  });

  return result;
}
