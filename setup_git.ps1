$ErrorActionPreference = "Continue"
$gitPath = "C:\Program Files\Git\cmd\git.exe"

if (-not (Test-Path $gitPath)) {
    Write-Output "Error: Git executable not found at $gitPath"
    exit 1
}

Write-Output "Using Git at: $gitPath"

# Add all changes
Write-Output "Adding files..."
& $gitPath add .

# Commit changes
Write-Output "Committing changes..."
& $gitPath commit -m "feat: security hardening (XSS, rate-limit), db indexing, and lazy loading optimization"

# Configure Remote
Write-Output "Configuring remote..."
try {
    & $gitPath remote remove origin 2>&1 | Out-Null
} catch {}

& $gitPath remote add origin https://github.com/2506066-zell/ipmcabang.git

# Verify Remote
& $gitPath remote -v

Write-Output "Setup complete. Ready to push."
