# 🔐 GitHub Actions Setup Guide

This guide helps you configure CI/CD secrets and workflows for SwiftPay deployment.

## Step 1: Create GitHub Repository Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

### Required Secrets

#### General Secrets (All workflows)
```
DOCKER_REGISTRY_PASSWORD    # GitHub Personal Access Token (read:packages, write:packages)
DOCKER_REGISTRY_USERNAME    # github
SNYK_TOKEN                  # Snyk API token (from https://snyk.io)
EAS_TOKEN                   # Expo token (from EAS CLI)
```

#### Staging Deployment
```
STAGING_HOST                # IP or domain (e.g., 1.2.3.4 or staging.swiftpay.com)
STAGING_USER                # SSH username (e.g., ubuntu, ec2-user)
STAGING_DEPLOY_KEY          # SSH private key (for deployment)
STAGING_DB_PASSWORD         # Database password for staging
STAGING_JWT_SECRET          # JWT secret for staging
STAGING_REDIS_PASSWORD      # Redis password for staging
```

#### Production Deployment
```
PROD_HOST                   # IP or domain (e.g., api.swiftpay.com)
PROD_USER                   # SSH username
PROD_DEPLOY_KEY             # SSH private key (for deployment)
PROD_DB_PASSWORD            # Database password for production
PROD_JWT_SECRET             # JWT secret for production
PROD_REDIS_PASSWORD         # Redis password for production
```

#### Firebase (Notifications)
```
FIREBASE_PROJECT_ID         # Firebase project ID
FIREBASE_PRIVATE_KEY        # Firebase private key (from service account JSON)
FIREBASE_CLIENT_EMAIL       # Firebase client email
```

#### Email (Notifications)
```
GMAIL_USER                  # Gmail address for sending
GMAIL_PASSWORD              # Gmail app password (not main password)
```

#### API Keys
```
OPEN_EXCHANGE_API_KEY       # OpenExchangeRates API key
TWILIO_ACCOUNT_SID          # Twilio SID (if using SMS)
TWILIO_AUTH_TOKEN           # Twilio auth token
```

---

## Step 2: Create SSH Deploy Keys

### On Your Deployment Server

```bash
# Create ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate key pair (if not exists)
ssh-keygen -t ed25519 -f ~/.ssh/swiftpay_deploy -N ""
# or for RSA (if ed25519 not supported)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/swiftpay_deploy -N ""

# Add public key to authorized_keys
cat ~/.ssh/swiftpay_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Get private key content
cat ~/.ssh/swiftpay_deploy
```

### In GitHub Actions

1. Copy **entire private key** (including `-----BEGIN...` and `-----END...`)
2. Create new secret `STAGING_DEPLOY_KEY` (or `PROD_DEPLOY_KEY`)
3. Paste the private key content
4. Save

---

## Step 3: Configure Deploy Script

Create `scripts/deploy.sh` on your deployment server:

```bash
#!/bin/bash
set -e

# Based on branch passed as argument
TARGET_ENV=$1
IMAGE_TAG=$2

echo "Deploying $TARGET_ENV with tag $IMAGE_TAG..."

# Login to registry
echo $DOCKER_REGISTRY_PASSWORD | docker login ghcr.io -u $DOCKER_REGISTRY_USERNAME --password-stdin

# Pull latest images
docker-compose -f /srv/swiftpay/docker-compose.yml pull

# Start services
docker-compose -f /srv/swiftpay/docker-compose.yml down
docker-compose -f /srv/swiftpay/docker-compose.yml up -d

# Health check
sleep 5
curl http://localhost:3000/health || exit 1
echo "✓ Deployment successful"
```

---

## Step 4: Environment Files for Each Environment

### `.env.staging`
```bash
# Staging environment
NODE_ENV=staging
LOG_LEVEL=info

# Database
DB_HOST=postgres
DB_NAME=swiftpay_staging
DB_USER=postgres
DB_PASSWORD=<STAGING_DB_PASSWORD>

# Redis
REDIS_URL=redis://:${STAGING_REDIS_PASSWORD}@redis:6379

# JWT
JWT_SECRET=<STAGING_JWT_SECRET>
JWT_EXPIRY=24h

# API
API_BASE_URL=https://staging-api.swiftpay.com
WEB_BASE_URL=https://staging.swiftpay.com

# Firebase
FIREBASE_PROJECT_ID=<your-staging-project>
FIREBASE_PRIVATE_KEY=<staging-private-key>
FIREBASE_CLIENT_EMAIL=<staging-email>

# Email
GMAIL_USER=<GMAIL_USER>
GMAIL_PASSWORD=<GMAIL_PASSWORD>

# API Keys
OPEN_EXCHANGE_API_KEY=<OPEN_EXCHANGE_API_KEY>
TWILIO_ACCOUNT_SID=<STAGING-SID>
TWILIO_AUTH_TOKEN=<STAGING-TOKEN>
```

### `.env.production`
```bash
# Production environment
NODE_ENV=production
LOG_LEVEL=warn

# Database
DB_HOST=postgres
DB_NAME=swiftpay_prod
DB_USER=postgres
DB_PASSWORD=<PROD_DB_PASSWORD>

# Redis
REDIS_URL=redis://:${PROD_REDIS_PASSWORD}@redis:6379

# JWT
JWT_SECRET=<PROD_JWT_SECRET>
JWT_EXPIRY=24h

# API
API_BASE_URL=https://api.swiftpay.com
WEB_BASE_URL=https://swiftpay.com

# Firebase
FIREBASE_PROJECT_ID=<your-prod-project>
FIREBASE_PRIVATE_KEY=<prod-private-key>
FIREBASE_CLIENT_EMAIL=<prod-email>

# Email
GMAIL_USER=<GMAIL_USER>
GMAIL_PASSWORD=<GMAIL_PASSWORD>

# API Keys
OPEN_EXCHANGE_API_KEY=<OPEN_EXCHANGE_API_KEY>
TWILIO_ACCOUNT_SID=<PROD-SID>
TWILIO_AUTH_TOKEN=<PROD-TOKEN>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
```

