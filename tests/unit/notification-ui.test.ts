import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const clientSource = readFileSync("src/client/learn.ts", "utf8");
const notificationDbSource = readFileSync("src/db/notifications.ts", "utf8");

describe("notification delivery log UI contract", () => {
  it("sorts delivery-log columns server-side with a sent-time default", () => {
    expect(workerSource).toContain("function notificationSortHeader(");
    expect(workerSource).toContain('const sort = requestedSort && sortOptions.includes(requestedSort as NotificationSort) ? requestedSort as NotificationSort : "sent";');
    expect(workerSource).toContain('const direction: NotificationSortDirection = url.searchParams.get("direction") === "asc" ? "asc" : "desc";');
    expect(workerSource).toContain('<th aria-sort="${ariaSort}"><a class="notification-sort-link"');
    expect(clientSource).toContain('a.notification-page-link[href], a.notification-sort-link[href]');
    expect(notificationDbSource).toContain("sent: `CASE WHEN n.sent_at IS NULL THEN 1 ELSE 0 END ASC");
  });

  it("caps the visible log and prunes only completed history", () => {
    expect(workerSource).toContain("NOTIFICATION_HISTORY_PAGE_LIMIT");
    expect(notificationDbSource).toContain("NOTIFICATION_HISTORY_RETENTION_LIMIT = 480");
    expect(notificationDbSource).toContain("export async function pruneNotificationHistory(");
    expect(notificationDbSource).toContain("status IN ('SENT', 'FAILED', 'SUPPRESSED')");
    expect(notificationDbSource).not.toContain("status IN ('PENDING', 'SENDING', 'UNKNOWN')");
  });
});
