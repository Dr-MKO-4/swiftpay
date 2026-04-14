# ☁️ AWS Deployment Guide for SwiftPay

Complete guide to deploy SwiftPay to AWS production infrastructure.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           Route 53 (DNS & Health Checks)            │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│      CloudFront (CDN) + WAF (Security)              │
│ - Cache static assets                               │
│ - DDoS protection                                   │
│ - SSL/TLS termination                              │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│      Load Balancer (ALB)                            │
│ - Distribute traffic                                │
│ - Health checks                                     │
│ - SSL/TLS certificates (ACM)                       │
└────────────┬────────────────────────────────────────┘
             │
    ┌────────┴────────┬─────────────┐
    │                 │             │
┌───▼─────┐  ┌───────▼──┐  ┌──────▼────┐
│ ECS Task│  │ ECS Task │  │ ECS Task  │
│Container│  │Container │  │Container  │
│:3000    │  │:3000     │  │:3000      │
└───┬─────┘  └───┬──────┘  └──────┬────┘
    │            │               │
    └────────┬───┴───────────────┘
             │
┌────────────▼────────────────────┐
│  RDS PostgreSQL (Multi-AZ)      │
│ - Automated backups             │
│ - Point-in-time recovery        │
│ - Read replicas                 │
└────────────┬────────────────────┘
             │
    ┌────────┘
    │
┌───▼─────────────────────────────┐
│  ElastiCache (Redis)            │
│ - Cluster mode enabled          │
│ - Automatic failover            │
│ - Backup & restore              │
└────────────────────────────────┘

Also includes:
- S3 (for file uploads)
- CloudWatch (logs & metrics)
- SNS (alerts)
- Secrets Manager (passwords)
```

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** (`aws --version`)
3. **Docker** and **Docker Compose** (for local testing)
4. **Terraform** (optional but recommended)
5. **Domain name** (via Route 53 or external registrar)

---

## Step 1: Setup AWS Infrastructure

### 1.1 Create IAM User for Deployment

```bash
# Create user with EC2, RDS, ECS, S3 permissions
aws iam create-user --user-name swiftpay-deployer

aws iam attach-user-policy \
  --user-name swiftpay-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-user-policy \
  --user-name swiftpay-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-user-policy \
  --user-name swiftpay-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-user-policy \
  --user-name swiftpay-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy \
  --user-name swiftpay-deployer \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Create access keys
aws iam create-access-key --user-name swiftpay-deployer
# Save output - you'll need AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
```

### 1.2 Create VPC and Networking

```bash
# Using AWS Console or CLI
export VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=swiftpay-vpc}]' \
  --query 'Vpc.VpcId' --output text)

echo "VPC ID: $VPC_ID"

# Create public subnets (for ALB)
aws ec2 create-subnet --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=swiftpay-public-1a}]'

aws ec2 create-subnet --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=swiftpay-public-1b}]'

# Create private subnets (for ECS & RDS)
aws ec2 create-subnet --vpc-id $VPC_ID \
  --cidr-block 10.0.10.0/24 --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=swiftpay-private-1a}]'

aws ec2 create-subnet --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=swiftpay-private-1b}]'
```

### 1.3 Create Security Groups

```bash
# ALB Security Group
aws ec2 create-security-group \
  --group-name swiftpay-alb-sg \
  --description "SwiftPay ALB Security Group" \
  --vpc-id $VPC_ID

# Allow HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-name swiftpay-alb-sg \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name swiftpay-alb-sg \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# ECS Security Group
aws ec2 create-security-group \
  --group-name swiftpay-ecs-sg \
  --description "SwiftPay ECS Security Group" \
  --vpc-id $VPC_ID

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
  --group-name swiftpay-ecs-sg \
  --protocol tcp --port 3000 \
  --source-group swiftpay-alb-sg

# RDS Security Group
aws ec2 create-security-group \
  --group-name swiftpay-rds-sg \
  --description "SwiftPay RDS Security Group" \
  --vpc-id $VPC_ID

# Allow PostgreSQL from ECS
aws ec2 authorize-security-group-ingress \
  --group-name swiftpay-rds-sg \
  --protocol tcp --port 5432 \
  --source-group swiftpay-ecs-sg

# ElastiCache Security Group
aws ec2 create-security-group \
  --group-name swiftpay-redis-sg \
  --description "SwiftPay Redis Security Group" \
  --vpc-id $VPC_ID

# Allow Redis from ECS
aws ec2 authorize-security-group-ingress \
  --group-name swiftpay-redis-sg \
  --protocol tcp --port 6379 \
  --source-group swiftpay-ecs-sg
