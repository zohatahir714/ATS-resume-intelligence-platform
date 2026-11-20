import { expect, test } from "@playwright/test";

test("landing page shows the product name", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "ATS Resume Intelligence" }),
  ).toBeVisible();
});
