var Test = (function () {
    function Test($translate) {
        this.$translate = $translate;
        this.$translate.instant("FIRST_TRANSLATION");
        $translate.instant("SECOND_TRANSLATION");

        let skipTranslate = $translate;
        skipTranslate.instant("SKIPPED_TRANSLATION");
    }
    return Test;
})();