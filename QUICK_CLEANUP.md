# 🧹 Quick Disk Cleanup Guide

## Safe to Delete (Can be Reinstalled/Rebuilt)

### 1. **node_modules folders** (Largest space saver!)
**Safe to delete:** ✅ Yes - Can reinstall with `npm install`

**Quick delete command:**
```powershell
# Delete all node_modules except current project
Get-ChildItem -Path C:\Users\koshi -Directory -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -eq "node_modules" -and $_.FullName -notlike "*apps-deve*" } | 
    Remove-Item -Recurse -Force
```

**Estimated space:** 10-50+ GB depending on projects

---

### 2. **dist/build folders**
**Safe to delete:** ✅ Yes - Can rebuild with `npm run build`

**Quick delete:**
```powershell
Get-ChildItem -Path C:\Users\koshi -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -eq "dist" -or $_.Name -eq "build" -or $_.Name -eq ".next" } | 
    Remove-Item -Recurse -Force
```

---

### 3. **Cache folders**
**Safe to delete:** ✅ Yes - Will be recreated automatically

**Locations:**
- `C:\Users\koshi\.cache`
- `C:\Users\koshi\.npm`
- `C:\Users\koshi\.yarn`
- `C:\Users\koshi\AppData\Local\npm-cache`
- `C:\Users\koshi\AppData\Local\Yarn`

**Quick delete:**
```powershell
Remove-Item -Path "$env:USERPROFILE\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:USERPROFILE\.npm" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:USERPROFILE\AppData\Local\npm-cache" -Recurse -Force -ErrorAction SilentlyContinue
```

---

### 4. **Backup/Old folders**
**Safe to delete:** ✅ Yes - If you don't need them

Look for folders named:
- `*backup*`
- `*old*`
- `*.save*`
- `*copy*`

---

## Automated Cleanup Script

**Run the cleanup script:**
```powershell
cd C:\Users\koshi\apps-deve
.\CLEANUP_DISK_SPACE.ps1
```

This script will:
1. Scan for large folders
2. Show you what will be deleted
3. Ask for confirmation
4. Delete safely
5. Show total space freed

---

## Manual Quick Cleanup

**Option 1: Delete all node_modules (except current project)**
```powershell
Get-ChildItem -Path C:\Users\koshi -Directory -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -eq "node_modules" -and $_.FullName -notlike "*apps-deve*" } | 
    ForEach-Object { 
        Write-Host "Deleting: $($_.FullName)"
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
```

**Option 2: Delete specific large projects**
```powershell
# Example: Delete node_modules from specific projects
Remove-Item "C:\Users\koshi\fare-ride-app\frontend\node_modules" -Recurse -Force
Remove-Item "C:\Users\koshi\fare-ride-app\backend\node_modules" -Recurse -Force
Remove-Item "C:\Users\koshi\dynamic-ride-backend\node_modules" -Recurse -Force
```

---

## After Cleanup

**Reinstall dependencies when needed:**
```bash
cd C:\Users\koshi\apps-deve
npm install
```

---

## Estimated Space Savings

- **node_modules:** 10-50 GB (depending on projects)
- **dist/build:** 1-5 GB
- **Cache:** 1-3 GB
- **Backups:** Varies

**Total potential:** 15-60+ GB freed!

---

## ⚠️ Important Notes

- ✅ **Safe:** node_modules, dist, build, cache (can be reinstalled/rebuilt)
- ❌ **Don't delete:** Source code, `.env` files, database files, git folders
- 💾 **Backup first:** If unsure, backup important projects first

---

## Quick Win: Delete Largest Folders First

1. Run cleanup script: `.\CLEANUP_DISK_SPACE.ps1`
2. Choose option 1 (Delete all node_modules)
3. This alone should free 10-50 GB!


