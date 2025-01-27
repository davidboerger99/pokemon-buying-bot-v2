function playNotificationSound() {
    if (chrome.offscreen) {
        chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('audio.html'),
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'notification',
        });
    } else {
        console.error('Offscreen API is not available.');
    }
}

async function fetchFromOxylabs(url) {
    const { config } = await chrome.storage.local.get('config');
    
    const body = {
        "url": url,
        "source": "universal",
        "render": "html",
        "geo_location": "United States",
        "locale": "en-us"
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
        // throw new Error(`Error fetching data: ${response.status}`);
        return null;
    }
    
    const data = await response.json();
    return data.results[0].content;
}

async function fetchFromBrightData(url) {
    const { config } = await chrome.storage.local.get('config');

    const body = {
        zone: 'web_unlocker1',
        url: url,
        format: 'raw'
    };
    const response = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.brightdataApiKey}`
        },
        body: JSON.stringify(body)
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
    const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const notAvailableString = 'This item is not available';
            const elementNotAvailable = doc.body.innerHTML.includes(notAvailableString);
            if (elementNotAvailable) {
                return 'notavailable';
            } else {
                return 'available';
            }
        },
        args: [html]
    });
    return result[0].result;
}

async function isWalmartItemAvailable(html, tabId) {
}

async function isBestBuyItemAvailable(html, tabId) {
    const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function(html) {
            function isComingSoonButtonInHTML() {
                const comingSoonButtonString = '<button class="c-button c-button-disabled c-button-lg c-button-block add-to-cart-button " disabled="" type="button" data-sku-id="6606082" data-button-state="COMING_SOON" style="padding:0 8px;margin-bottom:8px;margin-left:0px">Coming Soon</button>';
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                return doc.body.innerHTML.includes(comingSoonButtonString);
            }

            function shippingAndPickupNotAvailable() {
                const pickupNotAvailableString = "Pickup not available for this item";
                const shippingNotAvailableString = "Shipping not available for this item";

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const pickupNotAvailable = doc.body.innerHTML.includes(pickupNotAvailableString);
                const shippingNotAvailable = doc.body.innerHTML.includes(shippingNotAvailableString);
                return shippingNotAvailable;
                // return pickupNotAvailable && shippingNotAvailable;
            }

            if (isComingSoonButtonInHTML()) {
                return 'notavailable';
            } else {
                if (shippingAndPickupNotAvailable()) {
                    return 'notavailable';
                } else {
                    return 'available';
                }
            }
        },
        args: [html]
    });
    return result[0].result;
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
            proxyStatusValue.style.color = status !== 'Undetected' ? '#ff4d4d' : '#4caf50';
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

function getExpect(url) {
    const domainIsPokemonCenter = url.includes('pokemoncenter.com');
    const domainIsTarget = url.includes('target.com');
    const domainIsWalmart = url.includes('walmart.com');
    const domainIsBestBuy = url.includes('bestbuy.com');

    switch (true) {
        case domainIsPokemonCenter:
            return {
                "element": '.product-add--vGAcK',
            }
        case domainIsTarget:
            return {
                "element": 'addToCartButtonOrTextIdFor93954435'
            }
        case domainIsWalmart:
            return 'available';
        case domainIsBestBuy:
            return {
                "element": '.add-to-cart-button'
            }
        default:
            return false;
    }
}

async function startBestbuyBuyingProcess(tabId, url, currentStep='addToCart') {
    playNotificationSound();
    const config = await chrome.storage.local.get('config');
    await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: async function(currentStep, config) {

            const cfg = config.config;
            // inject audio with autplay
            // document.body.insertAdjacentHTML('beforeend', '<audio id="audio" autoplay><source src="https://cdn.pixabay.com/audio/2022/03/19/audio_80288ed9d9.mp3" type="audio/mpeg"></audio>');
            // const audio = new Audio();
            // audio.src = "https://cdn.pixabay.com/audio/2022/03/19/audio_80288ed9d9.mp3";
            // audio.play();
            const waitForElement = async (selector) => {
                return new Promise((resolve) => {
                    const observer = new MutationObserver((mutations) => {
                        const element = document.querySelector(selector);
                        if (element && !element.disabled) {
                            observer.disconnect();
                            resolve(element);
                        }
                    });
            
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['disabled']
                    });
            
                    // Check initially in case the element is already present and enabled
                    const element = document.querySelector(selector);
                    if (element && !element.disabled) {
                        observer.disconnect();
                        resolve(element);
                    }
                });
            }

            const selectShipping = () => {
                const buttons = document.querySelectorAll('button[aria-label*="Shipping"]');
                buttons[0].click();
            };

            const addToCart = () => {
                const button = document.getElementsByClassName('add-to-cart-button');
                button[0].click();
            }

            const getQuantitySelectElement = () => {
                const selectElements = document.querySelectorAll('select');
                return Array.from(selectElements).filter(element => 
                    element.id.includes('quantity')
                );
            }

            const selectAmount = (amount) => {
                const select = getQuantitySelectElement()[0];
                select.value = amount;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const clickCheckout = async () => {
                const element = await waitForElement('div[class*="checkout-buttons"]');
                const button = element.querySelector('button');
                button.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const getAmount = () => {
                const { urls } = cfg;
                const url = urls.find(url => url.url.includes('bestbuy.com'));
                return url.quantity;
            }

            if (currentStep === 'addToCart') {
                selectShipping();
                await new Promise(resolve => setTimeout(resolve, 500));
                addToCart();
            }

            if (currentStep === 'setQuantity') {
                try{
                    const amount = getAmount();
                    if (amount >= 10) {
                        selectAmount("10");
                    } else {
                        selectAmount(`${amount}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await clickCheckout();
                } catch (error) {
                    console.log("Error setting quantity", error);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (currentStep === 'placeOrder') {
                const cvv = cfg.cvv;
                const cvvInput = document.getElementById('cvv');
                cvvInput.value = cvv;
                const submitButton = document.querySelector('button[data-track="Place your Order - In-line"]');
                submitButton.click();

            }

            return currentStep;
        },
        args: [currentStep, config]
    }, (results) => {
        const step = results[0].result;
        console.log("Step: ", step);

        if (step === 'addToCart') {
            chrome.tabs.onUpdated.addListener(async function listener(tabIdUpdated, changeInfo, tab) {
                if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.update(tabId, { url: 'https://www.bestbuy.com/cart' }, () => {
                        chrome.tabs.onUpdated.addListener(async function listener(tabIdUpdated, changeInfo) {
                            if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(listener);
                                return await startBestbuyBuyingProcess(tabId, url, 'setQuantity');
                            }
                        });
                    });
                    // return await startBestbuyBuyingProcess(tabId, url, 'setQuantity');
                }
            });
            // chrome.tabs.update(tabId, { url: 'https://www.bestbuy.com/cart' }, () => {
            //     chrome.tabs.onUpdated.addListener(async function listener(tabIdUpdated, changeInfo) {
            //         if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
            //             chrome.tabs.onUpdated.removeListener(listener);
            //             return await startBestbuyBuyingProcess(tabId, url, 'setQuantity');
            //         }
            //     });
            // });
        } else if (step === 'setQuantity') {
            chrome.tabs.update(tabId, { url: 'https://www.bestbuy.com/checkout/r/fast-track' }, () => {
                chrome.tabs.onUpdated.addListener(async function listener(tabIdUpdated, changeInfo) {
                    if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        return await startBestbuyBuyingProcess(tabId, url, 'placeOrder');
                    }
                });
            });
        }
    });
}