---

## Step 5: Enable Branch Protection Rules

Go to **Settings** → **Branches** → **Branch protection rules** → **Add rule**

Configure main branch:
- ✅ Require pull request reviews before merging (1 review)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - Select: `lint`, `test`, `security`, `build`
- ✅ Require branches to be up to date before merging
- ✅ Include administrators

---

## Step 6: Docker Registry Configuration

### Create GitHub Container Registry Token

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Classic tokens**
2. **Generate new token (classic)**
3. Select scopes:
   - ✅ `read:packages`
   - ✅ `write:packages`
   - ✅ `delete:packages`
4. Copy token → Create secret `DOCKER_REGISTRY_PASSWORD`

### Alternative: Use GitHub Actions Token

The workflows already use `${{ secrets.GITHUB_TOKEN }}` which is auto-generated.

---

## Step 7: Monitoring & Notifications

### Slack Integration (Optional)

Create `.github/workflows/slack-notify.yml`:

```yaml
name: Slack Notifications

on:
  workflow_run:
    workflows: [Backend CI/CD]
    types: [completed]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Slack Notify
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author
        if: always()
```

Then add `SLACK_WEBHOOK` secret with your Slack incoming webhook URL.

---

## Step 8: First Deployment

### Verify Secrets are Set

```bash
# In GitHub CLI (if installed)
gh secret list --repo YOUR_USERNAME/swiftpay
```

### Manual Test Deployment

1. Create test branch: `git checkout -b test/ci-cd`
2. Make small change to backend: `echo "// test" >> backend/src/server.js`
3. Commit: `git commit -m "test: CI/CD workflow"`
4. Push: `git push origin test/ci-cd`
5. Watch GitHub Actions tab for workflow execution
6. Check logs for any failures
7. If successful, create PR and merge

### Full Deployment Flow

```
1. Push to main branch
   ↓
2. CI/CD workflows trigger
   ↓
3. Backend: Lint → Test → Security → Build Docker image
   ↓
4. Frontend: Lint → Type-check → Test → Build (if needed)
   ↓
5. Security: Dependency scan, Container scan, Code quality, Secrets scan
   ↓
6. If all pass → Deploy to staging via SSH
   ↓
7. Remove workflow file job restrictions (uncomment deploy)
   ↓
8. Manual approval → Deploy to production
```

---

## Step 9: Troubleshooting

### SSH Key Issues

**Error: "Permission denied (publickey)"**
```bash
# Check SSH key format
ssh -i ~/.ssh/swiftpay_deploy -T git@github.com

# Verify on server
ssh -v -i ~/.ssh/swiftpay_deploy user@host
# Check permissions
ls -la ~/.ssh/
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Docker Registry Issues

**Error: "denied: permission_denied"**
```bash
# Verify token has right scopes
# Token should have: read:packages, write:packages

# Test registry login
echo $TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Workflow Not Running

**Check**:
1. Workflow file syntax: `yamllint .github/workflows/*.yml`
2. Secrets exist: GitHub Repo Settings → Secrets
3. Commit is to tracked branch (main/develop)
4. File changes match paths filter

---

## Step 10: Production Checklist

Before deploying to production:

- [ ] All secrets configured in GitHub
- [ ] SSH keys deployed on production server
- [ ] PostgreSQL backup strategy in place
- [ ] Redis persistence enabled
- [ ] SSL certificates ready (Let's Encrypt)
- [ ] Nginx configuration tested
- [ ] DNS records pointing to production IP
- [ ] Monitoring alerts configured
- [ ] Support email/Slack channel set up
- [ ] Rollback plan documented

---

## Useful Commands

### View Workflow Logs
```bash
# Using GitHub CLI
gh run list --repo YOUR_USERNAME/swiftpay
gh run view RUN_ID --log

# Or view in GitHub UI: Actions tab
```

### Manually Trigger Workflow
```bash
gh workflow run backend.yml --repo YOUR_USERNAME/swiftpay
```

### Get Latest Docker Image
```bash
docker pull ghcr.io/YOUR_USERNAME/swiftpay-backend:latest
docker pull ghcr.io/YOUR_USERNAME/swiftpay-frontend:latest
```

### SSH to Deployment Server
```bash
ssh -i ~/.ssh/swiftpay_deploy user@staging.swiftpay.com
ssh -i ~/.ssh/swiftpay_deploy user@api.swiftpay.com
```

---

## Security Best Practices

✅ **Do**:
- Rotate secrets every 90 days
- Use strong, unique passwords (32+ chars)
- Store deploy keys with restricted permissions
- Review branch protection rules monthly
- Monitor action logs for suspicious activity
- Use GitHub's security features (code scanning, secret scanning)

❌ **Don't**:
- Commit secrets to repository
- Share deploy keys between environments
- Use same password for staging and production
- Store backup credentials in default locations
- Disable branch protection for "speed"
- Run workflows from untrusted sources

---

## Next Steps

1. **Set up all secrets** in GitHub Actions
2. **Configure deploy script** on servers
3. **Enable branch protection** on main
4. **Run test deployment** to verify
5. **Monitor first staging deployment**
6. **Plan production rollout**
7. **Document runbooks** for common operations

For more details, see:
- [`DOCKER_GUIDE.md`](../DOCKER_GUIDE.md) - Docker deployment
- [`README_PHASE3.md`](../README_PHASE3.md) - Project overview
- [GitHub Actions Docs](https://docs.github.com/en/actions)

