# ⚡ Quick Netlify Setup - 5 Minutes

## Current Status
✅ Git initialized  
✅ Code ready  
❌ Not on GitHub yet  
❌ Not connected to Netlify  

---

## Step 1: Create GitHub Repository

### Via GitHub Website:
1. Go to: https://github.com/new
2. Repository name: `world-cup-transport`
3. Description: "World Cup Transport - Rideshare Platform"
4. Choose: **Public** or **Private**
5. **DON'T** check "Initialize with README"
6. Click **"Create repository"**

### Copy the repository URL:
- It will look like: `https://github.com/YOUR_USERNAME/world-cup-transport.git`
- Save this URL!

---

## Step 2: Push Code to GitHub

Run these commands in PowerShell:

```powershell
cd C:\Users\koshi\apps-deve

# Add all files
git add .

# Commit
git commit -m "Initial commit - World Cup Transport"

# Add remote (REPLACE YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/world-cup-transport.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**If asked for credentials:**
- Use GitHub Personal Access Token (not password)
- Or use GitHub Desktop/GitHub CLI

---

## Step 3: Connect to Netlify

### In Netlify Dashboard:

1. **Go to:** https://app.netlify.com
2. **Click:** "Add new site" → "Import an existing project"
3. **Click:** "GitHub" button
4. **Authorize** Netlify (if first time)
5. **Select repository:** `world-cup-transport`

---

## Step 4: Configure Build Settings

In Netlify setup page:

```
Build command:    npm run build
Publish directory: dist
Base directory:   (leave empty)
```

---

## Step 5: Add Environment Variables

**Before clicking "Deploy":**

1. Click **"Show advanced"**
2. Click **"New variable"**
3. Add these 3 variables:

```
Name: VITE_SUPABASE_URL
Value: https://zademtsktedahwgehttw.supabase.co

Name: VITE_SUPABASE_ANON_KEY  
Value: (your anon key from Supabase)

Name: VITE_STRIPE_PUBLISHABLE_KEY
Value: pk_test_... (or pk_live_...)
```

**Where to find:**
- Supabase URL & Key: Supabase Dashboard → Settings → API
- Stripe Key: Stripe Dashboard → Developers → API Keys

---

## Step 6: Deploy!

1. Click **"Deploy site"**
2. Wait 2-3 minutes for build
3. Your site will be live at: `https://random-name.netlify.app`

---

## Step 7: Add Your Domain

1. **In Netlify:** Site settings → Domain management
2. **Click:** "Add custom domain"
3. **Enter:** `worldcuptransport.app`
4. **Follow DNS instructions** (add CNAME record)
5. **Wait** for DNS propagation (5 minutes to 24 hours)

---

## Step 8: Update Supabase

After domain is live:

1. **Supabase Dashboard** → Authentication → URL Configuration
2. **Site URL:** `https://worldcuptransport.app`
3. **Redirect URLs:** Add:
   ```
   https://worldcuptransport.app/**
   ```

---

## ✅ Done!

Your app is now:
- ✅ On GitHub
- ✅ Connected to Netlify
- ✅ Auto-deploying on every push
- ✅ Using your domain

---

## Future Updates

Just push to GitHub:

```powershell
git add .
git commit -m "Your update message"
git push origin main
```

Netlify automatically deploys! 🚀

---

## Need Help?

- **GitHub repo not found?** Check repository name matches
- **Build fails?** Check Netlify build logs
- **Environment variables?** Make sure all 3 are set
- **Domain not working?** Wait for DNS propagation


