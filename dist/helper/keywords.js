"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORD_REGEX = exports.TARGET_KEYWORDS = void 0;
exports.hasMatchingKeyword = hasMatchingKeyword;
exports.extractMatchingKeywords = extractMatchingKeywords;
exports.TARGET_KEYWORDS = [
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "SQL",
    "Docker",
    "Playwright",
];
// Words like Node.js or C++ contain regex meta-characters (. or +). 
// Escaping prevents them from being treated as wildcards.
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
// Word boundary anchors prevent false positives 
// (e.g., preventing the keyword "Java" from matching "JavaScript")
exports.KEYWORD_REGEX = new RegExp(`\\b(${exports.TARGET_KEYWORDS.map(escapeRegex).join("|")})\\b`, "i");
// It is optimized by the V8 engine. It does not scan word-by-word in a JS loop.
// It searches the string buffer directly and exits as soon as the first match is encountered.
function hasMatchingKeyword(text) {
    return exports.KEYWORD_REGEX.test(text);
}
function extractMatchingKeywords(text) {
    const globalRegex = new RegExp(exports.KEYWORD_REGEX.source, "gi");
    const matches = text.match(globalRegex);
    if (!matches)
        return [];
    const lowerMap = new Map(exports.TARGET_KEYWORDS.map(k => [k.toLowerCase(), k]));
    const matchSet = new Set();
    for (const match of matches) {
        const canonical = lowerMap.get(match.toLowerCase());
        if (canonical) {
            matchSet.add(canonical);
        }
    }
    return Array.from(matchSet);
}
