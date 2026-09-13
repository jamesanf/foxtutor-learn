import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

(() => {
  document.documentElement.dataset.learnReady = "true";

  type NotificationType = "success" | "error";
  const showNotification = (message: string, type: NotificationType = "success") => {
    const container = document.getElementById("site-notifications");
    if (!container || !message.trim()) return;
    container.replaceChildren();
    const notification = document.createElement("div");
    notification.className = "site-notification";
    notification.setAttribute("role", type === "error" ? "alert" : "status");
    notification.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    const text = document.createElement("span");
    text.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "site-notification-close";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";
    const dismiss = () => {
      window.clearTimeout(timeout);
      notification.remove();
    };
    close.addEventListener("click", dismiss);
    notification.appendChild(text);
    notification.appendChild(close);
    container.appendChild(notification);
    const timeout = window.setTimeout(dismiss, 3600);
  };

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

  const showPageNotification = () => {
    document.querySelectorAll<HTMLElement>("[data-notification-message]").forEach((element) => {
      showNotification(element.dataset.notificationMessage ?? "", element.dataset.notificationType === "error" ? "error" : "success");
    });
    const url = new URL(window.location.href);
    const deleted = Number(url.searchParams.get("deleted") ?? 0);
    const failed = Number(url.searchParams.get("failed") ?? 0);
    if (deleted || failed) {
      const message = deleted && failed
        ? `${deleted} resource${deleted === 1 ? "" : "s"} deleted; ${failed} could not be deleted`
        : deleted
          ? `${deleted} resource${deleted === 1 ? "" : "s"} deleted`
          : `${failed} resource${failed === 1 ? "" : "s"} could not be deleted`;
      showNotification(message, failed ? "error" : "success");
      url.searchParams.delete("deleted");
      url.searchParams.delete("failed");
      window.history.replaceState({}, "", url);
    }
  };
  showPageNotification();

  const reportEditors = document.querySelectorAll<HTMLElement>("[data-report-format]");
  reportEditors.forEach((button) => {
    button.addEventListener("click", () => {
      const editor = button.closest<HTMLElement>(".report-editor");
      const textarea = editor?.querySelector<HTMLTextAreaElement>("textarea");
      if (!textarea) return;
      const format = button.dataset.reportFormat;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.slice(start, end);
      if (format === "bullet") {
        const source = selected || "List item";
        const replacement = source.split("\n").map((line) => line.startsWith("- ") ? line : `- ${line}`).join("\n");
        textarea.setRangeText(replacement, start, end, "select");
      } else if (format === "bold" || format === "highlight") {
        const marker = format === "bold" ? "**" : "==";
        const replacement = `${marker}${selected || "text"}${marker}`;
        textarea.setRangeText(replacement, start, end, selected ? "select" : "end");
      }
      textarea.focus();
    });
  });

  document.querySelectorAll<HTMLElement>("[data-level-combobox]").forEach((combobox) => {
    const input = combobox.querySelector<HTMLInputElement>("input[name='level']");
    const options = Array.from(combobox.querySelectorAll<HTMLButtonElement>("[data-level-option]"));
    if (!input || !options.length) return;
    const menu = combobox.querySelector<HTMLElement>(".report-level-options");
    const render = () => {
      const query = input.value.trim().toLowerCase();
      let visible = 0;
      options.forEach((option) => {
        const matches = !query || option.textContent?.toLowerCase().includes(query);
        option.hidden = !matches;
        if (matches) visible += 1;
      });
      if (menu) menu.hidden = visible === 0;
    };
    input.addEventListener("focus", render);
    input.addEventListener("input", render);
    options.forEach((option) => option.addEventListener("click", () => {
      input.value = option.dataset.levelOption ?? option.textContent ?? "";
      if (menu) menu.hidden = true;
      input.focus();
    }));
    document.addEventListener("click", (event) => {
      if (!combobox.contains(event.target as Node) && menu) menu.hidden = true;
    });
  });

  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".copy-link");
    if (!button) return;
    const targetId = button.getAttribute("data-copy-target");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!(target instanceof HTMLInputElement)) return;
    const original = button.textContent;
    const showCopied = () => {
      button.textContent = "Copied";
      showNotification("Calendar link copied");
      window.setTimeout(() => {
        button.textContent = original;
      }, 1600);
    };
    if (!navigator.clipboard) {
      target.focus();
      target.select();
      showNotification("Select and copy the calendar link", "error");
      return;
    }
    navigator.clipboard.writeText(target.value).then(showCopied).catch(() => {
        target.focus();
        target.select();
        showNotification("Select and copy the calendar link", "error");
      });
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches("[data-calendar-regenerate]")) return;
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>("button[type='submit']");
    if (!button) return;
    button.disabled = true;
    void (async () => {
      const body = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        if (typeof value === "string") body.append(key, value);
      });
      try {
        const response = await fetch(form.action, {
          method: "POST",
          body,
          headers: { Accept: "application/json", "X-Calendar-Fragment": "1" }
        });
        if (!response.ok) throw new Error("Calendar subscription update failed.");
        const data = await response.json() as { subscriptionHtml?: string; message?: string };
        if (!data.subscriptionHtml) throw new Error("Calendar subscription update failed.");
        form.closest<HTMLElement>("[data-calendar-subscription]")?.replaceWith(document.createRange().createContextualFragment(data.subscriptionHtml));
        showNotification(data.message ?? "Calendar link regenerated");
      } catch (error) {
        showNotification("Calendar link could not be regenerated", "error");
      } finally {
        button.disabled = false;
      }
    })();
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

  type ResourceFilterOption = { id: string; value?: string; label: string; detail?: string };
  type ResourceFragmentPayload = { finderHtml: string; resultsHtml: string; url: string; total: number };
  let loadAdminResourceUrl: ((url: URL, updateHistory: boolean) => void) | null = null;
  let loadStudentResourceUrl: ((url: URL, updateHistory: boolean) => void) | null = null;

  const setupResourceSelection = () => {
    const toolbar = document.querySelector<HTMLElement>("[data-resource-selection-toolbar]");
    const selection = Array.from(document.querySelectorAll<HTMLInputElement>("[data-resource-select]"));
    const selectAll = document.querySelector<HTMLInputElement>("[data-resource-select-all]");
    const bulkDeleteForm = document.querySelector<HTMLFormElement>("#resource-bulk-delete-form");
    const update = () => {
      const selected = selection.filter((checkbox) => checkbox.checked);
      if (toolbar) {
        toolbar.hidden = selected.length === 0;
        const count = toolbar.querySelector("[data-resource-selection-count]");
        if (count) count.textContent = `${selected.length} resource${selected.length === 1 ? "" : "s"} selected`;
      }
      if (selectAll) {
        selectAll.checked = selected.length > 0 && selected.length === selection.length;
        selectAll.indeterminate = selected.length > 0 && selected.length < selection.length;
      }
      for (const checkbox of selection) checkbox.closest("tr")?.classList.toggle("is-selected", checkbox.checked);
    };
    selectAll?.addEventListener("change", () => {
      for (const checkbox of selection) checkbox.checked = selectAll.checked;
      update();
    });
    selection.forEach((checkbox) => checkbox.addEventListener("change", update));
    bulkDeleteForm?.addEventListener("submit", (event) => {
      const selected = selection.filter((checkbox) => checkbox.checked);
      if (!selected.length) {
        event.preventDefault();
        return;
      }
      if (!confirm(`Delete ${selected.length} resource${selected.length === 1 ? "" : "s"}? These files will be removed from the resource library.`)) event.preventDefault();
    });
    document.querySelectorAll<HTMLButtonElement>("[data-resource-delete-trigger]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!confirm(button.dataset.resourceDeleteConfirm ?? "Delete this resource?")) return;
        const formId = button.dataset.resourceDeleteTrigger;
        const form = formId ? document.getElementById(formId) : null;
        if (form instanceof HTMLFormElement) form.requestSubmit();
      });
    });
    update();
  };

  const setupAdminResourceResults = () => {
    const results = document.querySelector<HTMLElement>("[data-resource-results]");
    if (!results || results.dataset.resourceResultsBound === "true") return;
    results.dataset.resourceResultsBound = "true";
    results.addEventListener("click", (event) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !loadAdminResourceUrl) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname !== "/learn/admin/resources") return;
      event.preventDefault();
      loadAdminResourceUrl(url, true);
    });
    results.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.matches(".page-size-select") || !loadAdminResourceUrl) return;
      const url = new URL(window.location.href);
      url.searchParams.set("size", target.value);
      url.searchParams.delete("page");
      loadAdminResourceUrl(url, true);
    });
  };

  const setupAdminResourceFinder = (form: HTMLFormElement) => {
    const wrapper = form.closest<HTMLElement>("[data-resource-finder-ui]");
    const state = (name: string) => form.querySelector<HTMLInputElement>(`[data-resource-state="${name}"]`);
    const search = form.querySelector<HTMLInputElement>("[data-resource-search]");
    const panel = form.querySelector<HTMLElement>("[data-resource-filter-panel]");
    const toggle = form.querySelector<HTMLButtonElement>("[data-resource-filter-toggle]");
    let requestController: AbortController | undefined;
    let requestSequence = 0;
    const closeMenus = (except?: HTMLElement) => {
      form.querySelectorAll<HTMLElement>("[data-resource-choice-menu]").forEach((menu) => {
        if (menu !== except) {
          menu.hidden = true;
          const field = menu.dataset.resourceChoiceMenu;
          form.querySelector<HTMLButtonElement>(`[data-resource-choice-trigger="${field}"]`)?.setAttribute("aria-expanded", "false");
        }
      });
    };
    const buildUrl = () => {
      const url = new URL(window.location.href);
      const searchValue = search?.value.trim() ?? "";
      searchValue ? url.searchParams.set("q", searchValue) : url.searchParams.delete("q");
      for (const field of ["student", "lesson", "type", "added", "sort"]) {
        const value = state(field)?.value ?? "";
        value ? url.searchParams.set(field, value) : url.searchParams.delete(field);
      }
      url.searchParams.delete("page");
      return url;
    };
    const load = async (target: URL, updateHistory: boolean) => {
      const results = document.querySelector<HTMLElement>("[data-resource-results]");
      if (!results) return;
      const sequence = ++requestSequence;
      requestController?.abort();
      requestController = new AbortController();
      const panelOpen = Boolean(panel && !panel.hidden);
      const error = document.querySelector<HTMLElement>("[data-resource-update-error]");
      results.classList.add("is-loading");
      results.setAttribute("aria-busy", "true");
      if (error) error.hidden = true;
      try {
        const response = await fetch(target, { headers: { Accept: "application/json", "X-Resource-Fragment": "1" }, signal: requestController.signal });
        if (!response.ok) throw new Error("Resource request failed.");
        const data = await response.json() as ResourceFragmentPayload;
        if (sequence !== requestSequence) return;
        if (wrapper && data.finderHtml) {
          wrapper.innerHTML = data.finderHtml;
          const nextForm = wrapper.querySelector<HTMLFormElement>("[data-resource-finder]");
          if (nextForm) {
            setupAdminResourceFinder(nextForm);
            const nextPanel = nextForm.querySelector<HTMLElement>("[data-resource-filter-panel]");
            const nextToggle = nextForm.querySelector<HTMLButtonElement>("[data-resource-filter-toggle]");
            if (nextPanel && nextToggle) {
              nextPanel.hidden = !panelOpen;
              nextToggle.setAttribute("aria-expanded", String(panelOpen));
            }
          }
        }
        results.innerHTML = data.resultsHtml;
        if (updateHistory) window.history.pushState({}, "", data.url);
        results.setAttribute("aria-busy", "false");
        document.querySelector<HTMLElement>("[data-resource-result-count]")?.setAttribute("aria-label", `${data.total} resources found`);
        setupResourceSelection();
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        if (error) error.hidden = false;
      } finally {
        if (sequence === requestSequence) {
          results.classList.remove("is-loading");
          results.setAttribute("aria-busy", "false");
        }
      }
    };
    loadAdminResourceUrl = (url, updateHistory) => void load(url, updateHistory);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      closeMenus();
      void load(buildUrl(), true);
    });
    toggle?.addEventListener("click", () => {
      if (!panel || !toggle) return;
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) panel.querySelector<HTMLButtonElement>("[data-resource-choice-trigger]")?.focus();
    });
    form.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const option = target.closest<HTMLButtonElement>("[data-resource-filter-option]");
      if (option) {
        const field = option.dataset.resourceFilterOption;
        if (!field) return;
        const value = option.dataset.value ?? "";
        const input = state(field);
        if (input) input.value = field === "added" && value === "any" || field === "sort" && value === "newest" ? "" : value;
        if (field === "student") {
          const lesson = state("lesson");
          if (lesson) lesson.value = "";
        }
        closeMenus();
        void load(buildUrl(), true);
        return;
      }
      const trigger = target.closest<HTMLButtonElement>("[data-resource-choice-trigger]");
      if (trigger && !trigger.disabled) {
        const field = trigger.dataset.resourceChoiceTrigger;
        const menu = field ? form.querySelector<HTMLElement>(`[data-resource-choice-menu="${field}"]`) : null;
        if (!menu) return;
        const opening = menu.hidden;
        closeMenus(menu);
        menu.hidden = !opening;
        trigger.setAttribute("aria-expanded", String(!menu.hidden));
        if (opening) menu.querySelector<HTMLInputElement>("[data-resource-choice-search]")?.focus();
        return;
      }
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (link && wrapper && link.closest("[data-resource-finder-ui]")) {
        const url = new URL(link.href, window.location.href);
        if (url.pathname === "/learn/admin/resources") {
          event.preventDefault();
          void load(url, true);
        }
      }
    });
    form.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.matches("[data-resource-filter-option]")) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const menu = target.closest("[data-resource-choice-menu]");
      if (!menu) return;
      const options = Array.from(menu.querySelectorAll<HTMLButtonElement>("[data-resource-filter-option]:not([hidden])"));
      const index = options.indexOf(target);
      if (index < 0) return;
      event.preventDefault();
      options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
    });
    const choiceSearchTimers = new Map<string, number>();
    form.querySelectorAll<HTMLInputElement>("[data-resource-choice-search]").forEach((choiceSearch) => {
      choiceSearch.addEventListener("input", () => {
        const query = choiceSearch.value.trim().toLowerCase();
        const field = choiceSearch.dataset.resourceChoiceSearch;
        if (!field) return;
        form.querySelectorAll<HTMLElement>(`[data-resource-filter-option="${field}"]`).forEach((option) => {
          option.hidden = Boolean(query) && !option.textContent?.toLowerCase().includes(query);
        });
        if ((field !== "student" && field !== "lesson") || choiceSearch.value.trim().length < 2) return;
        window.clearTimeout(choiceSearchTimers.get(field));
        choiceSearchTimers.set(field, window.setTimeout(async () => {
          const queryValue = choiceSearch.value.trim();
          const studentId = state("student")?.value ?? "";
          const controller = new AbortController();
          try {
            const response = await fetch(`/learn/admin/resources/search?q=${encodeURIComponent(queryValue)}${field === "lesson" && studentId ? `&student=${encodeURIComponent(studentId)}` : ""}`, { headers: { Accept: "application/json" }, signal: controller.signal });
            if (!response.ok) throw new Error("Filter search failed.");
            const data = await response.json() as { students?: ResourceFilterOption[]; lessons?: ResourceFilterOption[] };
            const items = field === "student" ? data.students ?? [] : data.lessons ?? [];
            const menu = choiceSearch.closest<HTMLElement>("[data-resource-choice-menu]");
            if (!menu) return;
            menu.querySelectorAll<HTMLElement>("[data-resource-filter-option]").forEach((option) => option.remove());
            const all = document.createElement("button");
            all.type = "button";
            all.role = "option";
            all.className = "resource-choice-option";
            all.dataset.resourceFilterOption = field;
            all.dataset.value = "";
            all.setAttribute("aria-selected", "false");
            all.textContent = field === "student" || field === "lesson" ? "All" : "";
            menu.appendChild(all);
            items.forEach((item) => {
              const option = document.createElement("button");
              option.type = "button";
              option.role = "option";
              option.className = "resource-choice-option";
              option.dataset.resourceFilterOption = field;
              option.dataset.value = item.value ?? item.id;
              option.setAttribute("aria-selected", "false");
              const label = document.createElement("span");
              label.textContent = item.label;
              option.appendChild(label);
              if (item.detail) {
                const detail = document.createElement("small");
                detail.textContent = item.detail;
                option.appendChild(detail);
              }
              menu.appendChild(option);
            });
          } catch (error) {
            console.error("Unable to load filter options.", error);
          }
        }, 180));
      });
      choiceSearch.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const menu = choiceSearch.closest<HTMLElement>("[data-resource-choice-menu]");
        const field = menu?.dataset.resourceChoiceMenu;
        closeMenus();
        form.querySelector<HTMLButtonElement>(`[data-resource-choice-trigger="${field}"]`)?.focus();
      });
    });
    const suggestions = form.querySelector<HTMLElement>("#resource-search-suggestions");
    if (search && suggestions) {
      type Suggestion = { id: string; label: string; detail: string; kind: "file" | "student" | "lesson"; value?: string };
      let suggestionItems: Suggestion[] = [];
      let activeSuggestion = -1;
      let timer: number | undefined;
      let suggestionController: AbortController | undefined;
      const closeSuggestions = () => {
        suggestions.hidden = true;
        search.setAttribute("aria-expanded", "false");
        search.removeAttribute("aria-activedescendant");
        activeSuggestion = -1;
      };
      const commitSearch = () => {
        closeSuggestions();
        void load(buildUrl(), true);
      };
      const selectSuggestion = (item: Suggestion) => {
        if (item.kind === "student") {
          const student = state("student");
          const lesson = state("lesson");
          if (student) student.value = item.value ?? item.id;
          if (lesson) lesson.value = "";
          search.value = "";
        } else {
          search.value = item.kind === "file" ? item.label : item.label.split(" · ")[0];
        }
        commitSearch();
      };
      const updateActiveSuggestion = () => {
        suggestionItems.forEach((item, index) => {
          const element = suggestions.querySelector<HTMLElement>(`[data-suggestion-index="${index}"]`);
          element?.classList.toggle("is-active", index === activeSuggestion);
          element?.setAttribute("aria-selected", String(index === activeSuggestion));
        });
        if (activeSuggestion >= 0) search.setAttribute("aria-activedescendant", `resource-suggestion-${activeSuggestion}`);
        else search.removeAttribute("aria-activedescendant");
      };
      const renderSuggestions = (groups: Array<{ label: string; items: Suggestion[] }>) => {
        suggestionItems = groups.flatMap((group) => group.items);
        if (!suggestionItems.length) {
          closeSuggestions();
          return;
        }
        let index = 0;
        suggestions.replaceChildren();
        for (const group of groups) {
          if (!group.items.length) continue;
          const heading = document.createElement("div");
          heading.className = "resource-suggestion-heading";
          heading.textContent = group.label;
          suggestions.appendChild(heading);
          for (const item of group.items) {
            const button = document.createElement("button");
            button.type = "button";
            button.id = `resource-suggestion-${index}`;
            button.className = "resource-suggestion";
            button.setAttribute("role", "option");
            button.setAttribute("aria-selected", "false");
            button.dataset.suggestionIndex = String(index);
            const label = document.createElement("strong");
            label.textContent = item.label;
            const detail = document.createElement("small");
            detail.textContent = item.detail;
            button.appendChild(label);
            button.appendChild(detail);
            button.addEventListener("mousedown", (event) => event.preventDefault());
            button.addEventListener("click", () => selectSuggestion(item));
            suggestions.appendChild(button);
            index++;
          }
        }
        activeSuggestion = -1;
        suggestions.hidden = false;
        search.setAttribute("aria-expanded", "true");
      };
      const loadSuggestions = async () => {
        const query = search.value.trim();
        if (query.length < 2) {
          suggestionController?.abort();
          closeSuggestions();
          return;
        }
        suggestionController?.abort();
        suggestionController = new AbortController();
        try {
          const response = await fetch(`${search.dataset.suggestionUrl}?q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" }, signal: suggestionController.signal });
          if (!response.ok) throw new Error("Suggestion request failed.");
          const data = await response.json() as { files?: Suggestion[]; students?: Suggestion[]; lessons?: Suggestion[] };
          renderSuggestions([{ label: "Files", items: data.files ?? [] }, { label: "Students", items: data.students ?? [] }, { label: "Lessons", items: data.lessons ?? [] }]);
        } catch (requestError) {
          if (requestError instanceof DOMException && requestError.name === "AbortError") return;
          closeSuggestions();
        }
      };
      search.addEventListener("input", () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void loadSuggestions(), 180);
      });
      search.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" && !suggestions.hidden) {
          event.preventDefault();
          activeSuggestion = Math.min(activeSuggestion + 1, suggestionItems.length - 1);
          updateActiveSuggestion();
        } else if (event.key === "ArrowUp" && !suggestions.hidden) {
          event.preventDefault();
          activeSuggestion = Math.max(activeSuggestion - 1, 0);
          updateActiveSuggestion();
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (activeSuggestion >= 0 && !suggestions.hidden) selectSuggestion(suggestionItems[activeSuggestion]);
          else commitSearch();
        } else if (event.key === "Escape" && !suggestions.hidden) {
          event.preventDefault();
          closeSuggestions();
        }
      });
      document.addEventListener("click", (event) => {
        if (!form.contains(event.target as Node)) closeSuggestions();
      });
    }
  };

  const setupStudentResourceFinder = (form: HTMLFormElement) => {
    const results = document.querySelector<HTMLElement>("[data-student-resource-results]");
    const search = form.querySelector<HTMLInputElement>("input[name='q']");
    if (!results || !search) return;
    let controller: AbortController | undefined;
    let sequence = 0;
    const load = async (target: URL, updateHistory: boolean) => {
      const current = ++sequence;
      controller?.abort();
      controller = new AbortController();
      search.value = target.searchParams.get("q") ?? "";
      results.classList.add("is-loading");
      results.setAttribute("aria-busy", "true");
      try {
        const response = await fetch(target, { headers: { Accept: "application/json", "X-Resource-Fragment": "1" }, signal: controller.signal });
        if (!response.ok) throw new Error("Student resource request failed.");
        const data = await response.json() as ResourceFragmentPayload;
        if (current !== sequence) return;
        results.innerHTML = data.resultsHtml;
        if (updateHistory) window.history.pushState({}, "", data.url);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        const error = document.querySelector<HTMLElement>("[data-student-resource-update-error]");
        if (error) error.hidden = false;
      } finally {
        if (current === sequence) {
          results.classList.remove("is-loading");
          results.setAttribute("aria-busy", "false");
        }
      }
    };
    const buildUrl = () => {
      const url = new URL(window.location.href);
      const value = search.value.trim();
      value ? url.searchParams.set("q", value) : url.searchParams.delete("q");
      return url;
    };
    loadStudentResourceUrl = (url, updateHistory) => void load(url, updateHistory);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      document.querySelector<HTMLElement>("[data-student-resource-update-error]")?.setAttribute("hidden", "");
      void load(buildUrl(), true);
    });
    results.addEventListener("click", (event) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !loadStudentResourceUrl) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname !== "/learn/student/resources") return;
      event.preventDefault();
      loadStudentResourceUrl(url, true);
    });
  };

  document.querySelectorAll<HTMLFormElement>("[data-resource-finder]").forEach(setupAdminResourceFinder);
  document.querySelectorAll<HTMLFormElement>("[data-student-resource-finder]").forEach(setupStudentResourceFinder);
  setupAdminResourceResults();
  setupResourceSelection();
  window.addEventListener("popstate", () => {
    if (loadAdminResourceUrl && document.querySelector("[data-resource-finder]")) loadAdminResourceUrl(new URL(window.location.href), false);
    else if (loadStudentResourceUrl && document.querySelector("[data-student-resource-finder]")) loadStudentResourceUrl(new URL(window.location.href), false);
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