```

---

## Step 2: Create Database (RDS)

### 2.1 PostgreSQL Instance

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name swiftpay-db-subnet \
  --db-subnet-group-description "SwiftPay Database Subnet" \
  --subnet-ids subnet-xxx subnet-yyy

# Create RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier swiftpay-postgres \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --master-username postgres \
  --master-user-password '$(openssl rand -base64 32)' \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --db-subnet-group-name swiftpay-db-subnet \
  --vpc-security-group-ids sg-xxx \
  --multi-az \
  --backup-retention-period 30 \
  --copy-tags-to-snapshot \
  --enable-cloudwatch-logs-exports postgresql \
  --enable-iam-database-authentication \
  --no-publicly-accessible

# Wait for instance to be available (15-20 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier swiftpay-postgres

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier swiftpay-postgres \
  --query 'DBInstances[0].Endpoint.Address'
```

### 2.2 Store Database Password in Secrets Manager

```bash
aws secretsmanager create-secret \
  --name swiftpay/postgres/password \
  --description "SwiftPay PostgreSQL Master Password" \
  --secret-string "$(openssl rand -base64 32)"

# Retrieve for later use
aws secretsmanager get-secret-value \
  --secret-id swiftpay/postgres/password
```

### 2.3 Initialize Database

```bash
# Connect to RDS instance
psql -h swiftpay-postgres.xxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d postgres \
     -f migrations_phase2.sql

# Verify tables were created
psql -h swiftpay-postgres.xxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d swiftpay \
     -c "\dt"
```

---

## Step 3: Cache Layer (ElastiCache Redis)

### 3.1 Create Redis Cluster

```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name swiftpay-redis-subnet \
  --cache-subnet-group-description "SwiftPay Redis Subnet" \
  --subnet-ids subnet-xxx subnet-yyy

# Create Redis cluster
aws elasticache create-replication-group \
  --replication-group-description "SwiftPay Redis Cache" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t3.medium \
  --replication-group-id swiftpay-redis \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --cache-subnet-group-name swiftpay-redis-subnet \
  --security-group-ids sg-xxx \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "$(openssl rand -base64 32)" \
  --snapshot-retention-limit 5

# Get Redis endpoint
aws elasticache describe-replication-groups \
  --replication-group-id swiftpay-redis \
  --query 'ReplicationGroups[0].PrimaryEndpoint'
```

### 3.2 Store Redis Password

```bash
aws secretsmanager create-secret \
  --name swiftpay/redis/password \
  --description "SwiftPay Redis Auth Token" \
  --secret-string "$(openssl rand -base64 32)"
```

---

## Step 4: Container Registry (ECR)

### 4.1 Create ECR Repositories

```bash
# Backend repository
aws ecr create-repository \
  --repository-name swiftpay-backend \
  --region us-east-1 \
  --encryption-configuration encryptionType=AES256

# Frontend repository
aws ecr create-repository \
  --repository-name swiftpay-frontend \
  --region us-east-1 \
  --encryption-configuration encryptionType=AES256

# Get login credentials
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

### 4.2 Push Docker Images

```bash
# Tag and push backend
docker build -t swiftpay-backend:latest ./backend
docker tag swiftpay-backend:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/swiftpay-backend:latest
docker push \
  123456789.dkr.ecr.us-east-1.amazonaws.com/swiftpay-backend:latest

# Tag and push frontend
docker build -t swiftpay-frontend:latest ./swiftpay
docker tag swiftpay-frontend:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/swiftpay-frontend:latest
docker push \
  123456789.dkr.ecr.us-east-1.amazonaws.com/swiftpay-frontend:latest
```

---

## Step 5: Container Orchestration (ECS)

### 5.1 Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster \
  --cluster-name swiftpay-cluster \
  --cluster-settings name=containerInsights,value=enabled \
  --tags key=Environment,value=production key=Application,value=swiftpay

# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/swiftpay-backend
aws logs put-retention-policy \
  --log-group-name /ecs/swiftpay-backend \
  --retention-in-days 30
```

### 5.2 Create Task Definition

```bash
# Create task definition JSON
cat > task-definition.json << 'EOF'
{
  "family": "swiftpay-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "swiftpay-backend",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/swiftpay-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DB_HOST",
          "value": "swiftpay-postgres.xxxxx.rds.amazonaws.com"
        },
        {
          "name": "DB_NAME",
          "value": "swiftpay"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://swiftpay-redis.xxxxx.cache.amazonaws.com:6379"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:swiftpay/postgres/password"
        },
        {
          "name": "DB_USER",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:swiftpay/postgres/user"
        },
        {
          "name": "REDIS_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:swiftpay/redis/password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:swiftpay/jwt/secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/swiftpay-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

### 5.3 Create ECS Service

```bash
# Create load balancer target group
aws elbv2 create-target-group \
  --name swiftpay-backend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create ECS service
