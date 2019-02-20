export { default as Plugin } from "./angular-translate-plugin";
export { default as angularI18nTranslationsExtractor } from "./html/angular-i18n-translations-extractor";

export function htmlLoader(before: string, options: any): string {
    const loader = require.resolve("./html/html-loader");
    options = (options ? "?" + JSON.stringify(options) : "");
    if (before) {
        return loader + "!" + before + options;
    }
    return loader + options;
}

export function jsLoader(before: string, options: any): string {
    const loader = require.resolve("./js/js-loader");
    options = (options ? "?" + JSON.stringify(options) : "");

    if (before) {
        return loader + "!" + before + options;
    }

    return loader + options;
}
