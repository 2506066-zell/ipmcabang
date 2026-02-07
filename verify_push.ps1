$gitPath = "C:\Program Files\Git\cmd\git.exe"
Write-Output "Git Log:"
& $gitPath log --oneline -n 5

Write-Output "Pushing..."
& $gitPath push origin main
