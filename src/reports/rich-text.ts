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
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(`<ul>${bullets.map((line) => `<li>${inlineHtml(line)}</li>`).join("")}</ul>`);
    bullets = [];
  };

  for (const line of lines) {
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    if (line.trim()) blocks.push(`<p>${inlineHtml(line)}</p>`);
  }
  flushBullets();
  return blocks.join("") || '<p class="muted">—</p>';
}

export function richTextToPlainText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/==(.+?)==/g, "$1");
}