async function startTargetBuyingProcess(tabId, url, currentStep='addToCart') {
    const config = await chrome.storage.local.get('config');
    await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: async function(currentStep, config) {
            const cfg = config.config;
            const cvv = cfg.cvv;

            const waitForElement = async (selector) => {
                return new Promise((resolve) => {
                    const observer = new MutationObserver((mutations) => {
                        const element = document.querySelector(selector);
                        if (element && !element.disabled) {
                            observer.disconnect();
                            resolve(element);
                        }
                    });
            
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['disabled']
                    });
            
                    // Check initially in case the element is already present and enabled
                    const element = document.querySelector(selector);
                    if (element && !element.disabled) {
                        observer.disconnect();
                        resolve(element);
                    }
                });
            };

            const trySelectShipping = async () => {
                const element = await waitForElement('button[aria-label*="shipping"]');
                if (element) {
                    element.click();
                }
            }

            const addToCart = async () => {
                const buttonElement = await waitForElement('button[id*="addToCartButtonOrTextIdFor"]');
                console.log(buttonElement);
                if (buttonElement) {
                    buttonElement.click();
                } 
            }


            const getQuantitySelectElement = async () => {
                const element = await waitForElement('select[data-test="cartItem-qty"]');
                return element;
            }

            const getAmount = () => {
                const { urls } = cfg;
                const url = urls.find(url => url.url.includes('target.com'));
                return url.quantity;
            }

            const placeOrder = async () => {
                const button = await waitForElement('button[data-test="placeOrderButton"]');
                button.click();
            }

            const setQuantity = async (quantity) => {
                const select = await getQuantitySelectElement();
                select.value = `${quantity}`;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const setCvv = async () => {
                const cvvLabel = await waitForElement('label[for="enter-cvv"]');
                cvvLabel.remove();
                const cvvInput = await waitForElement('input[id="enter-cvv"]');
                cvvInput.value = cvv;
                cvvInput.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 1000));
                const confirmButton = await waitForElement('button[data-test="confirm-button"]');
                confirmButton.click();
            }

            if (currentStep === 'addToCart') {
                await trySelectShipping();
                await new Promise(resolve => setTimeout(resolve, 500));
                await addToCart();
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (currentStep === 'setQuantity') {
                const amount = getAmount();
                await setQuantity(amount);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (currentStep === 'placeOrder') {
                await placeOrder();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await setCvv();
            }

            return currentStep;
        },
        args: [currentStep, config]
    }, (results) => {
        const step = results[0].result;
        
        if (step === 'addToCart') {
            chrome.tabs.update(tabId, { url: 'https://www.target.com/cart' }, () => {
                chrome.tabs.onUpdated.addListener(async function listener(tabIdUpdated, changeInfo) {
                    if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        return await startTargetBuyingProcess(tabId, url, 'setQuantity');
                    }
                });
            });
        } else if (step === 'setQuantity') {
            chrome.tabs.update(tabId, { url: 'https://www.target.com/checkout' }, () => {
                chrome.tabs.onUpdated.addListener(async function listener(tabIdUpdated, changeInfo) {
                    if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        return await startTargetBuyingProcess(tabId, url, 'placeOrder');
                    }
                });
            });
        }

    });
}