aws ecs create-service \
  --cluster swiftpay-cluster \
  --service-name swiftpay-backend-service \
  --task-definition swiftpay-backend:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/swiftpay-backend-tg/xxx,containerName=swiftpay-backend,containerPort=3000 \
  --enable-ecs-managed-tags \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100"
```

---

## Step 6: Load Balancer & DNS

### 6.1 Create Application Load Balancer

```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name swiftpay-alb \
  --subnets subnet-public-1a subnet-public-1b \
  --security-groups sg-alb \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB ARN: $ALB_ARN"

# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName'
```

### 6.2 Create Listeners

```bash
# HTTP listener (redirect to HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

# HTTPS listener (requires ACM certificate)
ACM_CERT_ARN="arn:aws:acm:us-east-1:123456789:certificate/xxx"

aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$ACM_CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/swiftpay-backend-tg/xxx
```

### 6.3 Setup Route 53

```bash
# Create hosted zone
ZONE_ID=$(aws route53 create-hosted-zone \
  --name swiftpay.com \
  --caller-reference $(date +%s) \
  --query 'HostedZone.Id' \
  --output text)

echo "Zone ID: $ZONE_ID"

# Create A record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.swiftpay.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "swiftpay-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

---

## Step 7: Monitoring & Logging

### 7.1 CloudWatch Alarms

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name swiftpay-high-cpu \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:swiftpay-alerts

# Memory utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name swiftpay-high-memory \
  --alarm-description "Alert when Memory > 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:swiftpay-alerts
```

### 7.2 Structured Logging

Update backend logger to send to CloudWatch:

```javascript
// backend/src/config/logger.js
const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');

module.exports = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    // CloudWatch
    new WinstonCloudWatch({
      logGroupName: '/ecs/swiftpay-backend',
      logStreamName: `${process.env.NODE_ENV}-${process.hostname()}`,
      awsRegion: 'us-east-1',
      messageFormatter: ({ level, message, meta }) => 
        `[${level}] ${message} ${JSON.stringify(meta)}`,
    }),
    // Console for development
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

---

## Step 8: S3 Bucket for Uploads

### 8.1 Create S3 Bucket

