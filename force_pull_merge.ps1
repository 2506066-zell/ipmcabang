$ErrorActionPreference = "Continue"
$gitPath = "C:\Program Files\Git\cmd\git.exe"

Write-Output "Configuring pull strategy..."
& $gitPath config pull.rebase false

Write-Output "Pulling with --allow-unrelated-histories..."
& $gitPath pull origin main --allow-unrelated-histories

if ($LASTEXITCODE -eq 0) {
    Write-Output "Pull successful. Now Pushing..."
    & $gitPath push origin main
} else {
    Write-Output "Pull FAILED. Exit code: $LASTEXITCODE"
    & $gitPath status
}
