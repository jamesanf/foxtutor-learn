import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

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
      plugins: [dayGridPlugin, timeGridPlugin],
      initialView: "timeGridWeek",
      initialDate,
      timeZone: timezone,
      firstDay: 1,
      dayHeaderContent: ({ date, view }) => {
        const format = view.type === "dayGridMonth"
          ? { weekday: "short" as const }
          : { weekday: "short" as const, day: "numeric" as const, month: "short" as const };
        return new Intl.DateTimeFormat("en-GB", { ...format, timeZone: timezone }).format(date);
      },
      fixedWeekCount: false,
      expandRows: false,
      dayMaxEvents: 3,
      displayEventTime: false,
      eventDisplay: "block",
      eventOrder: "start,title",
      slotMinTime: "09:00:00",
      slotMaxTime: "21:00:00",
      scrollTime: "09:00:00",
      slotDuration: "00:30:00",
      slotLabelInterval: "01:00",
      height: "auto",
      titleFormat: { day: "numeric", month: "long", year: "numeric" },
      // FullCalendar TimeGrid supports this option; 6.1.21 omits its ambient type from the package entrypoint.
      // @ts-expect-error
      allDaySlot: false,
      buttonText: { today: "Today", month: "Month", week: "Week" },
      eventContent: ({ event, view }) => {
        if (view.type === "dayGridMonth") {
          const monthEvent = document.createElement("span");
          monthEvent.className = "lesson-event-month";
          monthEvent.textContent = `${String(event.extendedProps.displayTime ?? "").split("–")[0]} ${event.title}`;
          return { domNodes: [monthEvent] };
        }
        const title = document.createElement("span");
        title.className = "lesson-event-title";
        title.textContent = event.title;
        const time = document.createElement("span");
        time.className = "lesson-event-time";
        time.textContent = String(event.extendedProps.displayTime ?? "");
        return { domNodes: [title, time] };
      },
      eventDidMount: ({ event, el }) => {
        const accessibleLabel = `${event.title} · ${event.extendedProps.displayTime} · ${event.extendedProps.status}`;
        el.setAttribute("aria-label", accessibleLabel);
        el.setAttribute("title", accessibleLabel);
      },
      headerToolbar: {
        left: "prev,today,next",
        center: "title",
        right: "timeGridWeek,dayGridMonth"
      },
      datesSet: ({ view }) => {
        const period = view.type === "timeGridWeek" ? "week" : "month";
        const previous = element.querySelector<HTMLButtonElement>(".fc-prev-button");
        const next = element.querySelector<HTMLButtonElement>(".fc-next-button");
        if (previous) {
          previous.setAttribute("aria-label", `Previous ${period}`);
          setCalendarNavigationIcon(previous, "previous");
        }
        if (next) {
          next.setAttribute("aria-label", `Next ${period}`);
          setCalendarNavigationIcon(next, "next");
        }
        element.querySelector<HTMLButtonElement>(".fc-today-button")?.setAttribute("aria-label", "Go to today");
        element.querySelector<HTMLButtonElement>(".fc-dayGridMonth-button")?.setAttribute("aria-label", "Show month view");
        element.querySelector<HTMLButtonElement>(".fc-timeGridWeek-button")?.setAttribute("aria-label", "Show week view");
      },
      events
    });
    calendar.render();
  });

  document.querySelectorAll<HTMLFormElement>(".lesson-create-form").forEach((form) => {
    const time = form.elements.namedItem("startTime");
    const output = form.querySelector<HTMLOutputElement>("[data-end-preview]");
    const durationMinutes = Number(form.dataset.durationMinutes ?? "55");
    if (!(time instanceof HTMLInputElement) || time.type !== "time" || !output || !Number.isInteger(durationMinutes) || durationMinutes <= 0) return;

    const updateEndPreview = () => {
      if (!time.value) {
        output.textContent = "—";
        return;
      }
      const match = /^(\d{2}):(\d{2})$/.exec(time.value);
      if (!match) {
        output.textContent = "—";
        return;
      }
      const totalMinutes = Number(match[1]) * 60 + Number(match[2]) + durationMinutes;
      const hour = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minute = totalMinutes % 60;
      output.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    };

    time.addEventListener("input", updateEndPreview);
    updateEndPreview();
  });

  document.querySelectorAll<HTMLFormElement>(".resource-upload-form").forEach((form) => {
    const student = form.elements.namedItem("studentId");
    const lessonElement = form.querySelector("[data-resource-lesson-select]");
    const file = form.elements.namedItem("file");
    const preview = form.querySelector("[data-file-preview]");
    if (!(student instanceof HTMLSelectElement) || !(lessonElement instanceof HTMLSelectElement)) return;
    const lesson = lessonElement;
    const syncLessons = () => {
      const selectedStudent = student.value;
      for (const option of Array.from(lesson.options) as HTMLOptionElement[]) {
        if (!option.dataset.studentId) continue;
        const allowed = option.dataset.studentId === selectedStudent;
        option.hidden = !allowed;
        option.disabled = !allowed;
        if (!allowed && option.selected) lesson.value = "";
      }
    };
    student.addEventListener("change", syncLessons);
    syncLessons();
    if (file instanceof HTMLInputElement && preview instanceof HTMLOutputElement) {
      file.addEventListener("change", () => {
        const selected = file.files?.[0];
        preview.textContent = selected ? `${selected.name} · ${(selected.size / (1024 * 1024)).toFixed(1)} MB` : "";
      });
    }
  });
})();

function setCalendarNavigationIcon(button: HTMLButtonElement, direction: "previous" | "next"): void {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("class", "calendar-nav-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute("d", direction === "previous" ? "M15.5 5 8.5 12l7 7" : "m8.5 5 7 7-7 7");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "2.4");
  svg.appendChild(path);
  button.replaceChildren(svg);
}
