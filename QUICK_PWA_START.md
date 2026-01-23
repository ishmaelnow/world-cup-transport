# ⚡ Quick PWA Setup - 5 Minutes

## Step 1: Install PWA Plugin

```bash
npm install -D vite-plugin-pwa
```

---

## Step 2: Create App Icons

**Quick Option - Use Placeholder:**
1. Create a simple 512x512 PNG image (or use any logo)
2. Save as `public/icon-512.png`
3. Resize to 192x192, save as `public/icon-192.png`

**Or use online tool:**
- Go to https://realfavicongenerator.net/
- Upload your logo
- Download generated icons
- Place in `/public` folder

**Minimum Required:**
- `public/icon-192.png` (192x192 pixels)
- `public/icon-512.png` (512x512 pixels)

---

## Step 3: Build & Test

```bash
# Build for production
npm run build

# Preview locally
npm run preview
```

Open `http://localhost:4173` and check:
- ✅ Browser shows "Install" button
- ✅ Works offline (disconnect internet, refresh)
- ✅ App icon appears when installed

---

## Step 4: Deploy

**Vercel (Easiest):**
```bash
npm i -g vercel
vercel
```

**Or Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

---

## Step 5: Test on Mobile

1. Open deployed site on phone
2. Look for "Add to Home Screen" prompt
3. Or: Browser menu → "Add to Home Screen"
4. App icon appears on home screen
5. Opens in standalone mode!

---

## ✅ Done!

Your PWA is now:
- ✅ Installable on iOS & Android
- ✅ Works offline
- ✅ Fast loading (cached)
- ✅ App-like experience
- ✅ Ready for production

---

## Next: Native Apps (Later)

When ready for native apps:
- Use **Capacitor** to wrap PWA
- Or use **React Native** for full native
- Or submit PWA to app stores (Google Play, Microsoft Store)

**For now, PWA is perfect! 🚀**

