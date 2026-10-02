import { Page, Locator } from "@playwright/test"

export class IndeedLocators {
    constructor(private page: Page) {}

    searchInput(): Locator {
        return this.page.getByRole("combobox", { name: "search: Job title, keywords, or company"});
    }

    findJobsButton(): Locator {
        return this.page.getByRole("button", { name : "Find jobs"});
    }

    findJobTypeButton() : Locator {
        return this.page.getByRole("button", { name : "Job type"});
    }

    locationInput(): Locator {
        return this.page.getByRole("combobox", { name: "Edit location" });
    }

    cookieButton() : Locator {
        return this.page.getByRole('button', { name: 'Accept All Cookies' })
    }

    jobCards(): Locator {
        return this.page.locator('.job_seen_beacon')
    }

    jobCardTitle(card:Locator): Locator {
        return card.locator('a.jcs-JobTitle');
    }

    jobCardCompany(card: Locator): Locator {
        return card.locator('[data-testid="company-name"]');
    }

    jobCardLocation(card: Locator): Locator {
        return card.locator('[data-testid="text-location"]');
    }

    jobDescription() : Locator{
        return this.page.locator('#jobDescriptionText');
    }
}