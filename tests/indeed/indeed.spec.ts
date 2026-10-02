import { chromium, test } from '@playwright/test';
import { IndeedFunctions } from '../../src/pages/Indeed/indeedFunctions';
import dotenv from "dotenv";
import path from 'path';

dotenv.config();

test("search and scrape jobs", async () => {
  const userDataDir = path.resolve(__dirname, "../.browser-profile");

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel : "chrome",
    headless: false,
    viewport: { width : 1280, height : 720},
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  const indeed = new IndeedFunctions(page);
  await indeed.navigateTo(process.env.INDEED_URL!);
  await indeed.searchJob("sde");

  const jobs = await indeed.scrapeFilteredJobCards();
  console.log(jobs);

  await context.close();
});

