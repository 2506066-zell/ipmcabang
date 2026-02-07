$ErrorActionPreference = "Continue"
$gitPath = "C:\Program Files\Git\cmd\git.exe"

Write-Output "Adding changes..."
& $gitPath add .

Write-Output "Committing fix..."
& $gitPath commit -m "fix: rename db.js to _db.js to reduce serverless function count and switch to vercel zero config"

Write-Output "Pushing to origin main..."
& $gitPath push origin main
