$ErrorActionPreference = "Continue"
$gitPath = "C:\Program Files\Git\cmd\git.exe"

Write-Output "Pulling from origin main (allowing unrelated histories)..."
& $gitPath pull origin main --allow-unrelated-histories

if ($LASTEXITCODE -eq 0) {
    Write-Output "Pull successful. Pushing to origin main..."
    & $gitPath push origin main
} else {
    Write-Output "Pull failed. Please resolve conflicts manually."
}
