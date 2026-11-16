const odooScript = document.head.querySelector('script[id="web.layout.odooscript"]');
const sessionInfoScript = [...document.head.querySelectorAll("script")].find((s) =>
    s.textContent.includes("session_info"),
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'getOdooDebugInfo') {
        const debugMatch = odooScript?.textContent.match(/debug: "([^"]*)"/);
        const versionMatch = sessionInfoScript?.textContent.match(/"server_version": "([^"]*)"/);
        sendResponse({
            odooVersion: versionMatch ? versionMatch[1] : false,
            debugMode: debugMatch ? debugMatch[1] : false,
        });
    }
});

// On <login>.localhost, log in as <login>/<login> unless already logged in as that user.
const autoLogin = async () => {
    const login = location.hostname.match(/^([\w-]+)\.localhost$/)?.[1];
    if (!login) {
        return;
    }
    const rpc = async (route, params = {}) => {
        const response = await fetch(route, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
        });
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.result;
    };

    let db;
    try {
        const sessionInfo = await rpc('/web/session/get_session_info');
        if (sessionInfo.username === login) {
            return;
        }
        db = sessionInfo.db;
    } catch {
        // Not logged in (or not an Odoo server)
    }

    // Avoid reload loops when the credentials are wrong
    const attemptKey = `odooDebugAutoLogin:${login}`;
    if (Date.now() - Number(sessionStorage.getItem(attemptKey)) < 10000) {
        return;
    }
    sessionStorage.setItem(attemptKey, Date.now());

    if (!db) {
        const dbs = await rpc('/web/database/list').catch(() => []);
        if (dbs.length !== 1) {
            console.warn(`[Odoo Debug] Auto login skipped: cannot pick a database among ${JSON.stringify(dbs)}`);
            return;
        }
        db = dbs[0];
    }
    const result = await rpc('/web/session/authenticate', { db, login, password: login }).catch((error) => {
        console.warn(`[Odoo Debug] Auto login as ${login} failed: ${error.message}`);
    });
    if (!result?.uid) {
        return;
    }
    if (location.pathname.startsWith('/web/login')) {
        location.assign(new URLSearchParams(location.search).get('redirect') || '/web');
    } else {
        location.reload();
    }
};

autoLogin();
