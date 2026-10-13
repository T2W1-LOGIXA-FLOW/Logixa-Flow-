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
const consoleErrors = [];
const failedRequests = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("requestfailed", (request) => {
  const requestUrl = new URL(request.url());
  failedRequests.push({
    url: `${requestUrl.origin}${requestUrl.pathname}`,
    error: request.failure()?.errorText ?? "unknown request failure",
  });
});

try {
  await page.goto(new URL("/admin/login", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Email" }).fill(process.env.PRODUCTION_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(process.env.PRODUCTION_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Login to Dashboard" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/admin/") && url.pathname !== "/admin/login",
    { timeout: 30_000 },
  );
  await page.getByRole("link", { name: /AI Brain/ }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: /AI Brain/ }).click();
  // Next.js client navigation may update the URL before click() resolves;
  // wait for the pathname itself rather than a new document load event.
  await page.waitForFunction(() => window.location.pathname === "/admin/brain", null, { timeout: 30_000 });

  try {
    await page.getByText("AI Memory", { exact: true }).waitFor({ state: "visible" });
  } catch (cause) {
    const diagnostics = await page.evaluate(() => ({
      title: document.title,
      pathname: window.location.pathname,
      visibleHeadings: Array.from(document.querySelectorAll("h1, h2, h3"))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return style.display !== "none" && style.visibility !== "hidden" &&
            element.getClientRects().length > 0;
        })
        .map((element) => (element.textContent ?? "").trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 20),
      aiMemoryTextPresent: Array.from(document.querySelectorAll("body *"))
        .some((element) => element.children.length === 0 &&
          (element.textContent ?? "").trim() === "AI Memory"),
    }));
    throw new Error(JSON.stringify({
      message: "AI Memory heading did not become visible",
      cause: cause instanceof Error ? cause.message : String(cause),
      diagnostics,
      browserErrors: errors.slice(0, 10).map((message) => message.slice(0, 300)),
      consoleErrors: consoleErrors.slice(0, 10).map((message) => message.slice(0, 300)),
      failedRequests: failedRequests.slice(0, 15),
    }));
  }

  if (errors.length) throw new Error(`Browser runtime errors: ${errors.join(" | ").slice(0, 1200)}`);
  console.log(JSON.stringify({
    status: "passed",
    checks: ["admin login", "authenticated dashboard render", "AI Brain navigation", "Brain page render"],
    frontend_origin: baseUrl.origin,
  }));
} finally {
  await browser.close();
}
