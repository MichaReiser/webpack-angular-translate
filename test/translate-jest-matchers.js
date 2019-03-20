const snapshot = require("jest-snapshot");

// webpack uses special errors that store the original error message
// in error.error.message. This serilaizer unwraps the webpack errors.
expect.addSnapshotSerializer({
  test(value) {
    return value instanceof Error && typeof value.error === "object";
  },
  print(value, serialize) {
    return `${value.name}: ${serialize(value.error.message)}`;
  }
});

expect.extend({
  toHaveEmittedErrorMatchingSnapshot(loaderContext) {
    return snapshot.toMatchSnapshot.call(
      this,
      loaderContext.emitError.mock.calls
    );
  }
});
