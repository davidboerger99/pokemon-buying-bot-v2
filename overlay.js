const htmlInjection = `
    <div id="plugin-overlay">
        <div id="plugin-header">
            <div id="plugin-title">
                <svg id="plugin-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Bot Active
            </div>
        </div>
        <div id="plugin-content">
            This tab is controlled by the plugin.
        </div>
        <div id="status-container">
            <div id="proxy-status">Proxy Status: <span id="proxy-status-value">-</span></div>
            <div id="item-status">Item Status: <span id="item-status-value">-</span></div>
        </div>
        <div id="last-update">
            <span id="update-time">Wird aktualisiert...</span>
            <div id="loading-spinner"></div>
        </div>
    </div>
`;

const styleInjection = `
    <style>
        #plugin-overlay {
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: rgba(255, 255, 255, 1);
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            font-family: Arial, sans-serif;
            max-width: 250px;
            z-index: 9999;
        }

        #plugin-header {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }

        #plugin-title {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            display: flex;
            align-items: center;
        }

        #plugin-icon {
            width: 16px;
            height: 16px;
            margin-right: 6px;
        }

        #plugin-content {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }

        #status-container {
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
        }

        #proxy-status, #item-status {
            margin-bottom: 2px;
        }

        #proxy-status-value, #item-status-value {
            font-weight: bold;
        }

        #last-update {
            font-size: 11px;
            color: #999;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #loading-spinner {
            width: 12px;
            height: 12px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: none;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (prefers-color-scheme: dark) {
            #plugin-overlay {
                background-color: rgba(51, 51, 51, 0.9);
                border-color: #444;
            }

            #plugin-title {
                color: #fff;
            }

            #plugin-content, #status-container {
                color: #ccc;
            }

            #last-update {
                color: #888;
            }
        }
    </style>
`;

async function onContentLoaded() {
    try {
        document.head.insertAdjacentHTML('beforeend', styleInjection);
        document.body.insertAdjacentHTML('beforeend', htmlInjection);

        const updateTimeSpan = document.getElementById('update-time');
        const loadingSpinner = document.getElementById('loading-spinner');
        const proxyStatusValue = document.getElementById('proxy-status-value');
        const itemStatusValue = document.getElementById('item-status-value');

        function updateTimestamp() {
            const now = new Date();
            updateTimeSpan.textContent = `Updated: ${now.toLocaleTimeString()}`;
            // loadingSpinner.style.display = 'inline-block';
            // setTimeout(() => {
            //     loadingSpinner.style.display = 'none';
            // }, 1000);
        }

        function updateProxyStatus(status) {
            proxyStatusValue.textContent = status;
            proxyStatusValue.style.color = status === 'Detected' ? '#ff4d4d' : '#4caf50';
        }

        function updateItemStatus(status) {
            itemStatusValue.textContent = status;
            itemStatusValue.style.color = status === 'Available' ? '#4caf50' : '#ff4d4d';
        }

        // updateTimestamp();
        // updateProxyStatus('Undetected');
        // updateItemStatus('Available');

        // Example of how to update statuses (you can call these functions when needed)
        // updateProxyStatus('Detected');
        // updateItemStatus('Not Available');

        // setInterval(updateTimestamp, 10000);
        // updateTimestamp();
    } catch (error) {
        alert('Error loading HTML content');
        console.error('Error loading HTML content:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onContentLoaded);
} else {
    onContentLoaded();
}