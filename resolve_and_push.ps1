$ErrorActionPreference = "Continue"
$gitPath = "C:\Program Files\Git\cmd\git.exe"

Write-Output "Resolving conflicts by keeping LOCAL version (Ours)..."
# Checkout ours for all unmerged files
# Note: In a merge, --ours is the current branch (local).
& $gitPath checkout --ours .

Write-Output "Adding resolved files..."
& $gitPath add .

Write-Output "Committing merge..."
& $gitPath commit -m "merge: resolve conflicts by keeping local security fixes"

Write-Output "Pushing to origin main..."
& $gitPath push origin main
