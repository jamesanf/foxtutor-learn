const browserDebugUrl = process.env.CHROME_DEBUG_URL ?? "http://127.0.0.1:9222";
const pageUrl = process.env.CALENDAR_BROWSER_URL ?? "http://127.0.0.1:8787/learn/admin/calendar";
const identity = process.env.LEARN_TEST_IDENTITY ?? "foxlearningltd@gmail.com";
const zoom = Number(process.env.CALENDAR_ZOOM ?? "1");
if (!Number.isFinite(zoom) || zoom <= 0 || zoom > 1) throw new Error("CALENDAR_ZOOM must be greater than 0 and no greater than 1.");

const target = await (await fetch(`${browserDebugUrl}/json/new?${encodeURIComponent(pageUrl)}`, { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
let commandId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const resolve = pending.get(message.id);
  if (!resolve) return;
  pending.delete(message.id);
  resolve(message);
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, (message) => message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result));
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
await command("Network.enable");
await command("Network.setExtraHTTPHeaders", { headers: { "X-Learn-Test-Identity": identity } });
await command("Page.enable");
await command("Emulation.setDeviceMetricsOverride", { width: Math.round(1440 / zoom), height: Math.round(900 / zoom), deviceScaleFactor: 1, mobile: false });
await command("Emulation.setPageScaleFactor", { pageScaleFactor: zoom });
await command("Page.navigate", { url: pageUrl });
await new Promise((resolve) => setTimeout(resolve, 900));

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true });
  return result.result.value;
}

const report = await evaluate(`(() => {
  const rgb = value => {
    const match = value.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
  };
  const luminance = value => {
    const channels = value.map(channel => channel / 255).map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const contrast = (foreground, background) => {
    const foregroundRgb = rgb(foreground);
    const backgroundRgb = rgb(background);
    if (!foregroundRgb || !backgroundRgb) return 0;
    const foregroundLuminance = luminance(foregroundRgb);
    const backgroundLuminance = luminance(backgroundRgb);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  };
  const box = element => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  };
  return { viewport: { width: innerWidth, height: innerHeight }, detailsOpen: document.querySelector(".subscription-card")?.open ?? false, subscription: box(document.querySelector(".subscription-card")), horizontalOverflow: document.documentElement.scrollWidth - innerWidth };
})()`);

if (report.detailsOpen) throw new Error("Subscription must be collapsed by default.");
if (!report.subscription || report.subscription.height > 100) throw new Error(`Collapsed subscription is too tall: ${report.subscription?.height}`);
if (report.horizontalOverflow > 1) throw new Error(`Document has horizontal overflow: ${report.horizontalOverflow}px`);

const week = await evaluate(`(() => { document.querySelector(".fc-next-button")?.click(); return true; })()`);
if (!week) throw new Error("Week navigation is unavailable.");
await new Promise((resolve) => setTimeout(resolve, 300));
const weekReport = await evaluate(`(() => {
  const box = element => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
  const rgb = value => { const match = value.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null; };
  const luminance = value => { const channels = value.map(channel => channel / 255).map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4); return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]; };
  const contrast = (foreground, background) => { const foregroundRgb = rgb(foreground); const backgroundRgb = rgb(background); if (!foregroundRgb || !backgroundRgb) return 0; const a = luminance(foregroundRgb); const b = luminance(backgroundRgb); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  return [...document.querySelectorAll(".fc-timeGridWeek-view .fc-event")].map(event => {
    const eventBox = box(event);
    const style = getComputedStyle(event);
    const textBoxes = [...event.querySelectorAll("span")].map(box);
    return { eventBox, contrast: contrast(getComputedStyle(event.querySelector(".fc-event-main") ?? event).color, style.backgroundColor), textBoxes };
  });
})()`);
if (!weekReport.length) throw new Error("Week visual contract has no rendered fixture events.");
for (const event of weekReport) {
  if (event.eventBox.width <= 0 || event.eventBox.height <= 0) throw new Error("A Week event has zero rendered dimensions.");
  if (event.contrast < 4.5) throw new Error(`Week event contrast is below 4.5:1 (${event.contrast.toFixed(2)}).`);
  if (event.textBoxes.some(text => text.left < event.eventBox.left || text.right > event.eventBox.right || text.top < event.eventBox.top || text.bottom > event.eventBox.bottom)) {
    throw new Error("Week event text is outside its event bounds.");
  }
}

await evaluate(`document.querySelector(".fc-dayGridMonth-button")?.click()`);
await new Promise((resolve) => setTimeout(resolve, 300));
const monthReport = await evaluate(`(() => {
  const body = document.querySelector(".fc-daygrid-body");
  const rows = [...document.querySelectorAll(".fc-daygrid-body tr")];
  const bodyRect = body.getBoundingClientRect();
  const lastRowRect = rows.at(-1).getBoundingClientRect();
  const calendar = document.querySelector(".calendar-host").getBoundingClientRect();
  return { rowCount: rows.length, calendarHeight: calendar.height, bodyOverflowY: getComputedStyle(body).overflowY, bodyScrollDelta: body.scrollHeight - body.clientHeight, lastRowBottom: lastRowRect.bottom, bodyBottom: bodyRect.bottom };
})()`);
if (monthReport.rowCount < 4 || monthReport.rowCount > 6) throw new Error(`Unexpected Month row count: ${monthReport.rowCount}`);
if (monthReport.calendarHeight > 680) throw new Error(`Month calendar is too tall: ${monthReport.calendarHeight}px`);
if (monthReport.bodyOverflowY === "auto" || monthReport.bodyOverflowY === "scroll" || monthReport.bodyScrollDelta > 1) throw new Error("Month view has an internal vertical scrollbar.");
if (monthReport.lastRowBottom > monthReport.bodyBottom + 1) throw new Error("The final Month row is outside the visible Month body.");

console.log(JSON.stringify({ status: "pass", viewport: report.viewport, zoom, weekEvents: weekReport.length, weekContrast: weekReport.map(event => Number(event.contrast.toFixed(2))), month: monthReport, subscriptionCollapsedHeight: report.subscription.height }));
await command("Browser.close");
socket.close();
