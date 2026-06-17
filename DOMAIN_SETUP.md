# 🌐 Domain Setup Guide - BEFORE Production

## Why Domain First?

✅ **HTTPS Required** - PWAs MUST use HTTPS (domain makes this easy)  
✅ **Supabase Redirect URLs** - Need your production domain  
✅ **Stripe Webhooks** - Need your production domain  
✅ **Professional** - `yourapp.com` looks better than `yourapp.vercel.app`  
✅ **Branding** - Your own domain = your brand  

---

## Step 1: Choose & Buy Domain

### Recommended Domain Registrars:
1. **Namecheap** - Easy, affordable (~$10-15/year)
2. **Google Domains** - Simple, reliable (~$12/year)
3. **Cloudflare** - At-cost pricing (~$8-10/year)
4. **GoDaddy** - Popular but more expensive

### Domain Name Ideas:
- `fairfare.app` (if available)
- `fairfare.io`
- `fairfare.com`
- `fairfareshare.com`
- `fairfares.com`

**Check availability:** https://www.namecheap.com/domains/

---

## Step 2: Domain Configuration Options

### Option A: Use Domain with Vercel (Easiest)
1. Buy domain from any registrar
2. Deploy to Vercel
3. Add domain in Vercel dashboard
4. Vercel handles DNS automatically

### Option B: Use Domain with Netlify
1. Buy domain from any registrar
2. Deploy to Netlify
3. Add domain in Netlify dashboard
4. Netlify handles DNS automatically

### Option C: Use Domain with Cloudflare Pages
1. Buy domain from Cloudflare (or transfer)
2. Deploy to Cloudflare Pages
3. DNS already configured
4. Free SSL automatically

---

## Step 3: Update Supabase Settings

After you have your domain, update Supabase:

### 1. Authentication → URL Configuration
- **Site URL:** `https://yourdomain.com`
- **Redirect URLs:** Add:
  - `https://yourdomain.com/**`
  - `https://yourdomain.com/rider`
  - `https://yourdomain.com/driver`
  - `https://yourdomain.com/admin`

### 2. API Settings
- Update CORS origins to include your domain
- Add `https://yourdomain.com` to allowed origins

---

## Step 4: Update Stripe Settings

### Webhook Endpoints
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhook-stripe`
   - Or use Supabase Edge Function URL if using that

### Redirect URLs
- Update any Stripe redirect URLs to use your domain

---

## Step 5: Update Environment Variables

Create `.env.production`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Important:** Never commit `.env.production` to Git!

---

## Step 6: DNS Configuration

### If Using Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Vercel will show DNS records to add:
   - Usually just add CNAME: `cname.vercel-dns.com`
4. Add records in your domain registrar's DNS settings
5. Wait 24-48 hours for propagation

### If Using Netlify:
1. Go to Netlify Dashboard → Domain Settings
2. Add custom domain
3. Follow DNS instructions
4. Usually add CNAME: `your-site.netlify.app`

### If Using Cloudflare:
1. Domain already in Cloudflare
2. Add DNS record:
   - Type: CNAME
   - Name: @ (or www)
   - Target: your-pages-project.pages.dev
3. SSL/TLS: Automatic (Full)

---

## Quick Start: Domain + Vercel (Recommended)

### 1. Buy Domain
```bash
# Go to namecheap.com or similar
# Search for your domain
# Purchase (usually $10-15/year)
```

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd C:\Users\koshi\apps-deve
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? fairfare (or your choice)
# - Directory? ./
# - Build command? npm run build
# - Output directory? dist
```

### 3. Add Domain in Vercel
1. Go to https://vercel.com/dashboard
2. Click your project
3. Settings → Domains
4. Add your domain (e.g., `fairfare.com`)
5. Copy DNS records shown
6. Add DNS records in your domain registrar
7. Wait for DNS propagation (usually 1-24 hours)

### 4. Update Supabase
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/**`

### 5. Update Environment Variables in Vercel
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
3. Redeploy

---

## Domain Checklist

- [ ] Choose domain name
- [ ] Purchase domain
- [ ] Choose hosting (Vercel/Netlify/Cloudflare)
- [ ] Deploy app to hosting
- [ ] Add domain to hosting platform
- [ ] Configure DNS records
- [ ] Wait for DNS propagation
- [ ] Update Supabase redirect URLs
- [ ] Update Stripe webhook URLs
- [ ] Set environment variables in hosting platform
- [ ] Test HTTPS (should be automatic)
- [ ] Test PWA installation
- [ ] Verify all redirects work

---

## Cost Estimate

- **Domain:** $10-15/year
- **Hosting:** FREE (Vercel/Netlify/Cloudflare all free tiers)
- **SSL Certificate:** FREE (automatic with hosting)
- **Total:** ~$10-15/year

---

## Next Steps After Domain Setup

1. ✅ Domain configured
2. ✅ HTTPS working
3. ✅ Deploy to production
4. ✅ Update Supabase settings
5. ✅ Update Stripe settings
6. ✅ Test PWA installation
7. ✅ Test all features
8. ✅ Go live! 🚀

---

**Start with domain, then deploy!** 🌐


