"use strict";
/**
 * Matches a filter expression containing translate
 * Group 1: Value passed to the filter
 * Group 2 (optional): Filters applied before the translate filter
 */
var angularExpression = /\{\{\s*("[^"]*"|'[^']*'|[^|]+)(?:\s*\|\s*(?!translate)([^|\s]+))*\s*(?:\|\s*translate)\s*(?:\s*\|\s*[^|\s]+)*\s*}}/igm;
function parseMatch(match) {
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
function matchAngularExpressions(text) {
    var matches = [];
    var match;
    do {
        match = angularExpression.exec(text);
        if (match) {
            matches.push(parseMatch(match));
        }
    } while (match);
    return matches;
}
exports.matchAngularExpressions = matchAngularExpressions;
//# sourceMappingURL=ng-filters.js.map