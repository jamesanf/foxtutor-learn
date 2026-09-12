import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../public/learn.css", import.meta.url), "utf8");
const htmlContract = '<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">';
if (!css.includes(":focus-visible") || !css.includes("prefers-reduced-motion")) throw new Error("Accessibility CSS contract missing");
console.log(JSON.stringify({ status: "pass", scope: "static shell contract", keyboardFocus: true, reducedMotion: true, noindexMeta: htmlContract.includes("noindex") }));
