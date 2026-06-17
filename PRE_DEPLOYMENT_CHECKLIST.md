# ✅ Pre-Deployment Checklist

## 1. Test Build Locally (Recommended)

**Why?** Catch build errors before deploying!

```powershell
cd C:\Users\koshi\apps-deve

# Test build
npm run build

# Check for errors
# If successful, you'll see:
# ✓ built in X seconds
# dist/ folder created
```

**Note:** `dist/` folder is in `.gitignore`, so it won't be committed to GitHub. That's correct! Netlify will build it.

---

## 2. Supabase Settings to Update

### ⚠️ IMPORTANT: Update AFTER Deployment

**Why wait?** You need the actual production URL first!

### What to Update (After Netlify Deployment):

#### A. Authentication → URL Configuration

1. **Go to:** Supabase Dashboard → Authentication → URL Configuration

2. **Site URL:**
   ```
   https://worldcuptransport.app
   ```
   (or your Netlify URL if domain not ready yet)

3. **Redirect URLs:** Add these:
   ```
   https://worldcuptransport.app/**
   https://worldcuptransport.app/rider
   https://worldcuptransport.app/driver
   https://worldcuptransport.app/admin
   https://worldcuptransport.app/*
   ```

#### B. API Settings → CORS

1. **Go to:** Supabase Dashboard → Settings → API

2. **CORS Origins:** Add:
   ```
   https://worldcuptransport.app
   ```

#### C. Edge Functions (If Needed)

- Edge Functions already work with any origin
- No changes needed unless you have specific CORS issues

---

## 3. Pre-Push Checklist

Before pushing to GitHub:

- [ ] ✅ Test build locally: `npm run build`
- [ ] ✅ Check `.gitignore` includes `dist/` (it does)
- [ ] ✅ Environment variables ready (for Netlify)
- [ ] ✅ No `.env` files committed (they're in `.gitignore`)

---

## 4. Post-Deployment Checklist

After Netlify deployment:

- [ ] ✅ Get production URL from Netlify
- [ ] ✅ Update Supabase Site URL
- [ ] ✅ Update Supabase Redirect URLs
- [ ] ✅ Update Supabase CORS origins
- [ ] ✅ Add domain to Netlify
- [ ] ✅ Update Supabase with final domain URL
- [ ] ✅ Test login/logout
- [ ] ✅ Test all features

---

## 5. Environment Variables for Netlify

**Before deploying, prepare these:**

```
VITE_SUPABASE_URL=https://zademtsktedahwgehttw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
```

**Where to find:**
- Supabase: Dashboard → Settings → API
- Stripe: Dashboard → Developers → API Keys

---

## 6. Deployment Order

### Correct Order:

1. ✅ **Test build locally** (catch errors early)
2. ✅ **Push to GitHub** (code is ready)
3. ✅ **Deploy to Netlify** (with environment variables)
4. ✅ **Get Netlify URL** (e.g., `https://random-name.netlify.app`)
5. ✅ **Update Supabase** (with Netlify URL first)
6. ✅ **Add domain** (in Netlify)
7. ✅ **Update Supabase again** (with final domain URL)

---

## Quick Commands

```powershell
# 1. Test build
npm run build

# 2. If successful, push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 3. Then deploy via Netlify dashboard
# 4. Then update Supabase settings
```

---

**Summary:**
- ✅ Test build locally first (good practice)
- ✅ `dist/` won't be committed (correct!)
- ✅ Update Supabase AFTER deployment (need URL first)


