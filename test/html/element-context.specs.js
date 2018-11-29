var assert = require("chai").assert;
var RootContext = require("../../dist/html/element-context").RootContext;

describe("ElementContext", function() {
  "use strict";

  describe("enter", function() {
    let rootContext;

    beforeEach(function() {
      rootContext = new RootContext("test.html", `<body class="test"></body>`);
    });

    it("sets the parent element correctly", function() {
      var child = rootContext.enter("body", [{ name: "class", value: "test" }]);

      assert.equal(child.parent, rootContext);
    });

    it("sets the element name and attributes correctly", function() {
      var child = rootContext.enter("body", [{ name: "class", value: "test" }]);

      assert.equal(child.tagName, "body");
      assert.deepEqual(child.attributes, [{ name: "class", value: "test" }]);
    });
  });

  describe("leave", function() {
    it("returns the previous / parent element", function() {
      const rootContext = new RootContext(
        "test.html",
        `<body class="test"></body>`
      );
      var child = rootContext.enter("body", [{ name: "class", value: "test" }]);

      assert.equal(child.leave(), rootContext);
    });
  });

  describe("suppressDynamicTranslationErrors", function() {
    let rootContext;

    beforeEach(function() {
      rootContext = new RootContext("test.html", `<body class="test"></body>`);
    });

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
      var body = new RootContext("test.html", "<body></body>").enter("body");

      assert.equal(body.asHtml(), "<body>...</body>");
    });

    it("displays the text content of the element", function() {
      var body = new RootContext(
        "test.html",
        "<body>Hello World\n</body>"
      ).enter("body");

      body.addText({
        raw: "Hello World\n",
        text: "Hello World"
      });

      assert.equal(body.asHtml(), "<body>Hello World\n</body>");
    });

    it("adds the attributes to the element", function() {
      var body = new RootContext(
        "test.html",
        `<body class="test" id="main"></body>`
      ).enter("body", [
        {
          name: "class",
          expressions: [],
          value: "test"
        },
        {
          name: "id",
          value: "main",
          expressions: []
        }
      ]);

      assert.equal(body.asHtml(), "<body class='test' id='main'>...</body>");
    });
  });
});
