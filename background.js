// This listener runs when the extension icon (action) is clicked
const api = typeof browser !== "undefined" ? browser : chrome;
api.action.onClicked.addListener(() => {
    api.tabs.create({
        url: api.runtime.getURL("popup.html")
    });
});
