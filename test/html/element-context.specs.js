var assert = require("chai").assert;
var ElementScope = require("../../dist/html/element-context").default;

describe("ElementContext", function() {
  "use strict";

  var rootContext;

  beforeEach(function() {
    rootContext = new ElementScope(null, "root", null);
  });

  describe("enter", function() {
    it("sets the parent element correctly", function() {
      var child = rootContext.enter("body", { class: "test" });

      assert.equal(child.parent, rootContext);
    });

    it("sets the element name and attributes correctly", function() {
      var child = rootContext.enter("body", { class: "test" });

      assert.equal(child.elementName, "body");
      assert.deepEqual(child.attributes, { class: "test" });
    });
  });

  describe("leave", function() {
    it("returns the previous / parent element", function() {
      var child = rootContext.enter("body", { class: "test" });

      assert.equal(child.leave(), rootContext);
    });
  });

  describe("suppressDynamicTranslationErrors", function() {
    it("is false by default", function() {
      assert.notOk(rootContext.suppressDynamicTranslationErrors);
    });

    it("is true if activated on the current element", function() {
      rootContext.suppressDynamicTranslationErrors = true;
      assert.ok(rootContext.suppressDynamicTranslationErrors);
    });

    it("is true if activated on a parent element", function() {
      rootContext.suppressDynamicTranslationErrors = true;
      var child = rootContext.enter("body");

      assert.ok(child.suppressDynamicTranslationErrors);
    });

    it("is false if activated on a child element", function() {
      var child = rootContext.enter("body");
      child.suppressDynamicTranslationErrors = true;

      assert.notOk(rootContext.suppressDynamicTranslationErrors);
    });
  });

  describe("asHtml", function() {
    it("shows the html for the element", function() {
      var body = rootContext.enter("body");

      assert.equal(body.asHtml(), "<body>...</body>");
    });

    it("displays the text content of the element", function() {
      var body = rootContext.enter("body");
      body.text = "Hello World";

      assert.equal(body.asHtml(), "<body>Hello World</body>");
    });

    it("adds the attributes to the element", function() {
      var body = rootContext.enter("body", { class: "test", id: "main" });

      assert.equal(body.asHtml(), "<body class='test' id='main'>...</body>");
    });
  });
});
