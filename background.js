
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "redirect") {
        chrome.tabs.update({
            url: `https://esportal.com/sv/match/${message.id}`
        });
    }
});