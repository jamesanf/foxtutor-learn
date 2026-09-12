import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";

(() => {
  document.documentElement.dataset.learnReady = "true";

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  let activeLink: Element | null = null;
  let activeLength = -1;
  for (const link of Array.from(document.querySelectorAll("nav a[href]"))) {
    const href = link.getAttribute("href");
    if (!href || (pathname !== href && !pathname.startsWith(`${href}/`))) continue;
    if (href.length > activeLength) {
      activeLink?.removeAttribute("aria-current");
      activeLink = link;
      activeLength = href.length;
    }
  }
  if (activeLink) activeLink.setAttribute("aria-current", "page");

  document.querySelectorAll<HTMLFormElement>("[data-confirmation]").forEach((form) => {
    const container = form.closest(".subscription-actions");
    const confirmation = container?.querySelector<HTMLElement>("[data-confirmation-panel]");
    const cancel = confirmation?.querySelector<HTMLButtonElement>("[data-confirm-cancel]");
    const accept = confirmation?.querySelector<HTMLButtonElement>("[data-confirm-submit]");
    if (!confirmation || !cancel || !accept) return;
    form.addEventListener("submit", (event) => {
      if (form.dataset.confirmed === "true") {
        delete form.dataset.confirmed;
        return;
      }
      event.preventDefault();
      confirmation.hidden = false;
      accept.focus();
    });
    cancel.addEventListener("click", () => {
      confirmation.hidden = true;
      form.querySelector<HTMLButtonElement>("button[type=submit]")?.focus();
    });
    accept.addEventListener("click", () => {
      form.dataset.confirmed = "true";
      form.requestSubmit();
    });
  });

  document.querySelectorAll(".copy-link").forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-copy-target");
      const target = targetId ? document.getElementById(targetId) : null;
      if (!(target instanceof HTMLInputElement)) return;
      const original = button.textContent;
      const showCopied = () => {
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1600);
      };
      if (!navigator.clipboard) {
        target.focus();
        target.select();
        button.textContent = "Select and copy";
        return;
      }
      navigator.clipboard.writeText(target.value).then(showCopied).catch(() => {
        target.focus();
        target.select();
        button.textContent = "Select and copy";
      });
    });
  });

  document.querySelectorAll<HTMLElement>(".calendar-host").forEach((element) => {
    const rawEvents = element.dataset.calendarEvents;
    const timezone = element.dataset.calendarTimezone;
    const initialDate = element.dataset.calendarInitialDate;
    if (!rawEvents || !timezone || !initialDate) throw new Error("Calendar configuration is incomplete.");
    const events = JSON.parse(rawEvents);
    const calendar = new Calendar(element, {
      plugins: [dayGridPlugin],
      initialView: "dayGridMonth",
      initialDate,
      timeZone: timezone,
      firstDay: 1,
      dayHeaderFormat: { weekday: "short" },
      fixedWeekCount: false,
      dayMaxEvents: 3,
      displayEventTime: false,
      eventDisplay: "block",
      eventOrder: "start,title",
      buttonText: { today: "Today", month: "Month", week: "Week" },
      eventDidMount: ({ event, el }) => {
        const accessibleLabel = `${event.title} · ${event.extendedProps.status}`;
        el.setAttribute("aria-label", accessibleLabel);
        el.setAttribute("title", accessibleLabel);
      },
      headerToolbar: {
        left: "prev,today,next",
        center: "title",
        right: "dayGridMonth,dayGridWeek"
      },
      datesSet: ({ view }) => {
        const period = view.type === "dayGridWeek" ? "week" : "month";
        element.querySelector<HTMLButtonElement>(".fc-prev-button")?.setAttribute("aria-label", `Previous ${period}`);
        element.querySelector<HTMLButtonElement>(".fc-next-button")?.setAttribute("aria-label", `Next ${period}`);
        element.querySelector<HTMLButtonElement>(".fc-today-button")?.setAttribute("aria-label", "Go to today");
        element.querySelector<HTMLButtonElement>(".fc-dayGridMonth-button")?.setAttribute("aria-label", "Show month view");
        element.querySelector<HTMLButtonElement>(".fc-dayGridWeek-button")?.setAttribute("aria-label", "Show week view");
      },
      events
    });
    calendar.render();
  });

  document.querySelectorAll<HTMLFormElement>(".lesson-create-form").forEach((form) => {
    const date = form.elements.namedItem("lessonDate");
    const time = form.elements.namedItem("startTime");
    const output = form.querySelector<HTMLOutputElement>("[data-end-preview]");
    const timezone = form.dataset.timezone;
    const durationMinutes = Number(form.dataset.durationMinutes ?? "55");
    if (!(date instanceof HTMLInputElement) || !(time instanceof HTMLSelectElement) || !output || !timezone || !Number.isInteger(durationMinutes) || durationMinutes <= 0) return;

    const updateEndPreview = () => {
      if (!date.value || !time.value) {
        output.textContent = "—";
        return;
      }
      const candidate = new Date(`${date.value}T${time.value}:00Z`);
      if (Number.isNaN(candidate.getTime())) {
        output.textContent = "—";
        return;
      }
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        calendar: "iso8601",
        numberingSystem: "latn",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).formatToParts(candidate);
      const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
      const displayedAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
      const start = new Date(candidate.getTime() - (displayedAsUtc - candidate.getTime()));
      const reconstructed = new Intl.DateTimeFormat("sv-SE", {
        timeZone: timezone,
        calendar: "iso8601",
        numberingSystem: "latn",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).format(start).replace(" ", "T");
      if (reconstructed !== `${date.value}T${time.value}`) {
        output.textContent = "Unavailable at this time";
        return;
      }
      output.textContent = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: timezone }).format(new Date(start.getTime() + durationMinutes * 60_000));
    };

    date.addEventListener("input", updateEndPreview);
    time.addEventListener("change", updateEndPreview);
    updateEndPreview();
  });
})();
