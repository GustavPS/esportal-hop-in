
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "redirect") {
        chrome.tabs.update({
            url: `https://esportal.com/sv/match/${message.id}`
        });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    // Default sound on
    const sound = true;
    chrome.storage.sync.set({ sound });
});