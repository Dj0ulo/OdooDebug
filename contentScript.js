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
