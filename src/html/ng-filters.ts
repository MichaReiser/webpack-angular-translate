/**
 * Matches a filter expression containing translate
 * Group 1: Value passed to the filter
 * Group 2 (optional): Filters applied before the translate filter
 */
const attributeRegex = /^\s*("[^"]*"|'[^']*'|[^|]+)(?:\s*\|\s*(?!translate)([^|\s]+))*\s*(?:\|\s*translate)\s*(?:\s*\|\s*[^|\s]+)*\s*$/i;
const angularExpression = /\{\{\s*("[^"]*"|'[^']*'|[^|]+)(?:\s*\|\s*(?!translate)([^|\s]+))*\s*(?:\|\s*translate)\s*(?:\s*\|\s*[^|\s]+)*\s*}}/igm;

export interface AngularExpressionMatch {
    match: string;
    value: string;
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

export function matchAngularExpressions(html: string): AngularExpressionMatch[] {
    const matches: AngularExpressionMatch[] = [];
    let match: RegExpExecArray;

    do {
        match = angularExpression.exec(html);

        if (match) {
            matches.push(parseMatch(match));
        }
    } while (match);

    return matches;
}

export function matchAttribute(attributeText: string): AngularExpressionMatch {
    const match = attributeRegex.exec(attributeText);

    if (match) {
        return parseMatch(match);
    }
    return undefined;
}
