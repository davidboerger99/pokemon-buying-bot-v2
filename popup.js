const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const saveButton = document.getElementById('saveButton');
const startButton = document.getElementById('startButton');
const addUrlButton = document.getElementById('addUrlButton');
const urlInputs = document.getElementById('urlInputs');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
    });
});

function addUrlInput(url = '', quantity = 1) {
    const urlInputGroup = document.createElement('div');
    urlInputGroup.className = 'url-input-group';
    urlInputGroup.innerHTML = `
        <input type="url" name="url" placeholder="https://example.com" value="${url}">
        <input type="number" name="quantity" min="1" value="${quantity}">
        <button class="secondary remove-button">-</button>
    `;
    urlInputs.appendChild(urlInputGroup);

    // Add event listener for the remove button
    urlInputGroup.querySelector('.remove-button').addEventListener('click', function() {
        removeUrlInput(this);
    });
}

function removeUrlInput(button) {
    button.parentElement.remove();
}

addUrlButton.addEventListener('click', () => addUrlInput());

function getConfig() {
    return {
        urls: Array.from(document.querySelectorAll('#urlInputs .url-input-group')).map(group => ({
            url: group.querySelector('input[name="url"]').value,
            quantity: parseInt(group.querySelector('input[name="quantity"]').value, 10)
        })),
        refreshInterval: document.getElementById('refreshInterval').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        street: document.getElementById('street').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zipCode: document.getElementById('zipCode').value,
        country: document.getElementById('country').value,
        cardNumber: document.getElementById('cardNumber').value,
        expiryDate: document.getElementById('expiryDate').value,
        cvv: document.getElementById('cvv').value,
        oxylabsUsername: document.getElementById('proxyUsername').value,
        oxylabsPassword: document.getElementById('proxyPassword').value,
    };
}

function setConfig(config) {
    urlInputs.innerHTML = '';
    config.urls.forEach(urlData => addUrlInput(urlData.url, urlData.quantity));
    document.getElementById('refreshInterval').value = config.refreshInterval || '';
    document.getElementById('firstName').value = config.firstName || '';
    document.getElementById('lastName').value = config.lastName || '';
    document.getElementById('email').value = config.email || '';
    document.getElementById('street').value = config.street || '';
    document.getElementById('city').value = config.city || '';
    document.getElementById('state').value = config.state || '';
    document.getElementById('zipCode').value = config.zipCode || '';
    document.getElementById('country').value = config.country || '';
    document.getElementById('cardNumber').value = config.cardNumber || '';
    document.getElementById('expiryDate').value = config.expiryDate || '';
    document.getElementById('cvv').value = config.cvv || '';
    document.getElementById('proxyUsername').value = config.oxylabsUsername || '';
    document.getElementById('proxyPassword').value = config.oxylabsPassword || '';
}

saveButton.addEventListener('click', () => {
    const config = getConfig();
    localStorage.setItem('pluginConfig', JSON.stringify(config));
    alert('Konfiguration gespeichert!');
});

const getCleanedUrls = (urls) => {
    return urls.map(urlData => ({
        url: urlData.url.trim(),
        quantity: parseInt(urlData.quantity, 10)
    })).filter(urlData => urlData.url.length > 0);
};

startButton.addEventListener('click', () => {
    const config = getConfig();
    const cleanedUrls = getCleanedUrls(config.urls);
    if (cleanedUrls.length > 0) {
        const port = chrome.runtime.connect();
        port.postMessage({
          action: 'startBot',
          urls: cleanedUrls,
          config: config
        });
    } else {
        alert('Bitte gib mindestens eine URL ein.');
    }
});

// Load saved configuration on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedConfig = localStorage.getItem('pluginConfig');
    if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
    } else {
        addUrlInput(); // Add one empty URL input by default
    }
});