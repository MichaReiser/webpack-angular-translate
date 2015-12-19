
import Translation from "./translation";

export class TranslationRegistrationError extends Error {
    constructor (public message: string) {
        super(message);
    }
}

export class EmptyTranslationIdError extends TranslationRegistrationError {
    constructor(translation: Translation) {
        super(`Invalid angular-translate translation '${translation}' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js).`);
    }
}

export class TranslationMergeError extends TranslationRegistrationError {
    constructor (private existing: Translation, private newTranslation: Translation) {
        super(`Webpack-Angular-Translate: Two translations with the same id but different default text found.\n\tExisting: ${existing}\n\tnew: ${newTranslation}\n\tPlease define the same default text twice or specify the default text only once.`);
    }
}

export default class TranslationsRegistry {
    private translations: { [translationId: string] : Translation } = {};
    // Array with resource -> translation keys;
    private translationsByResource: { [resource: string ]: string []} = {};

    registerTranslation(translation: Translation): Translation {
        this.validateTranslation(translation);

        for (let usage of translation.usages) {
            var translations = this.translationsByResource[usage.resource] = this.translationsByResource[usage.resource] || [];
            if (translations.indexOf(translation.id) === -1) {
                translations.push(translation.id);
            }
        }

        const existingEntry = this.translations[translation.id];
        return this.translations[translation.id] = existingEntry ? translation.merge(existingEntry) : translation;
    }

    /**
     * Validates the passed in translation. The returned boolean indicates if the translation should be
     * registered or not.
     * @param translation the translation to validate
     */
    private validateTranslation(translation: Translation): void {
        if (!translation.id || translation.id.trim().length === 0) {
            throw new EmptyTranslationIdError(translation);
        }

        const existingEntry = this.getTranslation(translation.id);
        // If both entries define a default text that doesn't match, emit an error
        if (existingEntry && existingEntry.defaultText !== translation.defaultText && existingEntry.defaultText && translation.defaultText) {
            throw new TranslationMergeError(existingEntry, translation);
        }
    }

    pruneTranslations(resource: string): void {
        const translationIds = this.translationsByResource[resource] || [];
        for (let translationId of translationIds) {
            let translation = this.translations[translationId];
            if (!translation) {
                continue;
            }

            for (let usage of translation.usages) {
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
    }

    getTranslation(translationId: string): Translation {
        return this.translations[translationId];
    }

    get empty(): boolean {
        return Object.keys(this.translations).length === 0;
    }

    toJSON(): any {
        const translationIds = Object.keys(this.translations);
        const result: { [translationId: string ]: string } = {};

        translationIds.forEach(translationId => {
            const translation = this.translations[translationId];
            result[translationId] = translation.text;
        });

        return result;
    }
}