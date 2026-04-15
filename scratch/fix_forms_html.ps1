$file = 'd:\cabang\forms.html'
$content = Get-Content $file -Encoding UTF8 -Raw
if ($content -notmatch 'profile\.css') {
    $content = $content -replace '<link rel="stylesheet" href="/app/css/style\.css">', '<link rel="stylesheet" href="/app/css/style.css">`r`n    <link rel="stylesheet" href="/app/css/profile.css">'
    Set-Content -Path $file -Value $content -Encoding UTF8
    Write-Host "SUCCESS: profile.css added"
} else {
    Write-Host "profile.css already exists or not found"
}
