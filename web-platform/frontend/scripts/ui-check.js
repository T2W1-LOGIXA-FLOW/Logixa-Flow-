const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://localhost:3000';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
  } catch (e) {
    console.error('Failed to load page:', e.message);
    await browser.close();
    process.exit(2);
  }

  // Theme toggle
  try {
    const [toggle] = await page.$x("//button[contains(., '🌙') or contains(., '☀️')]");
    if (toggle) {
      await toggle.click();
      await page.waitForTimeout(500);
      const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      console.log('Theme toggle present. dark class on root =', dark);
    } else {
      console.log('Theme toggle not found');
    }
  } catch (e) {
    console.error('Theme toggle check failed', e.message);
  }

  // Mobile drawer
  try {
    const [hamburger] = await page.$x("//button[contains(., '☰')]");
    if (hamburger) {
      await hamburger.click();
      await page.waitForSelector('aside', { visible: true, timeout: 5000 });
      console.log('Drawer opened: aside is visible');
    } else {
      console.log('Hamburger not found at desktop width, resizing...');
      await page.setViewport({ width: 375, height: 800 });
      const [ham2] = await page.$x("//button[contains(., '☰')]");
      if (ham2) {
        await ham2.click();
        await page.waitForSelector('aside', { visible: true, timeout: 5000 });
        console.log('Drawer opened after viewport change');
      } else {
        console.log('Hamburger still not found');
      }
    }
  } catch (e) {
    console.error('Drawer check failed', e.message);
  }

  await browser.close();
  process.exit(0);
})();
