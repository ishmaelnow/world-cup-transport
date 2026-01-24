# 🚪 How to Logout - Multiple Ways

## 🔍 Where is the Logout Button?

The logout button should be in the **top right corner** of the header:
- Look for a **logout icon** (arrow pointing out of a box)
- It's next to the notifications bell icon
- Should be visible on desktop and mobile

---

## ✅ Method 1: Use the Logout Button

1. Look at the **top right** of the page
2. Find the **logout icon** (↗️ icon)
3. Click it
4. You'll be logged out and redirected to login

---

## ✅ Method 2: Clear Browser Storage (If Button Not Visible)

If you can't see the logout button, clear your session:

### In Browser Console (F12):
```javascript
// Clear Supabase session
localStorage.clear();
sessionStorage.clear();
window.location.href = '/';
```

**Steps:**
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Paste the code above
4. Press Enter
5. You'll be logged out

---

## ✅ Method 3: Clear Cookies/Storage Manually

1. Press **F12** (Developer Tools)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → `http://localhost:5174`
4. Right-click → **Clear**
5. Click **Session Storage** → `http://localhost:5174`
6. Right-click → **Clear**
7. Refresh page (F5)

---

## ✅ Method 4: Use Incognito/Private Window

1. Open a **new incognito/private window**
2. Go to: http://localhost:5174
3. You'll be logged out automatically

---

## 🔧 If Logout Button is Missing

The logout button should be visible. If it's not:

### Check:
1. **Are you logged in?** - Check if you see your role badge (RIDER/DRIVER/ADMIN)
2. **Is header visible?** - The header should be at the top
3. **Mobile view?** - Button might be hidden - try desktop view

### Quick Fix:
Add a temporary logout button by running this in console:
```javascript
// Create logout button
const logoutBtn = document.createElement('button');
logoutBtn.textContent = 'Logout';
logoutBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:10px;background:red;color:white;border:none;border-radius:5px;cursor:pointer;';
logoutBtn.onclick = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/';
};
document.body.appendChild(logoutBtn);
```

---

## 🎯 Quickest Way

**Just run this in browser console (F12):**
```javascript
localStorage.clear(); sessionStorage.clear(); window.location.href = '/';
```

This will:
1. Clear your session
2. Log you out
3. Redirect to login page

---

## 📍 Logout Button Location

The logout button is:
- **Location:** Top right corner of header
- **Icon:** LogOut icon (↗️)
- **Next to:** Notifications bell icon
- **Should be visible:** Always (when logged in)

If you still can't see it, use Method 2 (console command) to logout!


