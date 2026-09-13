import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const learnRoot = path.resolve(scriptDirectory, "..");
const publicLegalPath = process.env.PUBLIC_LEGAL_PATH
  ? path.resolve(process.env.PUBLIC_LEGAL_PATH)
  : path.resolve(learnRoot, "../foxtutor/src/config/legal.tsx");
const learnLegalPath = path.join(learnRoot, "src/legal.ts");

function extract(source, label, endLabel) {
  const start = source.indexOf(`${label}: (`);
  const end = source.indexOf(endLabel, start);
  if (start < 0 || end < 0) throw new Error(`Could not find ${label} in ${publicLegalPath}`);
  return source.slice(start + `${label}: (`.length, end).trim();
}

function publicJsxToHtml(source) {
  return source
    .replace(/<Separator\s*\/>/g, "")
    .replace(/<h4\b([^>]*)>/g, "<h2>")
    .replace(/<\/h4>/g, "</h2>")
    .replace(/\s+className="[^"]*"/g, "")
    .replace(/^\s*<div>\s*/g, "")
    .replace(/\s*<\/div>\s*$/g, "")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function templateContent(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = \`([\\s\\S]*?)\`;`));
  if (!match) throw new Error(`Could not find ${exportName} in ${learnLegalPath}`);
  return match[1].trim();
}

function normalize(source) {
  return source
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const publicSource = await readFile(publicLegalPath, "utf8");
const learnSource = await readFile(learnLegalPath, "utf8");
const publicTerms = publicJsxToHtml(extract(publicSource, "terms", "),\n  privacy"));
const publicPrivacy = publicJsxToHtml(extract(publicSource, "privacy", ")\n};"));
const learnTerms = templateContent(learnSource, "learnTermsContent");
const learnPrivacy = templateContent(learnSource, "learnPrivacyContent");

if (process.argv.includes("--write")) {
  const generated = `// Generated mirror of foxtutor/src/config/legal.tsx. Keep the public-site
// document as the canonical source and run \`npm run check:legal\` when it changes.
export const learnTermsContent = \`
${publicTerms}
\`;

export const learnPrivacyContent = \`
${publicPrivacy}
\`;
`;
  await writeFile(learnLegalPath, generated);
  console.log(`Updated ${path.relative(learnRoot, learnLegalPath)} from ${publicLegalPath}`);
} else {
  if (normalize(publicTerms) !== normalize(learnTerms)) throw new Error("Learn Terms & Conditions are out of sync with the public site.");
  if (normalize(publicPrivacy) !== normalize(learnPrivacy)) throw new Error("Learn Privacy Policy is out of sync with the public site.");
  console.log("Learn legal content matches the public site's canonical legal source.");
}
