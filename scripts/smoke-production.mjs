const origin = process.env.LEARN_ORIGIN ?? "https://foxtutor.org";
const urls = ["/", "/robots.txt", "/sitemap.xml", "/learn"];
const results = [];
for (const path of urls) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", headers: { "User-Agent": path === "/learn" ? "Googlebot/2.1 (+http://www.google.com/bot.html)" : "Foxtutor-Learn-Smoke/1.0" } });
  results.push({ path, status: response.status, contentType: response.headers.get("content-type"), robots: response.headers.get("x-robots-tag") });
}
console.log(JSON.stringify({ origin, results }, null, 2));
if (results.find((result) => result.path === "/" && result.status !== 200)) process.exitCode = 1;
