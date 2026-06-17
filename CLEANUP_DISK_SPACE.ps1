# Disk Cleanup Script for Windows
# Safely removes node_modules, build artifacts, and cache files

Write-Host "=== DISK CLEANUP SCRIPT ===" -ForegroundColor Green
Write-Host "This will help free up disk space by removing:" -ForegroundColor Yellow
Write-Host "  - node_modules folders (can be reinstalled)" -ForegroundColor Yellow
Write-Host "  - dist/build folders (can be rebuilt)" -ForegroundColor Yellow
Write-Host "  - Cache folders" -ForegroundColor Yellow
Write-Host ""

# Function to get folder size
function Get-FolderSize {
    param($Path)
    if (Test-Path $Path) {
        $size = (Get-ChildItem $Path -Recurse -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        return [math]::Round($size / 1GB, 2)
    }
    return 0
}

# Function to safely remove folder
function Remove-LargeFolder {
    param($Path, $Name)
    if (Test-Path $Path) {
        $size = Get-FolderSize $Path
        Write-Host "Found: $Name" -ForegroundColor Cyan
        Write-Host "  Path: $Path" -ForegroundColor Gray
        Write-Host "  Size: $size GB" -ForegroundColor Yellow
        $confirm = Read-Host "  Delete? (y/n)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            try {
                Remove-Item $Path -Recurse -Force -ErrorAction Stop
                Write-Host "  ✓ Deleted successfully!" -ForegroundColor Green
                return $size
            } catch {
                Write-Host "  ✗ Error deleting: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "  Skipped" -ForegroundColor Gray
        }
    }
    return 0
}

$totalFreed = 0
$basePath = "C:\Users\koshi"

Write-Host "`n=== SCANNING FOR CLEANUP TARGETS ===" -ForegroundColor Green

# 1. Find all node_modules (except current project)
Write-Host "`n1. NODE_MODULES FOLDERS:" -ForegroundColor Cyan
Get-ChildItem -Path $basePath -Directory -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -eq "node_modules" -and $_.FullName -notlike "*apps-deve*" } |
    ForEach-Object {
        $size = Get-FolderSize $_.FullName
        if ($size -gt 0.1) {  # Only show folders > 100MB
            Write-Host "  $($_.FullName) - $size GB" -ForegroundColor Yellow
        }
    }

# 2. Find dist/build folders
Write-Host "`n2. DIST/BUILD FOLDERS:" -ForegroundColor Cyan
Get-ChildItem -Path $basePath -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -eq "dist" -or $_.Name -eq "build" -or $_.Name -eq ".next" } |
    ForEach-Object {
        $size = Get-FolderSize $_.FullName
        if ($size -gt 0.01) {
            Write-Host "  $($_.FullName) - $size GB" -ForegroundColor Yellow
        }
    }

# 3. Cache folders
Write-Host "`n3. CACHE FOLDERS:" -ForegroundColor Cyan
$cacheFolders = @(
    "$basePath\.cache",
    "$basePath\.npm",
    "$basePath\.yarn",
    "$basePath\AppData\Local\npm-cache",
    "$basePath\AppData\Local\Yarn",
    "$basePath\AppData\Roaming\npm-cache"
)
foreach ($cache in $cacheFolders) {
    if (Test-Path $cache) {
        $size = Get-FolderSize $cache
        if ($size -gt 0.01) {
            Write-Host "  $cache - $size GB" -ForegroundColor Yellow
        }
    }
}

# 4. Backup folders
Write-Host "`n4. BACKUP FOLDERS:" -ForegroundColor Cyan
Get-ChildItem -Path $basePath -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -like "*backup*" -or $_.Name -like "*old*" -or $_.Name -like "*.save*" } |
    ForEach-Object {
        $size = Get-FolderSize $_.FullName
        Write-Host "  $($_.FullName) - $size GB" -ForegroundColor Yellow
    }

Write-Host "`n=== QUICK CLEANUP OPTIONS ===" -ForegroundColor Green
Write-Host "Choose an option:" -ForegroundColor Yellow
Write-Host "  1. Delete all node_modules (except apps-deve)"
Write-Host "  2. Delete all dist/build folders"
Write-Host "  3. Delete cache folders"
Write-Host "  4. Delete backup folders"
Write-Host "  5. Custom cleanup (interactive)"
Write-Host "  6. Exit"
Write-Host ""

$choice = Read-Host "Enter choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host "`nDeleting node_modules folders..." -ForegroundColor Cyan
        Get-ChildItem -Path $basePath -Directory -Recurse -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -eq "node_modules" -and $_.FullName -notlike "*apps-deve*" } |
            ForEach-Object {
                $size = Get-FolderSize $_.FullName
                if ($size -gt 0.1) {
                    $totalFreed += Remove-LargeFolder $_.FullName "node_modules"
                }
            }
    }
    "2" {
        Write-Host "`nDeleting dist/build folders..." -ForegroundColor Cyan
        Get-ChildItem -Path $basePath -Directory -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -eq "dist" -or $_.Name -eq "build" -or $_.Name -eq ".next" } |
            ForEach-Object {
                $totalFreed += Remove-LargeFolder $_.FullName $_.Name
            }
    }
    "3" {
        Write-Host "`nDeleting cache folders..." -ForegroundColor Cyan
        foreach ($cache in $cacheFolders) {
            if (Test-Path $cache) {
                $totalFreed += Remove-LargeFolder $cache "cache"
            }
        }
    }
    "4" {
        Write-Host "`nDeleting backup folders..." -ForegroundColor Cyan
        Get-ChildItem -Path $basePath -Directory -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -like "*backup*" -or $_.Name -like "*old*" -or $_.Name -like "*.save*" } |
            ForEach-Object {
                $totalFreed += Remove-LargeFolder $_.FullName $_.Name
            }
    }
    "5" {
        Write-Host "`nInteractive cleanup mode..." -ForegroundColor Cyan
        Write-Host "Enter folder path to delete (or 'done' to finish):" -ForegroundColor Yellow
        while ($true) {
            $path = Read-Host "Path"
            if ($path -eq "done") { break }
            if (Test-Path $path) {
                $totalFreed += Remove-LargeFolder $path "custom"
            } else {
                Write-Host "Path not found!" -ForegroundColor Red
            }
        }
    }
    "6" {
        Write-Host "Exiting..." -ForegroundColor Gray
        exit
    }
}

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
Write-Host "Total space freed: $totalFreed GB" -ForegroundColor Green
Write-Host "`nYou can reinstall dependencies with: npm install" -ForegroundColor Yellow


