/**
 * Wrapper for a translation that has an id and optionally a default text.
 * The container also knows where the translation has been used for error messages / debugging.
 * @param id {string} the id of the translation
 * @param defaultText {string} the default text if defined
 * @param resources [string|string[]] the resources that have used this translation id
 * @constructor
 */
function Translation(id, defaultText, resources) {
    this.id = id;
    this.defaultText = defaultText;

    if (Array.isArray(resources)) {
        this.resources = resources;
    } else {
        this.resources = resources ? [ resources ] : [];
    }
}

/**
 * Merges the translation with the passed in other translation
 * @param other {Translation} another translation that should be merged with this translation
 * @returns {Translation} a new translation that is the merge of the current and passed in translation
 */
Translation.prototype.merge = function (other) {
    var resources = this.resources;

    for (var resource of other.resources) {
        if (resources.indexOf(resource) === -1) {
            resources.push(resource);
        }
    }

    return new Translation(this.id, this.defaultText || other.defaultText, resources);
};

/**
 * Returns the default text if defined or the translation id.
 * @returns {string}
 */
Translation.prototype.text = function () {
    var result = this.defaultText || this.id;

    return result + ""; // convert to string
};

Translation.prototype.toString = function () {
    return "Translation{ id: " + this.id + ", defaultText: " + this.defaultText + ", resources: " + this.resources + "}";
};

module.exports = Translation;