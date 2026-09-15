import { describe, expect, it } from "vitest";

describe("lesson creation client behavior", () => {
  it("updates the derived end immediately from the time input alone", async () => {
    document.body.innerHTML = `
      <form class="lesson-create-form" data-duration-minutes="55">
        <input type="time" name="startTime" step="900">
        <output data-end-preview>—</output>
      </form>
      <button type="button" data-lesson-create-trigger>New booking</button>
      <dialog data-lesson-create-dialog data-initial-view="choice">
        <div data-booking-choice-view>
          <button type="button" data-booking-option="standalone">Standalone lesson</button>
          <button type="button" data-booking-option="recurring">Recurring lesson</button>
        </div>
        <div data-booking-form-view="standalone" hidden>
          <input type="text" aria-label="Standalone student">
          <button type="button" data-booking-choice-back>Back</button>
        </div>
        <div data-booking-form-view="recurring" hidden>
          <input type="text" aria-label="Recurring student">
          <button type="button" data-booking-choice-back>Back</button>
        </div>
        <button type="button" data-lesson-create-close>Close</button>
      </dialog>
    `;

    await import("../../src/client/learn");
    const time = document.querySelector<HTMLInputElement>('input[name="startTime"]');
    const output = document.querySelector<HTMLOutputElement>("[data-end-preview]");
    expect(time).not.toBeNull();
    expect(output).not.toBeNull();

    time!.value = "16:00";
    time!.dispatchEvent(new Event("input", { bubbles: true }));
    expect(output!.textContent).toBe("16:55");

    time!.value = "23:15";
    time!.dispatchEvent(new Event("input", { bubbles: true }));
    expect(output!.textContent).toBe("00:10");

    time!.value = "";
    time!.dispatchEvent(new Event("input", { bubbles: true }));
    expect(output!.textContent).toBe("—");

    const trigger = document.querySelector<HTMLButtonElement>("[data-lesson-create-trigger]");
    const dialog = document.querySelector<HTMLDialogElement>("[data-lesson-create-dialog]");
    const close = document.querySelector<HTMLButtonElement>("[data-lesson-create-close]");
    const recurringOption = document.querySelector<HTMLButtonElement>("[data-booking-option='recurring']");
    const choiceView = document.querySelector<HTMLElement>("[data-booking-choice-view]");
    const recurringView = document.querySelector<HTMLElement>("[data-booking-form-view='recurring']");
    const back = recurringView?.querySelector<HTMLButtonElement>("[data-booking-choice-back]");
    expect(trigger).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(recurringOption).not.toBeNull();
    trigger!.click();
    expect(dialog!.open).toBe(true);
    recurringOption!.click();
    expect(choiceView!.hidden).toBe(true);
    expect(recurringView!.hidden).toBe(false);
    back!.click();
    expect(choiceView!.hidden).toBe(false);
    expect(recurringView!.hidden).toBe(true);
    close!.click();
    expect(dialog!.open).toBe(false);
  });
});
