// This listener runs when the extension icon (action) is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("popup.html")
    });
});
