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
    const dropzone = form.querySelector<HTMLElement>("[data-file-dropzone]");
    const status = form.querySelector<HTMLElement>("[data-upload-status]");
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const lesson = lessonElement instanceof HTMLSelectElement ? lessonElement : null;

    if (student instanceof HTMLSelectElement && lesson) {
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
    }

    if (!(file instanceof HTMLInputElement) || !(preview instanceof HTMLOutputElement) || !dropzone) return;

    const formatFileType = (selected: File): string => {
      const extension = selected.name.split(".").pop()?.toLowerCase();
      if (extension === "pdf") return "PDF";
      if (extension === "docx") return "Word document";
      if (extension === "txt") return "Text file";
      if (extension === "png" || extension === "jpg" || extension === "jpeg" || extension === "webp") return "Image";
      return selected.type || "Document";
    };
    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const renderSelectedFile = () => {
      const selected = file.files?.[0];
      dropzone.classList.toggle("has-file", Boolean(selected));
      if (!selected) {
        preview.replaceChildren();
        return;
      }
      const name = document.createElement("strong");
      name.textContent = selected.name;
      const details = document.createElement("span");
      details.textContent = `${formatFileType(selected)} · ${formatFileSize(selected.size)}`;
      const change = document.createElement("button");
      change.type = "button";
      change.className = "file-change";
      change.textContent = "Change file";
      change.addEventListener("click", (event) => {
        event.stopPropagation();
        file.click();
      });
      preview.replaceChildren(name, details, change);
    };
    const openPicker = () => file.click();

    dropzone.addEventListener("click", (event) => {
      if (event.target instanceof HTMLButtonElement) return;
      openPicker();
    });
    dropzone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPicker();
    });
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      const dropped = event.dataTransfer?.files?.[0];
      if (!dropped || typeof DataTransfer === "undefined") return;
      const transfer = new DataTransfer();
      transfer.items.add(dropped);
      file.files = transfer.files;
      file.dispatchEvent(new Event("change", { bubbles: true }));
    });
    file.addEventListener("change", renderSelectedFile);
    form.addEventListener("submit", () => {
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Uploading…";
      }
      form.setAttribute("aria-busy", "true");
      if (status) status.textContent = "Uploading…";
    });
    renderSelectedFile();
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
