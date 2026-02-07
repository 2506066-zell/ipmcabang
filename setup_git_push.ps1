$ErrorActionPreference = "Continue"
$gitPath = "C:\Program Files\Git\cmd\git.exe"

# Config User
Write-Output "Configuring Git User..."
& $gitPath config user.email "2506066@itg.ac.id"
& $gitPath config user.name "2506066-zell"

# Add
Write-Output "Adding files..."
& $gitPath add .

# Commit
Write-Output "Committing..."
& $gitPath commit -m "feat: security hardening (XSS, rate-limit), db indexing, and lazy loading optimization"

# Push
Write-Output "Attempting to push to origin..."
# Note: This might fail if credentials are not cached. 
# We use 'HEAD' to push the current branch to the matching remote branch.
& $gitPath push origin HEAD
