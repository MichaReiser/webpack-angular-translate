interface Usage {
  resource: string;
  loc: {
    line: number;
    column: number;
  };
}

/**
 * Wrapper for a translation that has an id and optionally a default text.
 * The container also knows where the translation has been used for error messages / debugging.
 */
export class Translation {
  usages: Usage[];

  /**
   * @param id {string} the id of the translation
   * @param defaultText {string} the default text if defined
   * @param usage the usages where the translation with the given id and text is used
   */
  constructor(
    public id: string,
    public defaultText: string,
    usage: Usage | Usage[]
  ) {
    if (usage instanceof Array) {
      this.usages = usage;
    } else {
      this.usages = usage ? [<Usage>usage] : [];
    }
  }

  /**
   * Returns the translation text that should be used.
   * @returns {string} The default text if defined or the id
   */
  get text(): string {
    const result = this.defaultText || this.id;

    return result + ""; // convert to string
  }

  /**
   * Merges the translation with the passed in other translation
   * @param other {Translation} another translation that should be merged with this translation
   * @returns {Translation} a new translation that is the merge of the current and passed in translation
   */
  merge(other: Translation): Translation {
    const usages = this.usages;

    for (const usage of other.usages) {
      if (usages.indexOf(usage) === -1) {
        usages.push(usage);
      }
    }

    return new Translation(
      this.id,
      this.defaultText || other.defaultText,
      usages
    );
  }

  toString(): string {
    let usages = this.usages.map(usage => {
      const line = usage.loc ? usage.loc.line : null;
      const column = usage.loc ? usage.loc.column : null;
      return `${usage.resource}:${line}:${column}`;
    });

    return JSON.stringify(
      {
        id: typeof this.id === "undefined" ? null : this.id,
        defaultText:
          typeof this.defaultText === "undefined" ? null : this.defaultText,
        usages: usages
      },
      null,
      "  "
    );
  }
}

export default Translation;
