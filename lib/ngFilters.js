/**
 * Matches a filter expression containing translate
 * Group 1: Value passed to the filter
 * Group 2 (optional): Filters applied before the translate filter
 */
var attributeRegex = /^\s*("[^"]*"|'[^']*'|[^|]+)(?:\s*\|\s*(?!translate)([^|\s]+))*\s*(?:\|\s*translate)\s*(?:\s*\|\s*[^|\s]+)*\s*$/i;
var angularExpression = /\{\{\s*("[^"]*"|'[^']*'|[^|]+)(?:\s*\|\s*(?!translate)([^|\s]+))*\s*(?:\|\s*translate)\s*(?:\s*\|\s*[^|\s]+)*\s*}}/igm;

function parseMatch(match) {
    var previousFilters = match[2] ? match[2].trim() : undefined;
    return {
        match: match[0],
        value: match[1].trim(),
        previousFilters: previousFilters
    }
}

function matchAngularExpressions(html) {
    var matches = [];

    do {
        var match = angularExpression.exec(html);

        if (match) {
            matches.push(parseMatch(match));
        }
    } while (match);

    return matches;
}

function matchAttribute(attributeText) {
    var match = attributeRegex.exec(attributeText);

    if (match) {
        return parseMatch(match);
    }
    return undefined
}

module.exports = {
    matchAngularExpressions: matchAngularExpressions,
    matchAttribute: matchAttribute
};
