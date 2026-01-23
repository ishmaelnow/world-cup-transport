# 🔄 Quick Fix: Clear Cache & Restart

## Step 1: Stop Preview Server
Press `Ctrl + C` in the terminal where `npm run preview` is running

## Step 2: Clear Browser Cache

### Option A: Hard Refresh (Easiest)
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- This forces browser to reload everything fresh

### Option B: Clear via DevTools
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Option C: Clear Service Workers
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** (left sidebar)
4. Click **Unregister** for any existing workers
5. Go to **Storage** → Click **Clear site data**
6. Refresh page

## Step 3: Restart Preview Server
```bash
cd C:\Users\koshi\apps-deve
npm run preview
```

## Step 4: Verify
1. Open `http://localhost:4173` in browser
2. Open DevTools (F12) → Console
3. Should see: **NO CSP errors** ✅
4. Go to Application → Service Workers
5. Should see: `sw.js` registered and active ✅

---

**After this, PWA should work perfectly!** 🎉

