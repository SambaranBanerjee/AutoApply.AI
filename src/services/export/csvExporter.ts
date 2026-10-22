import { JobMatchResult } from "../../types/matcher";

export class csvExporter {
    /**
    * Escapes a single CSV value according to RFC 4180 standards.
    */
    private static escapeCell(value: string | number | boolean | undefined | null): string {
        if (value == undefined || value == null) {
            return '""';
        }

        const stringValue = String(value);
        if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return `"${stringValue}"`;
    }

    /**
    * Converts a list of evaluated job matches into a complete CSV string.
    */
    static generateCsv(matches: JobMatchResult[]): string {
        const headers = [
            "Rank",
            "Match Score (%)",
            "Job Title",
            "Company",
            "Source Portal",
            "Experience Required",
            "Work Mode",
            "Locations",
            "Matched Skills",
            "Missing Mandatory Skills",
            "Apply URL",
        ];

        const rows = matches.map((item, index) => {
            const job = item.job;
            const workMode = job.isRemote ? "Remote / WFH" : "On-site / Office";
            const locations = job.locations.join("; ") || "Unspecified";
            const matchedSkills = item.matchedSkills.join("; ") || "None";
            const missingSkills = item.missingMandatorySkills.join("; ") || "None";

            return [
                index + 1,
                item.score,
                this.escapeCell(job.title),
                this.escapeCell(job.company),
                this.escapeCell(job.sourcePortal.toUpperCase()),
                this.escapeCell(job.experienceRange),
                this.escapeCell(workMode),
                this.escapeCell(locations),
                this.escapeCell(matchedSkills),
                this.escapeCell(missingSkills),
                this.escapeCell(job.url),
            ].join(",");
        });

        return [headers.join(","), ...rows].join("\r\n");
    } 
}