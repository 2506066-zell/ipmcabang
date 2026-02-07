$ErrorActionPreference = "Continue"
$gitPath = "C:\Program Files\Git\cmd\git.exe"

Write-Output "Adding updated vercel.json..."
& $gitPath add vercel.json

Write-Output "Committing fix..."
& $gitPath commit -m "fix: update vercel.json configuration for better static file handling"

Write-Output "Pushing to origin main..."
& $gitPath push origin main
