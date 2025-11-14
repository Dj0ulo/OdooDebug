const browserAction = typeof browser == 'object' ? chrome.browserAction : chrome.action; // Browser compatibility

class onClickListener {
    constructor(callback) {
        const CONTROL_TIME = 500; // Max time between click events occurrence
        let click = 0;
        let timer;

        if (callback && callback instanceof Function) {
            return tab => {
                click += 1;
                clearTimeout(timer);
                timer = setTimeout(() => {
                    // Clear all timers
                    clearTimeout(timer);
                    callback.apply(this, [tab, click]);
                    click = 0;
                }, CONTROL_TIME);
            };
        }
        throw new Error('[InvalidArgumentException]');
    }
}

let debugMode = '';
let odooVersion = 'legacy';

const onClickActivateDebugMode = (tab, click) => {
    if (click <= 2) {
        const debugOptions = {
            0: [odooVersion === 'legacy' ? '' : '0', '/images/icons/off_48.png'],
            1: ['1', '/images/icons/on_48.png'],
            2: ['assets', '/images/icons/super_48.png'],
        };
        const selectedMode = debugMode && click === 1 ? 0 : click;
        const tabUrl = new URL(tab.url);
        const [debugOption, path] = debugOptions[selectedMode];
        const params = new URLSearchParams(tabUrl.search);
        params.set('debug', debugOption);
        const url = tabUrl.origin + tabUrl.pathname + `?${params.toString()}` + tabUrl.hash;
        browserAction.setIcon({ path });
        chrome.tabs.update(tab.id, { url });
    }
}

const adaptIcon = () => {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        if (tabs.length) {
            chrome.tabs.sendMessage(tabs[0].id, {message: 'getOdooDebugInfo'}, response => {
                let path = '/images/icons/no_debug_48.png';
                if (!chrome.runtime.lastError && response.odooVersion) {
                    let color = null;
                    if (response.debugMode === 'assets') {
                        path = '/images/icons/super_48.png';
                        color = "#2c2838"
                    } else if (response.debugMode === '1') {
                        path = '/images/icons/on_48.png';
                        color = "#f16b5f"
                    } else {
                        path = '/images/icons/off_48.png';
                        color = "#f5d0a1"
                    }
                    odooVersion = response.odooVersion;
                    debugMode = response.debugMode;
                    const shortVersion = odooVersion.startsWith("saas") ? odooVersion.slice(5, 9) : odooVersion.slice(0, 4);
                    browserAction.setBadgeText({ text: shortVersion, tabId: tabs[0].id })
                    browserAction.setBadgeBackgroundColor({ color, tabId: tabs[0].id })
                    browserAction.enable(tabs[0].id);
                } else {
                    browserAction.disable(tabs[0].id);
                }
                browserAction.setIcon({ path });
            });
        }
    });
}

browserAction.onClicked.addListener(new onClickListener((tab, click) => onClickActivateDebugMode(tab, click)));
chrome.tabs.onActivated.addListener(adaptIcon);
chrome.tabs.onUpdated.addListener(adaptIcon);
chrome.windows.onFocusChanged.addListener(adaptIcon);
