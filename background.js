function openTabs(urls) {
    return new Promise((resolve) => {
        let tabs = [];
        let tabsCreated = 0;
    
        urls.forEach((url, index) => {
            chrome.tabs.create({ url: url.url }, (tab) => {
            tabs[index] = tab.id;
            tabsCreated++;
            if (tabsCreated === urls.length) {
                let tabsLoaded = 0;
                chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabs.includes(tabId) && info.status === "complete") {
                    tabsLoaded++;
                    if (tabsLoaded === tabs.length) {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve(tabs);
                    }
                }
                });
            }
            });
        });
    });
}

function injectPluginOverlay(tabId) {
    console.log("Overlay wird injiziert.");
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['overlay.js']
    });
}

chrome.runtime.onConnect.addListener((port) => {
    console.log("Verbindung hergestellt mit Popup.");
  
    port.onMessage.addListener((message) => {
        if (message.action === 'startBot') {
            console.log("Bot gestartet.", message.config);
            chrome.storage.local.set({ config: message.config.config }, async () => {
                const tabs = await openTabs(message.urls);
                tabs.forEach(tabId => injectPluginOverlay(tabId));
            });
        }
    });
});