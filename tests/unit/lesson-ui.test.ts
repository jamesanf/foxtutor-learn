import { describe, expect, it } from "vitest";

describe("lesson creation client behavior", () => {
  it("updates the derived end immediately from the time input alone", async () => {
    document.body.innerHTML = `
      <form class="lesson-create-form" data-duration-minutes="55">
        <input type="time" name="startTime" step="900">
        <output data-end-preview>—</output>
      </form>
      <button type="button" data-lesson-create-trigger>New booking</button>
      <dialog data-lesson-create-dialog>
        <button type="button" data-lesson-create-close>Close</button>
        <input type="text" aria-label="Student">
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
    expect(trigger).not.toBeNull();
    expect(dialog).not.toBeNull();
    trigger!.click();
    expect(dialog!.open).toBe(true);
    close!.click();
    expect(dialog!.open).toBe(false);
  });
});
