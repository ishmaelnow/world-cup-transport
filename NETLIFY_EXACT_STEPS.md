# 🎯 Netlify - Exact Steps

## Step-by-Step Netlify Interface

### 1. Go to Netlify Dashboard
- URL: https://app.netlify.com
- Login to your account

### 2. Click "Add new site"
- **Button location:** Top right corner (or main dashboard)
- **Button text:** "Add new site" (or "+ New site")

### 3. Select "Import an existing project"
- After clicking "Add new site", you'll see options:
  - ✅ **"Import an existing project"** ← Click this!
  - Deploy manually
  - Start from a template

### 4. Connect to Git Provider
- You'll see Git provider options:
  - ✅ **GitHub** ← Click this!
  - GitLab
  - Bitbucket
  - Azure DevOps

### 5. Authorize Netlify (if first time)
- Click "Authorize Netlify" or "Authorize Netlify on GitHub"
- Grant permissions
- You'll be redirected back

### 6. Select Repository
- Search for: `world-cup-transport`
- Or browse your repositories
- Click on the repository

### 7. Configure Build Settings
- **Branch to deploy:** `main` (or `master`)
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Base directory:** (leave empty)

### 8. Environment Variables
- Click **"Show advanced"** or **"Environment variables"**
- Click **"New variable"**
- Add each variable:
  ```
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  VITE_STRIPE_PUBLISHABLE_KEY
  ```

### 9. Deploy!
- Click **"Deploy site"** button
- Wait 2-3 minutes
- Your site will be live!

---

## Visual Guide

```
Netlify Dashboard
  └─ Click: "Add new site" (top right)
      └─ Click: "Import an existing project"
          └─ Click: "GitHub"
              └─ Authorize (if needed)
                  └─ Select: "world-cup-transport"
                      └─ Configure build settings
                          └─ Add environment variables
                              └─ Click: "Deploy site"
```

---

## Quick Answer

**It's "Add new site"** → then "Import an existing project" → then "GitHub"

---

## After Deployment

Your site will be at:
- `https://random-name-123.netlify.app` (temporary)
- Then add custom domain: `worldcuptransport.app`

---

**Ready to deploy!** 🚀


