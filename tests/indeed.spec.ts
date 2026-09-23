import { test } from '@playwright/test';
import { IndeedFunctions } from '../src/pages/Indeed/indeedFunctions';
import dotenv from "dotenv";

dotenv.config();

test("search and scrape jobs", async ({ page }) => {
  const indeed = new IndeedFunctions(page);

  await indeed.navigateTo(process.env.INDEED_URL!);
  await indeed.searchJob("sde");

  const jobs = await indeed.scrapeJobCards();
  console.log(jobs);
});

