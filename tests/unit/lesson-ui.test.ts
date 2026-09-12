import { describe, expect, it } from "vitest";

describe("lesson creation client behavior", () => {
  it("updates the derived end immediately from the time input alone", async () => {
    document.body.innerHTML = `
      <form class="lesson-create-form" data-duration-minutes="55">
        <input type="time" name="startTime" step="900">
        <output data-end-preview>—</output>
      </form>
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
  });
});
