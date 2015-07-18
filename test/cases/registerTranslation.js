function EditController(user) {
    if (user.isNew()) {
        this.title = i18n.registerTranslation("NEW_USER", "New user");
    } else {
        this.title = i18n.registerTranslation("EDIT_USER", "Edit user");
    }
}

var editState = {
    name: "edit",
    url: "/{id:int}/edit",
    template: require("./registerTranslation.html"),
    controller: EditController,
    controllerAs: "editCtrl"
};


i18n.registerTranslation(5, true);