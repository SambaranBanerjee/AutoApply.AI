import { PDFParse } from "pdf-parse";

const SKILL_DICTIONARY: Record<string, string[]> = {
    "Python": ["python", "py"],
    "Java": ["java"],
    "JavaScript": ["javascript", "js", "es6"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "react.js", "reactjs"],
    "Node.js": ["node", "node.js", "nodejs"],
    "SQL": ["sql", "mysql", "postgresql", "postgres"],
    "NoSQL": ["nosql", "mongodb", "mongo", "redis"],
    "Distributed Systems": ["distributed systems", "distributed architecture"],
    "Microservices Architecture": ["microservices", "microservices architecture"],
    "System Design": ["system design"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "AWS": ["aws", "amazon web services"],
};

export class ResumeParser {
    /**
   * Extracts text directly from an in-memory PDF buffer.
   */
    static async extractTextFromBuffer(buffer: Buffer): Promise<string> {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result?.text || "";
    }

    /**
    * Scans text for known skills using word boundary matching.
    * Returns a deduplicated array of canonical skill names.
    */
    static extractKeywords(text: string): string[] {
    const matchedSkills = new Set<string>();

    for (const [canonicalName, variations] of Object.entries(SKILL_DICTIONARY)) {
      for (const variant of variations) {
        // Escapes special regex characters (like '.', '+')
        const escaped = variant.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");

        if (regex.test(text)) {
          matchedSkills.add(canonicalName);
          break; // Move to next skill once matched
        }
      }
    }

    return Array.from(matchedSkills);
  }
}