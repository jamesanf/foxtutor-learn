function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function inlineHtml(value: string): string {
  let rendered = escapeHtml(value);
  rendered = rendered.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/==(.+?)==/g, '<mark class="report-highlight">$1</mark>');
  return rendered;
}

export function renderRichTextHtml(value: string): string {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType || !listItems.length) return;
    blocks.push(`<${listType}>${listItems.map((line) => `<li>${inlineHtml(line)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(bullet[1]);
      continue;
    }
    const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (numbered) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(numbered[1]);
      continue;
    }
    flushList();
    if (line.trim()) blocks.push(`<p>${inlineHtml(line)}</p>`);
  }
  flushList();
  return blocks.join("") || '<p class="muted">—</p>';
}

export function richTextToPlainText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^(\s*[-*]\s+)[-*]\s+/gm, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+[.)]\s+/gm, (prefix) => `${prefix.trim()} `)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/==(.+?)==/g, "$1");
}