```bash
# Create bucket
aws s3api create-bucket \
  --bucket swiftpay-uploads \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket swiftpay-uploads \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket swiftpay-uploads \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket swiftpay-uploads \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 8.2 Configure CORS

```bash
aws s3api put-bucket-cors \
  --bucket swiftpay-uploads \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["https://swiftpay.com", "https://api.swiftpay.com"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

---

## Step 9: SSL/TLS Certificate

### 9.1 Request ACM Certificate

```bash
# Request certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name swiftpay.com \
  --subject-alternative-names "*.swiftpay.com" \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get DNS validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions'

# Add DNS records to Route 53 for validation
# Then wait for status to be ISSUED
aws acm wait certificate-validated --certificate-arn $CERT_ARN
```

---

## Step 10: Backup & Disaster Recovery

### 10.1 RDS Automated Backups

```bash
# Update RDS backup settings
aws rds modify-db-instance \
  --db-instance-identifier swiftpay-postgres \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately

# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier swiftpay-postgres \
  --db-snapshot-identifier swiftpay-postgres-snapshot-$(date +%Y%m%d)
```

### 10.2 Database Export to S3

```bash
# Export database to S3
aws rds start-export-task \
  --export-task-identifier swiftpay-export-$(date +%Y%m%d) \
  --source-arn arn:aws:rds:us-east-1:123456789:db:swiftpay-postgres \
  --s3-bucket-name swiftpay-backups \
  --s3-prefix database-exports/ \
  --iam-role-arn arn:aws:iam::123456789:role/rds-s3-export-role
```

---

## Step 11: Deployment Pipeline

### 11.1 CodePipeline

```bash
# Create S3 bucket for pipeline artifacts
aws s3api create-bucket \
  --bucket swiftpay-pipeline-artifacts

# Create CodeBuild project
aws codebuild create-project \
  --name swiftpay-build \
  --source type=GITHUB,location=https://github.com/username/swiftpay.git \
  --artifacts type=S3,location=swiftpay-pipeline-artifacts \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:5.0,computeType=BUILD_GENERAL1_LARGE \
  --service-role arn:aws:iam::123456789:role/codebuild-role
```

---

## Step 12: Monitoring Dashboard

### 12.1 Create Custom Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name SwiftPay-Production \
  --dashboard-body file://dashboard-config.json
```

**dashboard-config.json**:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ECS", "CPUUtilization", { "stat": "Average" } ],
          [ ".", "MemoryUtilization", { "stat": "Average" } ],
          [ "AWS/ApplicationELB", "TargetResponseTime" ],
          [ ".", "RequestCount" ],
          [ "AWS/RDS", "DatabaseConnections" ],
          [ ".", "CPUUtilization" ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "SwiftPay Metrics"
      }
    }
  ]
}
```

---

## Step 13: Cost Optimization

### 13.1 Reserved Instances

```bash
# Purchase Reserved Instances for long-term savings
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id "12345678-1234-1234-1234-123456789012" \
  --instance-count 3
```

### 13.2 Cost Monitoring

```bash
# Set up billing alert
aws budgets create-budget \
  --account-id 123456789 \
  --budget BudgetName=SwiftPay-Monthly,BudgetLimit='{Amount=5000,Unit=USD}',TimeUnit=MONTHLY,BudgetType=COST \
  --notifications-with-subscribers file://notifications.json
```

---

## 🧪 Testing Deployment

### Before Going Live

```bash
# 1. Test application health
curl https://api.swiftpay.com/health

# 2. Run database migrations
aws ecs execute-command \
  --cluster swiftpay-cluster \
  --task <task-id> \
  --container swiftpay-backend \
  --interactive \
  --command "npm run migrate"

# 3. Test API endpoints
curl -H "Authorization: Bearer $TOKEN" \
  https://api.swiftpay.com/api/wallets

# 4. Monitor CloudWatch logs
aws logs tail /ecs/swiftpay-backend --follow

# 5. Check ECS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=swiftpay-backend-service \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 🔒 Security Checklist

- [ ] VPC configured with public/private subnets
- [ ] Security groups restrict traffic appropriately
- [ ] Secrets stored in AWS Secrets Manager
- [ ] RDS encrypted at rest
- [ ] Transit encryption enabled for Redis
- [ ] S3 bucket policies restrict access
- [ ] CloudTrail logging enabled
- [ ] VPC Flow Logs enabled
- [ ] WAF rules configured
- [ ] SSL/TLS certificates valid
- [ ] Regular security groups audit
- [ ] MFA enabled for IAM users

---

## 📊 Performance Targets (Post-Deployment)

```
API Response Time (p95):    < 200ms  ✓
Database Query Time (p95):  < 100ms  ✓
Cache Hit Rate:             > 80%    ✓
Error Rate:                 < 0.1%   ✓
Uptime:                     99.9%    ✓
Scale:                      10,000+ concurrent users
```

---

## 🚨 Troubleshooting

### Services not starting

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster swiftpay-cluster \
  --services swiftpay-backend-service

# View task logs
aws logs tail /ecs/swiftpay-backend --follow --since 5m

# Check task events
aws ecs describe-tasks \
  --cluster swiftpay-cluster \
  --tasks <task-arn>
```

### Database connection issues

```bash
# Test RDS connectivity
aws rds describe-db-instances \
  --db-instance-identifier swiftpay-postgres \
  --query 'DBInstances[0].Endpoint'

# Connect to test
psql -h <rds-endpoint> -U postgres -d swiftpay
```

### High latency

```bash
# Check ALB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum

# Scale up ECS service
aws ecs update-service \
  --cluster swiftpay-cluster \
  --service swiftpay-backend-service \
  --desired-count 5
```

---

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [RDS PostgreSQL Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [ElastiCache Redis](https://docs.aws.amazon.com/elasticache/latest/userguide/CacheClusters.html)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [Route 53 DNS](https://docs.aws.amazon.com/route53/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)

---

## ✅ Deployment Checklist

- [ ] AWS Account setup with IAM user
- [ ] VPC and subnets created
- [ ] Security groups configured
- [ ] RDS PostgreSQL instance running
- [ ] ElastiCache Redis cluster running
- [ ] ECR repositories created and images pushed
- [ ] ECS cluster and service deployed
- [ ] Application Load Balancer created
- [ ] Route 53 DNS records configured
- [ ] ACM certificate issued and validated
- [ ] CloudWatch alarms set up
- [ ] S3 buckets created for uploads and backups
- [ ] Database backups automated
- [ ] CloudTrail and VPC Flow Logs enabled
- [ ] Load testing completed
- [ ] Monitoring dashboard created
- [ ] Incident response plan documented
- [ ] Cost monitoring configured
- [ ] Team training completed

---

**Status**: Ready for AWS Deployment

**Estimated Time**: 2-4 hours for initial setup | 1-2 hours weekly maintenance

**Cost Estimate (monthly)**:
- RDS t3.medium: ~$50
- ElastiCache cache.t3.medium x3: ~$120
- ECS Fargate (3 tasks): ~$150
- ALB: ~$20
- Data transfer: ~$10-50
- **Total**: ~$350-400/month
