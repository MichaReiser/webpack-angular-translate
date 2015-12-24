/**
 * Matches a filter expression containing translate
 * Group 1: Value passed to the filter
 * Group 2 (optional): Filters applied before the translate filter
 */
const angularExpression = /\{\{\s*("[^"]*"|'[^']*'|[^|]+)(?:\s*\|\s*(?!translate)([^|\s]+))*\s*(?:\|\s*translate)\s*(?:\s*\|\s*[^|\s]+)*\s*}}/igm;

/**
 * Match for an angular expression
 */
export interface AngularExpressionMatch {
    /**
     * The full string of characters matched, e.g. `'test' | translate | uppercase`
     */
    match: string;

    /**
     * The value passed to the filter-chain
     */
    value: string;

    /**
     * Filters applied before the translate filter
     */
    previousFilters: string;
}

function parseMatch(match: RegExpExecArray): AngularExpressionMatch {
    var previousFilters = match[2] ? match[2].trim() : undefined;
    return {
        match: match[0],
        value: match[1].trim(),
        previousFilters: previousFilters
    };
}

/**
 * Matches the angular expressions from a a text. Returns a match for each expression in the
 * passed in text. Can be used to match the angular expressions inside an attribute or in the body text of an element.
 * @param text the text to search for angular expressions
 * @returns {AngularExpressionMatch[]} an array with the found matches
 */
export function matchAngularExpressions(text: string): AngularExpressionMatch[] {
    const matches: AngularExpressionMatch[] = [];
    let match: RegExpExecArray;

    do {
        match = angularExpression.exec(text);

        if (match) {
            matches.push(parseMatch(match));
        }
    } while (match);

    return matches;
}
