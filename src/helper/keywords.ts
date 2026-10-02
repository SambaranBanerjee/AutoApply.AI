export const TARGET_KEYWORDS : string[] = [
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "SQL",
    "Docker",
    "Playwright",
]

// Words like Node.js or C++ contain regex meta-characters (. or +). 
// Escaping prevents them from being treated as wildcards.
function escapeRegex (text:string) : string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Word boundary anchors prevent false positives 
// (e.g., preventing the keyword "Java" from matching "JavaScript")
export const KEYWORD_REGEX: RegExp = new RegExp(
    `\\b(${TARGET_KEYWORDS.map(escapeRegex).join("|")})\\b`,
  "i"
);

// It is optimized by the V8 engine. It does not scan word-by-word in a JS loop.
// It searches the string buffer directly and exits as soon as the first match is encountered.
export function hasMatchingKeyword (text : string) : boolean {
    return KEYWORD_REGEX.test(text);
}

export function extractMatchingKeywords(text : string) : string[] {
    const globalRegex = new RegExp(KEYWORD_REGEX.source, "gi");
    const matches = text.match(globalRegex);
    if (!matches)
        return [];

    const lowerMap = new Map(TARGET_KEYWORDS.map(k => [k.toLowerCase(), k]));
    const matchSet = new Set<string>();

    for (const match of matches) {
        const canonical = lowerMap.get(match.toLowerCase());
        if (canonical) {
            matchSet.add(canonical);
        }
    }

    return Array.from(matchSet);
}