# Clear Browser Cache & Service Worker - CRITICAL

## The Problem

The PWA service worker is caching old JavaScript code, preventing updates from working.

## Solution: Clear Everything

### Option 1: Hard Refresh (Try This First)

1. **Chrome/Edge:**
   - Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - OR Press `Ctrl + F5`

2. **Firefox:**
   - Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - OR Press `Ctrl + F5`

### Option 2: Clear Service Worker (If Hard Refresh Doesn't Work)

1. **Open Developer Tools** (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Service Workers** in the left sidebar
4. Find your site's service worker
5. Click **Unregister** or **Unregister and Reload**
6. Close and reopen the browser

### Option 3: Clear All Site Data (Nuclear Option)

1. **Open Developer Tools** (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear storage** or **Storage** in the left sidebar
4. Check **All boxes** (especially "Cache storage" and "Service workers")
5. Click **Clear site data**
6. Close and reopen the browser
7. Go to your site again

### Option 4: Incognito/Private Window

1. Open a **new incognito/private window**
2. Go to `worldcuptransport.app`
3. Test there (no cache, fresh load)

### Option 5: Different Browser

1. Try a different browser (if using Chrome, try Firefox or Edge)
2. This ensures no cached service worker

## After Clearing Cache

1. **Hard refresh** the page (`Ctrl+Shift+R`)
2. **Open console** (`F12` → Console tab)
3. **Request a ride**
4. **Watch for:**
   - `"🔄 Polling for driver assignment..."` (every 1 second)
   - `"📡 Realtime UPDATE received"` (when driver accepts)
   - `"✅ Driver ID found"` (when driver is detected)

## Why This Happens

PWAs use service workers to cache JavaScript for offline use. When code changes, the service worker needs to:
1. Detect the new version
2. Download it
3. Activate it

Sometimes this process gets stuck, especially during rapid deployments.

## Prevention

After clearing cache once, future updates should work automatically because:
- Service worker is set to `autoUpdate`
- New code will be detected and activated

## Still Not Working?

1. Check Netlify deployment is complete (green checkmark)
2. Verify you're on the correct URL (`worldcuptransport.app`)
3. Try incognito mode (bypasses all cache)
4. Check console for errors


