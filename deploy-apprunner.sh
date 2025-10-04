#!/bin/bash

# EvilWorker AWS App Runner Deployment Script
echo "Starting EvilWorker AWS App Runner Deployment"
echo "============================================="

# AWS Configuration
export AWS_ACCESS_KEY_ID="AKIA6IY35W4WKNMC43H6"
export AWS_SECRET_ACCESS_KEY="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"
export AWS_DEFAULT_REGION="us-east-1"

# Create ECR repository for the container image
echo "Creating ECR repository..."
aws ecr create-repository --repository-name evilworker-proxy --region us-east-1 || echo "Repository may already exist"

# Get ECR login token
echo "Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 980921726764.dkr.ecr.us-east-1.amazonaws.com

# Build and tag the Docker image
echo "Building Docker image..."
docker build -t evilworker-proxy .

# Tag the image for ECR
docker tag evilworker-proxy:latest 980921726764.dkr.ecr.us-east-1.amazonaws.com/evilworker-proxy:latest

# Push the image to ECR
echo "Pushing image to ECR..."
docker push 980921726764.dkr.ecr.us-east-1.amazonaws.com/evilworker-proxy:latest

# Create App Runner service
echo "Creating App Runner service..."
aws apprunner create-service \
    --service-name evilworker-proxy \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "980921726764.dkr.ecr.us-east-1.amazonaws.com/evilworker-proxy:latest",
            "ImageConfiguration": {
                "Port": "3000",
                "RuntimeEnvironmentVariables": {
                    "PORT": "3000"
                }
            },
            "ImageRepositoryType": "ECR"
        },
        "AutoDeploymentsEnabled": true
    }' \
    --instance-configuration '{
        "Cpu": "0.25 vCPU",
        "Memory": "0.5 GB"
    }' \
    --region us-east-1

echo "Deployment initiated! Check AWS Console for status."
echo "The service will be available at: https://[service-id].us-east-1.awsapprunner.com"