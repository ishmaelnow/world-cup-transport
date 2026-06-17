# 🚀 Netlify Deployment Guide - Connect via GitHub

## Step 1: Initialize Git (If Not Already Done)

```bash
cd C:\Users\koshi\apps-deve

# Check if git is initialized
git status

# If not initialized, run:
git init
```

---

## Step 2: Create .gitignore (If Missing)

Make sure `.gitignore` exists with:

```
node_modules/
dist/
.env
.env.local
.env.production
.DS_Store
*.log
```

---

## Step 3: Create GitHub Repository

### Option A: Via GitHub Website
1. Go to https://github.com/new
2. Repository name: `world-cup-transport` (or your choice)
3. Description: "World Cup Transport - Rideshare Platform"
4. Choose: **Public** or **Private**
5. **DON'T** initialize with README (you already have files)
6. Click **Create repository**

### Option B: Via GitHub CLI
```bash
gh repo create world-cup-transport --public --source=. --remote=origin --push
```

---

## Step 4: Connect Local Repo to GitHub

```bash
cd C:\Users\koshi\apps-deve

# Add all files
git add .

# Commit
git commit -m "Initial commit - World Cup Transport"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/world-cup-transport.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 5: Connect to Netlify

### Via Netlify Dashboard:

1. **Go to Netlify Dashboard**
   - https://app.netlify.com
   - Click **"Add new site"** → **"Import an existing project"**

2. **Connect to GitHub**
   - Click **"GitHub"** button
   - Authorize Netlify (if first time)
   - Select repository: `world-cup-transport`

3. **Configure Build Settings**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Base directory:** (leave empty, or `./` if needed)

4. **Environment Variables**
   - Click **"Show advanced"** → **"New variable"**
   - Add these variables:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_... for testing)
     ```

5. **Deploy!**
   - Click **"Deploy site"**
   - Wait for build to complete (~2-3 minutes)

---

## Step 6: Configure Domain

1. **In Netlify Dashboard:**
   - Go to your site → **Site settings** → **Domain management**
   - Click **"Add custom domain"**
   - Enter: `worldcuptransport.app`

2. **DNS Configuration:**
   - Netlify will show DNS records to add
   - Go to your domain registrar (where you bought the domain)
   - Add DNS records as shown:
     - Usually: CNAME `worldcuptransport.app` → `your-site.netlify.app`
     - Or: A record → Netlify IP addresses

3. **SSL Certificate:**
   - Netlify automatically provisions SSL (HTTPS)
   - Wait 5-10 minutes for SSL to activate
   - Check: Should show "HTTPS" badge

---

## Step 7: Update Supabase Settings

After deployment, update Supabase:

1. **Go to Supabase Dashboard**
   - Authentication → URL Configuration
   - **Site URL:** `https://worldcuptransport.app`
   - **Redirect URLs:** Add:
     ```
     https://worldcuptransport.app/**
     https://worldcuptransport.app/rider
     https://worldcuptransport.app/driver
     https://worldcuptransport.app/admin
     ```

2. **API Settings**
   - Add `https://worldcuptransport.app` to CORS origins

---

## Step 8: Update Stripe Settings

1. **Stripe Dashboard** → Webhooks
2. Update webhook URLs to use your domain
3. Or keep using Supabase Edge Function URLs (they work fine)

---

## Step 9: Test Deployment

1. **Visit:** `https://worldcuptransport.app`
2. **Test:**
   - ✅ App loads
   - ✅ Login works
   - ✅ PWA installable
   - ✅ All features work

---

## Continuous Deployment

**Every time you push to GitHub:**
- Netlify automatically rebuilds and deploys
- No manual steps needed!

**Workflow:**
```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Netlify automatically deploys! 🚀
```

---

## Netlify Build Settings Summary

```
Repository: world-cup-transport
Branch: main
Build command: npm run build
Publish directory: dist
Base directory: (empty)
```

---

## Environment Variables Checklist

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY`

**Important:** Never commit `.env` files to GitHub!

---

## Troubleshooting

### Build Fails?
- Check Netlify build logs
- Verify `package.json` has all dependencies
- Check environment variables are set

### Domain Not Working?
- Wait 24-48 hours for DNS propagation
- Check DNS records are correct
- Verify SSL certificate is active

### App Not Loading?
- Check environment variables
- Verify Supabase redirect URLs
- Check browser console for errors

---

## Quick Commands Reference

```bash
# Initialize git (if needed)
git init

# Add files
git add .

# Commit
git commit -m "Your message"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/world-cup-transport.git

# Push
git push -u origin main

# Future updates
git add .
git commit -m "Update message"
git push origin main
```

---

**Ready to deploy! Follow steps 1-9 above.** 🚀


