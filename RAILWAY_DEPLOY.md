# Deploy CashFlow Pro to Railway

## Prerequisites
- Railway account (you already have this)
- GitHub account
- Your code pushed to a GitHub repository

## Step 1: Push Code to GitHub

### Option A: Using GitHub Web Interface (Easiest)
1. Go to https://github.com/new
2. Create a new repository named `cashflow-pro`
3. Make it **Private** (recommended for personal finance app)
4. Don't initialize with README (we already have code)
5. Click "Create repository"

### Option B: Using Git Command Line
```bash
cd /home/ubuntu/cashflow-pro
git init
git add .
git commit -m "Initial commit - CashFlow Pro"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cashflow-pro.git
git push -u origin main
```

## Step 2: Deploy to Railway

1. Go to https://railway.app/dashboard
2. Click "+ New" button (top right)
3. Select "Deploy from GitHub repo"
4. Select your `cashflow-pro` repository
5. Railway will auto-detect the configuration

## Step 3: Add Persistent Volume for SQLite

1. In your Railway project, click on your service
2. Go to "Settings" tab
3. Scroll to "Volumes" section
4. Click "+ Add Volume"
5. Set:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (more than enough)
6. Click "Add"

## Step 4: Set Environment Variables

1. In your service, go to "Variables" tab
2. Add these variables:
   - `NODE_ENV` = `production`
   - `DATABASE_PATH` = `/app/data/cashflow.db`
   - `PORT` = `3000`

## Step 5: Update Database Path in Code

The SQLite database needs to use the persistent volume path.

Edit `server/sqliteDb.ts` line 7:
```typescript
// Change from:
const dbPath = path.join(process.cwd(), 'cashflow.db');

// To:
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'cashflow.db');
```

Commit and push this change - Railway will auto-deploy.

## Step 6: Get Your Live URL

1. In Railway, go to "Settings" tab
2. Scroll to "Networking" section
3. Click "Generate Domain"
4. Your app will be live at: `https://your-app-name.up.railway.app`

## Continuous Deployment

Every time you push to GitHub, Railway will automatically:
1. Pull the latest code
2. Build the app
3. Deploy without losing your database

## Cost Breakdown

- **Free Trial**: 29 days or $5 credit (whichever comes first)
- **After Trial**: ~$5/month
  - Includes: 500 hours of runtime, 1GB storage, unlimited bandwidth
  - App sleeps after 5 minutes of inactivity (wakes instantly)

## Backup Your Data

To backup your SQLite database:
1. In Railway, click on your service
2. Go to "Data" tab
3. Click on the volume
4. Download `cashflow.db` file

Set up automatic weekly backups if needed.
