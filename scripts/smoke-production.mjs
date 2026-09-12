const origin = process.env.LEARN_ORIGIN ?? "https://foxtutor.org";
const urls = ["/", "/robots.txt", "/sitemap.xml", "/learn"];
const results = [];
for (const path of urls) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", headers: { "User-Agent": path === "/learn" ? "Googlebot/2.1 (+http://www.google.com/bot.html)" : "Foxtutor-Learn-Smoke/1.0" } });
  const body = path === "/sitemap.xml" || path === "/learn" ? await response.text() : "";
  results.push({
    path,
    status: response.status,
    contentType: response.headers.get("content-type"),
    robots: response.headers.get("x-robots-tag"),
    hasNoindexMeta: /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(body),
    sitemapIncludesLearn: path === "/sitemap.xml" && /\/learn(?:[/<]|$)/i.test(body)
  });
}
console.log(JSON.stringify({ origin, results }, null, 2));
if (results.find((result) => result.path === "/" && result.status !== 200)) process.exitCode = 1;
const learn = results.find((result) => result.path === "/learn");
if (learn && learn.status === 200 && !learn.robots?.includes("noindex") && !learn.hasNoindexMeta) process.exitCode = 1;
if (results.find((result) => result.sitemapIncludesLearn)) process.exitCode = 1;
