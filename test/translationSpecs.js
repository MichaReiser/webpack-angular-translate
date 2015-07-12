var assert = require("chai").assert,
    Translation = require("../Translation.js");

describe("Translations", function () {
    "use strict";

    it("creates a new translation with a resource array if a single resource is passed in", function () {
        var translation = new Translation("test", null, "src/main.html");

        assert.sameMembers(translation.resources, [ "src/main.html" ]);
    });

    it("creates a new translation with a resource array, if a resource array is passed in", function () {
        var translation = new Translation("test", null, [ "src/main.html", "src/login.html"]);

        assert.sameMembers(translation.resources, [ "src/main.html", "src/login.html" ]);
    });

    it("merges the resources when two translations are merged", function () {
        var first = new Translation("hallo", null, "src/main.html"),
            second = new Translation("hallo", null, "src/login.html");

        var merged = first.merge(second);
        assert.sameMembers(merged.resources, [ "src/main.html", "src/login.html" ]);
        assert.equal(merged.id, "hallo");
        assert.isNull(merged.defaultText);
    });

    it("does not include the same resources twice when merging", function () {
        var first = new Translation("hallo", null, "src/main.html"),
            second = new Translation("hallo", null, "src/main.html");

        var merged = first.merge(second);
        assert.sameMembers(merged.resources, [ "src/main.html" ]);
        assert.equal(merged.id, "hallo");
        assert.isNull(merged.defaultText);
    });

    it("uses the default text of the translation if one of both translations have a default text", function () {
        var first = new Translation("hallo", null, "src/main.html"),
            second = new Translation("hallo", "Hallo", "src/main.html");

        var merged = first.merge(second);
        assert.equal(merged.id, "hallo");
        assert.equal(merged.defaultText, "Hallo");
    });

    it("uses the default text of the first translations if both translations have a default text", function () {
        var first = new Translation("hallo", "Hello", "src/main.html"),
            second = new Translation("hallo", "Hallo", "src/main.html");

        var merged = first.merge(second);
        assert.equal(merged.id, "hallo");
        assert.equal(merged.defaultText, "Hello");
    });

    it("implements to string", function () {
        var translation = new Translation("hallo", null, [ "src/main.html", "src/login.html"]);

        assert.equal(translation.toString(), "Translation{ id: hallo, defaultText: null, resources: src/main.html,src/login.html}");
    });
});