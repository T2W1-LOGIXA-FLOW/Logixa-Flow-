import { chromium } from "playwright";

const required = [
  "PRODUCTION_FRONTEND_URL",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "PRODUCTION_ADMIN_EMAIL",
  "PRODUCTION_ADMIN_PASSWORD",
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const baseUrl = new URL(process.env.PRODUCTION_FRONTEND_URL);
if (baseUrl.protocol !== "https:") throw new Error("Production frontend URL must use HTTPS");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(20_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(new URL("/admin/login", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(process.env.PRODUCTION_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(process.env.PRODUCTION_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Login to Dashboard" }).click();
  await page.waitForURL((url) => url.pathname === "/admin" || url.pathname.startsWith("/admin/"), { timeout: 30_000 });
  await page.getByRole("link", { name: /AI Brain/ }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: /AI Brain/ }).click();
  await page.waitForURL((url) => url.pathname === "/admin/brain");
  await page.getByText("AI Memory", { exact: true }).waitFor({ state: "visible" });
  if (errors.length) throw new Error(`Browser runtime errors: ${errors.join(" | ").slice(0, 1200)}`);
  console.log(JSON.stringify({
    status: "passed",
    checks: ["admin login", "authenticated dashboard render", "AI Brain navigation", "Brain page render"],
    frontend_origin: baseUrl.origin,
  }));
} finally {
  await browser.close();
}
