"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeParser = void 0;
const pdf_parse_1 = require("pdf-parse");
const SKILL_DICTIONARY = {
    "Python": ["python", "py"],
    "Java": ["java"],
    "JavaScript": ["javascript", "js", "es6", "ecmascript"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "react.js", "reactjs"],
    "React.js": ["react", "react.js", "reactjs"],
    "React Native": ["react native", "react-native"],
    "Node.js": ["node", "node.js", "nodejs"],
    "Express.js": ["express", "express.js", "expressjs"],
    "Full Stack": ["full stack", "fullstack", "full-stack", "mern", "mean"],
    "Frontend": ["frontend", "front-end", "front end"],
    "Backend": ["backend", "back-end", "back end"],
    "SQL": ["sql", "mysql", "postgresql", "postgres"],
    "NoSQL": ["nosql", "mongodb", "mongo", "redis"],
    "Distributed Systems": ["distributed systems", "distributed architecture"],
    "Microservices Architecture": ["microservices", "microservices architecture"],
    "System Design": ["system design"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "AWS": ["aws", "amazon web services"],
    "Git": ["git", "github", "gitlab"],
    "REST APIs": ["rest", "restful", "rest api", "restful webservices"],
};
class ResumeParser {
    /**
   * Extracts text directly from an in-memory PDF buffer.
   */
    static async extractTextFromBuffer(buffer) {
        const parser = new pdf_parse_1.PDFParse({ data: buffer });
        const result = await parser.getText();
        return result?.text || "";
    }
    /**
    * Scans text for known skills using word boundary matching.
    * Returns a deduplicated array of canonical skill names.
    */
    static extractKeywords(text) {
        const matchedSkills = new Set();
        for (const [canonicalName, variations] of Object.entries(SKILL_DICTIONARY)) {
            for (const variant of variations) {
                const escaped = variant.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                const regex = new RegExp(`\\b${escaped}\\b`, "i");
                if (regex.test(text)) {
                    matchedSkills.add(canonicalName);
                    break;
                }
            }
        }
        return Array.from(matchedSkills);
    }
    static extractExperience(text) {
        const currentYear = new Date().getFullYear();
        const pattern = /(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i;
        const exact = text.match(pattern);
        if (exact && exact[1]) {
            const exp = parseFloat(exact[1]);
            if (!isNaN(exp) && exp >= 0 && exp <= 30) {
                return Math.round(exp);
            }
        }
        const fresherSignal = /\b(intern|internship|student|bachelor|undergraduate|fresher|expected graduation|batch of 202[4-9])\b/i.test(text);
        const datePattern = /\b(20\d{2})\s*(?:–|-|to)\s*(20\d{2}|present|current)\b/gi;
        let match;
        let maxSpan = 0;
        while ((match = datePattern.exec(text)) !== null) {
            const startYear = parseInt(match[1], 10);
            const endYearStr = match[2].toLowerCase();
            const endYear = (endYearStr === "present" || endYearStr === "current")
                ? currentYear
                : parseInt(endYearStr, 10);
            if (!isNaN(startYear) && !isNaN(endYear) && endYear >= startYear && endYear <= currentYear + 1) {
                const span = endYear - startYear;
                if (span > maxSpan && span <= 15) {
                    maxSpan = span;
                }
            }
        }
        if (fresherSignal && maxSpan <= 1) {
            return 0;
        }
        return maxSpan > 0 ? maxSpan : 0;
    }
}
exports.ResumeParser = ResumeParser;