async function startBuyingProcess(tabId, url) {
    const domainIsPokemonCenter = url.includes('pokemoncenter.com');
    const domainIsTarget = url.includes('target.com');
    const domainIsWalmart = url.includes('walmart.com');
    const domainIsBestBuy = url.includes('bestbuy.com');

    switch (true) {
        case domainIsPokemonCenter:
            break;
        case domainIsTarget:
            startTargetBuyingProcess(tabId, url);
            break;
        case domainIsWalmart:
            break;
        case domainIsBestBuy:
            startBestbuyBuyingProcess(tabId, url);
            break;
        default:
            return false;
    }
}

async function startBackgroundAvailabilityCheck(tabId, url, detectionsInARow=0) {

    await showUpdateStatusInOverlay(tabId);

    const html = await fetchFromOxylabs(url);

    if(html) {
        await setProxyStatusInOverlay(tabId, 'Undetected');
        const itemAvailable = await CheckItemAvailability(url, html, tabId);
        switch (itemAvailable) {
            case 'available':
                await setItemStatusInOverlay(tabId, 'Available');
                detectionsInARow = 0;
                await chrome.tabs.reload(tabId);

                chrome.tabs.onUpdated.addListener(async function listener(tabIdUpdated, changeInfo) {
                    if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        await startBuyingProcess(tabId, url);
                    }
                });
                return;
            case 'notavailable':
                await setItemStatusInOverlay(tabId, 'Not Available');
                detectionsInARow = 0;
                break;
            case 'notfound':
                await setItemStatusInOverlay(tabId, 'Not Available');
                await setProxyStatusInOverlay(tabId, 'Detected');
                detectionsInARow++;
                break;
        }
    } else {
        await setProxyStatusInOverlay(tabId, 'Detected');
        detectionsInARow++;
    }

    await showLastUpdatedInOverlay(tabId);

    // wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // if (detectionsInARow > 100) {
    //     setItemStatusInOverlay(tabId, 'Not Available');
    //     setProxyStatusInOverlay(tabId, 'Detected 5 times in a row - stopped');
    //     return;
    // }
    
    await startBackgroundAvailabilityCheck(tabId, url, detectionsInARow);
}

chrome.runtime.onConnect.addListener((port) => {
    console.log("Verbindung hergestellt mit Popup.");
  
    port.onMessage.addListener(async (message) => {
        if (message.action === 'startBot') {
            chrome.storage.local.set({ config: message.config });
            const tabs = await openTabs(message.urls);
            tabs.forEach(tabId => injectPluginOverlay(tabId));
            for (let i = 0; i < message.urls.length; i++) {
                startBackgroundAvailabilityCheck(tabs[i], message.urls[i].url);
            }
        }
    });
});