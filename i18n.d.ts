declare module i18n {
	/**
	 * Registers a translation that will be exported by the webpack-angular-translate
	 * plugin. If no default text is specified, then the translation id will be used as default-text
	 * @param translationId the translation id, needs to be a literal (no expressions allowed)
	 * @param defaultText the default text to use. If not specified, then the translation id is used. 
	 * @returns the translation id
	 */
	function registerTranslation(translationId: string, defaultText?: string) : string;
	
	/**
	 * Registers multiple translations where the key is the translation id and the value is the
	 * default text. Only literal values are supported. 
	 * @params translations the object hash containing the translations to register
     * @returns the array with the translation ids
	*/
	function registerTranslations(translations: { [translationId: string] : string}) : string[];
}