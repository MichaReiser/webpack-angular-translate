"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var TranslationRegistrationError = (function (_super) {
    __extends(TranslationRegistrationError, _super);
    function TranslationRegistrationError(message) {
        _super.call(this, message);
        this.message = message;
    }
    return TranslationRegistrationError;
}(Error));
exports.TranslationRegistrationError = TranslationRegistrationError;
var EmptyTranslationIdError = (function (_super) {
    __extends(EmptyTranslationIdError, _super);
    function EmptyTranslationIdError(translation) {
        _super.call(this, "Invalid angular-translate translation '" + translation + "' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js).");
    }
    return EmptyTranslationIdError;
}(TranslationRegistrationError));
exports.EmptyTranslationIdError = EmptyTranslationIdError;
var TranslationMergeError = (function (_super) {
    __extends(TranslationMergeError, _super);
    function TranslationMergeError(existing, newTranslation) {
        _super.call(this, "Webpack-Angular-Translate: Two translations with the same id but different default text found.\n\tExisting: " + existing + "\n\tnew: " + newTranslation + "\n\tPlease define the same default text twice or specify the default text only once.");
        this.existing = existing;
        this.newTranslation = newTranslation;
    }
    return TranslationMergeError;
}(TranslationRegistrationError));
exports.TranslationMergeError = TranslationMergeError;
var TranslationsRegistry = (function () {
    function TranslationsRegistry() {
        this.translations = {};
        // Array with resource -> translation keys;
        this.translationsByResource = {};
    }
    TranslationsRegistry.prototype.registerTranslation = function (translation) {
        this.validateTranslation(translation);
        for (var _i = 0, _a = translation.usages; _i < _a.length; _i++) {
            var usage = _a[_i];
            var translations = this.translationsByResource[usage.resource] = this.translationsByResource[usage.resource] || [];
            if (translations.indexOf(translation.id) === -1) {
                translations.push(translation.id);
            }
        }
        var existingEntry = this.translations[translation.id];
        return this.translations[translation.id] = existingEntry ? translation.merge(existingEntry) : translation;
    };
    /**
     * Validates the passed in translation. The returned boolean indicates if the translation should be
     * registered or not.
     * @param translation the translation to validate
     */
    TranslationsRegistry.prototype.validateTranslation = function (translation) {
        if (!translation.id || translation.id.trim().length === 0) {
            throw new EmptyTranslationIdError(translation);
        }
        var existingEntry = this.getTranslation(translation.id);
        // If both entries define a default text that doesn't match, emit an error
        if (existingEntry && existingEntry.defaultText !== translation.defaultText && existingEntry.defaultText && translation.defaultText) {
            throw new TranslationMergeError(existingEntry, translation);
        }
    };
    TranslationsRegistry.prototype.pruneTranslations = function (resource) {
        var translationIds = this.translationsByResource[resource] || [];
        for (var _i = 0, translationIds_1 = translationIds; _i < translationIds_1.length; _i++) {
            var translationId = translationIds_1[_i];
            var translation = this.translations[translationId];
            if (!translation) {
                continue;
            }
            for (var _a = 0, _b = translation.usages; _a < _b.length; _a++) {
                var usage = _b[_a];
                if (usage.resource === resource) {
                    translation.usages.splice(translation.usages.indexOf(usage), 1);
                    if (translation.usages.length === 0) {
                        delete this.translations[translation.id];
                    }
                    break;
                }
            }
        }
        delete this.translationsByResource[resource];
    };
    TranslationsRegistry.prototype.getTranslation = function (translationId) {
        return this.translations[translationId];
    };
    Object.defineProperty(TranslationsRegistry.prototype, "empty", {
        get: function () {
            return Object.keys(this.translations).length === 0;
        },
        enumerable: true,
        configurable: true
    });
    TranslationsRegistry.prototype.toJSON = function () {
        var _this = this;
        var translationIds = Object.keys(this.translations);
        var result = {};
        translationIds.forEach(function (translationId) {
            var translation = _this.translations[translationId];
            result[translationId] = translation.text;
        });
        return result;
    };
    return TranslationsRegistry;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TranslationsRegistry;
//# sourceMappingURL=translations-registry.js.map