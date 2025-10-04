#!/bin/bash

# EvilWorker AWS Elastic Beanstalk Deployment Script
echo "Starting EvilWorker AWS Elastic Beanstalk Deployment"
echo "=================================================="

# AWS Configuration
export AWS_ACCESS_KEY_ID="AKIA6IY35W4WKNMC43H6"
export AWS_SECRET_ACCESS_KEY="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"
export AWS_DEFAULT_REGION="us-east-1"

# Create application zip file
echo "Creating deployment package..."
zip -r evilworker-deployment.zip . -x "*.git*" "*.md" "deploy-*.sh" "*.yaml"

# Create Elastic Beanstalk application
echo "Creating Elastic Beanstalk application..."
aws elasticbeanstalk create-application \
    --application-name evilworker-proxy \
    --description "EvilWorker Proxy Server" || echo "Application may already exist"

# Create application version
echo "Creating application version..."
aws elasticbeanstalk create-application-version \
    --application-name evilworker-proxy \
    --version-label v1.0 \
    --source-bundle S3Bucket=elasticbeanstalk-us-east-1-980921726764,S3Key=evilworker-deployment.zip \
    --auto-create-application

# Upload to S3
echo "Uploading to S3..."
aws s3 cp evilworker-deployment.zip s3://elasticbeanstalk-us-east-1-980921726764/

# Create environment
echo "Creating Elastic Beanstalk environment..."
aws elasticbeanstalk create-environment \
    --application-name evilworker-proxy \
    --environment-name evilworker-prod \
    --version-label v1.0 \
    --solution-stack-name "64bit Amazon Linux 2023 v4.0.0 running Node.js 18" \
    --option-settings '[
        {
            "Namespace": "aws:autoscaling:launchconfiguration",
            "OptionName": "IamInstanceProfile",
            "Value": "aws-elasticbeanstalk-ec2-role"
        },
        {
            "Namespace": "aws:elasticbeanstalk:environment",
            "OptionName": "EnvironmentType",
            "Value": "SingleInstance"
        },
        {
            "Namespace": "aws:elasticbeanstalk:environment:process:default",
            "OptionName": "Port",
            "Value": "3000"
        }
    ]'

echo "Deployment initiated! Check AWS Console for status."
echo "The service will be available at: http://evilworker-prod.[region].elasticbeanstalk.com"