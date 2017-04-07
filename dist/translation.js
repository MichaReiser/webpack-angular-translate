"use strict";
/**
 * Wrapper for a translation that has an id and optionally a default text.
 * The container also knows where the translation has been used for error messages / debugging.
 */
var Translation = (function () {
    /**
     * @param id {string} the id of the translation
     * @param defaultText {string} the default text if defined
     * @param usage the usages where the translation with the given id and text is used
     */
    function Translation(id, defaultText, usage) {
        this.id = id;
        this.defaultText = defaultText;
        if (usage instanceof Array) {
            this.usages = usage;
        }
        else {
            this.usages = usage ? [usage] : [];
        }
    }
    Object.defineProperty(Translation.prototype, "text", {
        /**
         * Returns the translation text that should be used.
         * @returns {string} The default text if defined or the id
         */
        get: function () {
            var result = this.defaultText || this.id;
            return result + ""; // convert to string
        },
        enumerable: true,
        configurable: true
    });
    ;
    /**
     * Merges the translation with the passed in other translation
     * @param other {Translation} another translation that should be merged with this translation
     * @returns {Translation} a new translation that is the merge of the current and passed in translation
     */
    Translation.prototype.merge = function (other) {
        var usages = this.usages;
        for (var _i = 0, _a = other.usages; _i < _a.length; _i++) {
            var usage = _a[_i];
            if (usages.indexOf(usage) === -1) {
                usages.push(usage);
            }
        }
        return new Translation(this.id, this.defaultText || other.defaultText, usages);
    };
    Translation.prototype.toString = function () {
        var usages = "";
        for (var _i = 0, _a = this.usages; _i < _a.length; _i++) {
            var usage = _a[_i];
            if (usages) {
                usages += ", ";
            }
            var line = usage.loc ? usage.loc.line : null;
            var column = usage.loc ? usage.loc.column : null;
            usages += usage.resource + ":" + line + ":" + column;
        }
        return "{ id: '" + this.id + "', defaultText: '" + this.defaultText + "', usages: [ " + usages + " ] }";
    };
    return Translation;
}());
exports.Translation = Translation;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Translation;
//# sourceMappingURL=translation.js.map