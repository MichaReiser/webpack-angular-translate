var Translation = require("../dist/translation").default;
var TranslationsRegistry = require("../dist/translations-registry").default;

describe("TranslationsRegistry", function() {
  "use strict";
  var registry;
  var RESOURCE = "test.js";

  beforeEach(function() {
    registry = new TranslationsRegistry();
  });

  describe("empty", function() {
    it("is true by default", function() {
      expect(registry.empty).toBe(true);
    });

    it("is false if a translation is registered", function() {
      registry.registerTranslation(createTranslation("test"));

      expect(registry.empty).toBe(false);
    });
  });

  describe("toJSON", function() {
    it("returns an empty object by default", function() {
      expect(registry.toJSON()).toEqual({});
    });

    it("returns the registered translation", function() {
      registry.registerTranslation(createTranslation("test", "Test"));

      expect(registry.toJSON()).toEqual({ test: "Test" });
    });

    it("returns all registered translations", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(createTranslation("other"));

      expect(registry.toJSON()).toEqual({ test: "Test", other: "other" });
    });
  });

  describe("registerTranslation", function() {
    it("merges translations with the same translation id", function() {
      registry.registerTranslation(createTranslation("test", "Test", 1, 1));
      registry.registerTranslation(createTranslation("test", "Test", 10, 1));

      var translation = registry.getTranslation("test");
      expect(translation).toBeTruthy();

      expect(translation.usages).toEqual([
        {
          resource: RESOURCE,
          loc: {
            line: 10,
            column: 1
          }
        },
        {
          resource: RESOURCE,
          loc: {
            line: 1,
            column: 1
          }
        }
      ]);

      expect(registry.toJSON()).toEqual({ test: "Test" });
    });

    it("throws if another translation with a different default text exists", function() {
      registry.registerTranslation(createTranslation("test", "Test"));

      expect(function() {
        registry.registerTranslation(
          createTranslation("test", "Other default text", 10)
        );
      }).toThrowError(
        "Webpack-Angular-Translate: Two translations with the same id but different default text found.\n\tExisting: { id: 'test', defaultText: 'Test', usages: [ test.js:1:1 ] }\n\tnew: { id: 'test', defaultText: 'Other default text', usages: [ test.js:10:1 ] }\n\tPlease define the same default text twice or specify the default text only once."
      );
    });

    it("throws if the translation id is an empty string", function() {
      expect(function() {
        registry.registerTranslation(createTranslation(""));
      }).toThrowError(
        "Invalid angular-translate translation '{ id: '', defaultText: 'undefined', usages: [ test.js:1:1 ] }' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js)."
      );
    });

    it("throws if the translation id is undefined", function() {
      expect(function() {
        registry.registerTranslation(createTranslation());
      }).toThrowError(
        "Invalid angular-translate translation '{ id: 'undefined', defaultText: 'undefined', usages: [ test.js:1:1 ] }' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js)."
      );
    });

    it("throws if the translation id is null", function() {
      expect(function() {
        registry.registerTranslation(createTranslation(null));
      }).toThrowError(
        "Invalid angular-translate translation '{ id: 'null', defaultText: 'undefined', usages: [ test.js:1:1 ] }' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js)."
      );
    });
  });

  describe("pruneTranslations", function() {
    it("removes all translations from the specified resource", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(createTranslation("other", "Other"));

      registry.pruneTranslations(RESOURCE);

      expect(registry.empty).toBe(true);
      expect(registry.toJSON()).toEqual({});
    });

    it("does not remove translations from other resources", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(
        new Translation("other", "Other", {
          resource: "other.js",
          loc: { line: 1, column: 1 }
        })
      );

      registry.pruneTranslations(RESOURCE);

      expect(registry.empty).toBe(false);
      expect(registry.toJSON()).toEqual({ other: "Other" });
    });

    it("does not remove translation if it is used by another resource", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(
        new Translation("test", "Test", {
          resource: "other.js",
          loc: { line: 1, column: 1 }
        })
      );

      registry.pruneTranslations(RESOURCE);

      expect(registry.empty).toBe(false);
      expect(registry.toJSON()).toEqual({ test: "Test" });
    });

    it("removes a translation if all usages have been pruned", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(
        new Translation("test", "Test", {
          resource: "other.js",
          loc: { line: 1, column: 1 }
        })
      );

      registry.pruneTranslations(RESOURCE);
      registry.pruneTranslations("other.js");

      expect(registry.empty).toBe(true);
      expect(registry.toJSON()).toEqual({});
    });
  });

  function createTranslation(id, defaultText, line, column) {
    return new Translation(id, defaultText, {
      resource: RESOURCE,
      loc: { line: line || 1, column: column || 1 }
    });
  }
});
