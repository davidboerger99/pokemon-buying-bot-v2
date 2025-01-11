async function fetchFromOxylabs(url) {
    const { config } = await chrome.storage.local.get('config');
    
    const body = {
        "url": url,
        "source": "universal",
        "render": "html",
        "geo_location": "United States"
    };
    
    const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Basic " + btoa(`${config.oxylabsUsername}:${config.oxylabsPassword}`),
        }
    });
    
    if (!response.ok) {
        console.log(await response.text());
        throw new Error(`Error fetching data: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
}

async function fetchFromBrightData(url) {
    const { config } = await chrome.storage.local.get('config');

    const proxyUrl = `http://brd.superproxy.io:33335`;
    const proxyAuth = `Basic ${btoa(`${config.brightdataUsername}:${config.brightdataPassword}`)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Proxy-Authorization': proxyAuth,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        console.log(await response.text());
        throw new Error(`Error fetching data: ${response.status}`);
    }

    const data = await response.text();
    return data;
}

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

async function checkAvailability(urls) {
   for (let i = 0; i < urls.length; i++) {
    // await fetchFromOxylabs(urls[i].url);
    await fetchFromBrightData(urls[i].url);
   }
}

async function showUpdateStatusInOverlay(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
            const loadingSpinner = document.getElementById('loading-spinner');
            loadingSpinner.style.display = 'inline-block';

            const updateTimeSpan = document.getElementById('update-time');
            updateTimeSpan.textContent = `Updating...`;
        }
    });
}

async function showLastUpdatedInOverlay(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
            const updateTimeSpan = document.getElementById('update-time');
            const now = new Date();
            updateTimeSpan.textContent = `Updated: ${now.toLocaleTimeString()}`;

            const loadingSpinner = document.getElementById('loading-spinner');
            loadingSpinner.style.display = 'none';
        }
    });
}

async function isPokemonCenterItemAvailable(html, tabId) {
    const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const addtoCartButton = doc.evaluate('//*[@id="product"]/div[2]/div[2]/div[4]/button', doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if(!addtoCartButton) {
                return 'notfound';
            }

            if(addtoCartButton.disabled) {
                return 'notavailable';
            }
            
            return 'available';
        },
        args: [html]
    });

    return result[0].result;
}

async function isTargetItemAvailable(html, tabId) {

}

async function isWalmartItemAvailable(html, tabId) {
}

async function isBestBuyItemAvailable(html, tabId) {
}

async function CheckItemAvailability(url, html, tabId) {
    const domainIsPokemonCenter = url.includes('pokemoncenter.com');
    const domainIsTarget = url.includes('target.com');
    const domainIsWalmart = url.includes('walmart.com');
    const domainIsBestBuy = url.includes('bestbuy.com');

    switch (true) {
        case domainIsPokemonCenter:
            return isPokemonCenterItemAvailable(html, tabId);
        case domainIsTarget:
            return isTargetItemAvailable(html, tabId);
        case domainIsWalmart:
            return isWalmartItemAvailable(html, tabId);
        case domainIsBestBuy:
            return isBestBuyItemAvailable(html, tabId);
        default:
            return false;
    }
}

async function setProxyStatusInOverlay(tabId, status) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: (status) => {
            const proxyStatusValue = document.getElementById('proxy-status-value');
            proxyStatusValue.textContent = status;
            proxyStatusValue.style.color = status === 'Detected' ? '#ff4d4d' : '#4caf50';
        },
        args: [status]
    });
}

async function setItemStatusInOverlay(tabId, status) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: (status) => {
            const itemStatusValue = document.getElementById('item-status-value');
            itemStatusValue.textContent = status;
            itemStatusValue.style.color = status === 'Available' ? '#4caf50' : '#ff4d4d';
        },
        args: [status]
    });
}

async function startBackgroundAvailabilityCheck(tabId, url) {

    await showUpdateStatusInOverlay(tabId);
    // wait 4 seconds
    const html = await fetchFromBrightData(url);

    if(html) {
        await setProxyStatusInOverlay(tabId, 'Undetected');
        const itemAvailable = await CheckItemAvailability(url, html, tabId);
        switch (itemAvailable) {
            case 'available':
                await setItemStatusInOverlay(tabId, 'Available');
                break;
            case 'notavailable':
                await setItemStatusInOverlay(tabId, 'Not Available');
                break;
            case 'notfound':
                await setItemStatusInOverlay(tabId, 'Not Available');
                await setProxyStatusInOverlay(tabId, 'Detected');
                break;
        }
    } else {
        await setProxyStatusInOverlay(tabId, 'Detected');
    }

    await showLastUpdatedInOverlay(tabId);

    // wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    await startBackgroundAvailabilityCheck(tabId, url);
}

chrome.runtime.onConnect.addListener((port) => {
    console.log("Verbindung hergestellt mit Popup.");
  
    port.onMessage.addListener(async (message) => {
        if (message.action === 'startBot') {
            console.log("Bot gestartet.", message.config);  
            await chrome.storage.local.set(message.config);
            const tabs = await openTabs(message.urls);
            tabs.forEach(tabId => injectPluginOverlay(tabId));
            for (let i = 0; i < message.urls.length; i++) {
                startBackgroundAvailabilityCheck(tabs[i], message.urls[i].url);
            }
        }
    });
});