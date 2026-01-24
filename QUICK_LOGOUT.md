# 🚪 Quick Logout Guide

## Where is the Logout Button?

**Location:** Top right corner of the page header
- Look for a **logout icon** (↗️ arrow pointing out)
- It's next to the **notifications bell** icon
- Should say **"Logout"** text (on desktop)

---

## ✅ Quickest Way: Use Browser Console

**Press F12** → **Console tab** → Paste this:

```javascript
localStorage.clear(); sessionStorage.clear(); window.location.href = '/';
```

Press **Enter** - You'll be logged out instantly!

---

## 🔍 Can't Find the Button?

The logout button is in the **header** (top of page):
- **Desktop:** Icon + "Logout" text
- **Mobile:** Just the icon (might be small)

**If you still can't see it:**
1. Look at the very top right
2. Next to the bell icon (notifications)
3. Small icon button

---

## 🎯 Alternative: Just Clear Storage

**Easiest method:**
1. Press **F12**
2. Go to **Application** tab (Chrome) or **Storage** (Firefox)
3. Click **Local Storage** → `http://localhost:5174`
4. Right-click → **Clear**
5. Refresh page

---

**I've updated the logout button to show "Logout" text on desktop - refresh your browser to see it!**


