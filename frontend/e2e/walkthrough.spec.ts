import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const SCREENSHOTS = path.resolve(__dirname, "../../docs/screenshots");
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`) });

test("a sales rep works through their leads", async ({ page }) => {
  const pinned = page.getByRole("region", { name: "Today's follow-ups" });
  const allLeads = page.getByRole("region", { name: "All leads" });
  const dialog = page.getByRole("dialog");

  await test.step("the list shows name, status, last note and time ago, with today's follow-ups pinned", async () => {
    await page.goto("/");
    await expect(pinned.getByRole("button")).toHaveCount(2);
    await expect(pinned).toContainText("Rohan Malhotra");
    await expect(pinned).toContainText("Overdue"); // earlier today: pinned and red
    await expect(pinned).toContainText("Meera Krishnan");
    await expect(allLeads).toContainText("No discussions yet");
    await expect(allLeads).toContainText(/Last note: .+\d+[mhdw] ago/);
    await shot(page, "01-lead-list");
  });

  await test.step("the timeline dialog shows the discussion history newest first", async () => {
    await pinned.getByRole("button", { name: /Meera Krishnan/ }).click();
    const timeline = dialog.getByRole("list", { name: "Discussion history" });
    await expect(timeline.getByRole("listitem").first()).toContainText("Sent a sample tax-harvesting report");
    await expect(timeline.getByRole("listitem").last()).toContainText("Lead created");
    await shot(page, "02-lead-timeline");
  });

  await test.step("adding a note with a follow-up updates the list immediately", async () => {
    const note = "Spoke to her CA. They want the harvesting plan before the 15th.";
    await dialog.getByPlaceholder("Log a new discussion…").fill(note);
    await dialog.getByRole("button", { name: "Tomorrow 10 AM" }).click();
    await shot(page, "03-add-note-with-follow-up");
    await dialog.getByRole("button", { name: "Save note" }).click();

    await expect(page.getByText("Note saved. Follow-up tomorrow at 10:00 AM.")).toBeVisible();
    await expect(dialog.getByRole("list", { name: "Discussion history" }).getByRole("listitem").first()).toContainText(note);
    await page.keyboard.press("Escape");

    // Follow-up moved to tomorrow, so Meera leaves the pinned section with her new last note.
    const meera = allLeads.getByRole("button", { name: /Meera Krishnan/ });
    await expect(meera).toContainText(note);
    await expect(meera).toContainText("Follow-up tomorrow at 10:00 AM");
    await expect(pinned.getByRole("button")).toHaveCount(1);
  });

  await test.step("a status change from the dialog persists after a reload", async () => {
    await allLeads.getByRole("button", { name: /Kabir Sethi/ }).click();
    await dialog.getByRole("combobox", { name: "Lead status" }).click();
    await page.getByRole("option", { name: "Contacted" }).click();
    await expect(page.getByText("Kabir Sethi moved to Contacted")).toBeVisible();
    await shot(page, "04-status-change");

    await page.reload();
    await expect(allLeads.getByRole("button", { name: /Kabir Sethi/ })).toContainText("Contacted");
  });

  await test.step("adding a new lead puts it in the list with status New", async () => {
    await page.getByRole("button", { name: "Add new lead" }).first().click();
    await dialog.getByLabel(/Full name/).fill("Ananya Iyer");
    await dialog.getByLabel(/Company/).fill("Iyer Family Office");
    await dialog.getByLabel(/Phone/).fill("+91 98200 12345");
    await shot(page, "05-add-lead");
    await dialog.getByRole("button", { name: "Save lead" }).click();

    const ananya = allLeads.getByRole("button", { name: /Ananya Iyer/ });
    await expect(ananya).toContainText("New");
    await expect(ananya).toContainText("No discussions yet");
  });

  await test.step("search by name and filter by follow-up", async () => {
    await page.getByRole("searchbox", { name: "Search leads by name" }).fill("mehta");
    await expect(allLeads.getByRole("button")).toHaveCount(1);
    await expect(allLeads).toContainText("Arjun Mehta");
    await page.getByRole("searchbox", { name: "Search leads by name" }).fill("");

    await page.getByRole("combobox", { name: "Filter by follow-up" }).click();
    await page.getByRole("option", { name: "Overdue" }).click();
    await expect(page.getByRole("main")).toContainText("Arjun Mehta");
    await expect(page.getByRole("main")).toContainText("Neha Kapoor");
    await expect(page.getByRole("main")).not.toContainText("Priya Nair");
    await shot(page, "06-overdue-filter");
  });

  await test.step("the layout works at phone width", async () => {
    await page.getByRole("combobox", { name: "Filter by follow-up" }).click();
    await page.getByRole("option", { name: "All follow-ups" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 10_000 });
    await expect(pinned).toBeVisible();
    await shot(page, "07-mobile");
  });
});
