var Test = (function () {
    function Test($translate, $http) {
        this.$translate = $translate;
        this.$translate("Next", null, null, "Weiter");

        this.$translate(["FIRST_PAGE", "LAST_PAGE" ], null, null, "Missing");
    }
    return Test;
})();