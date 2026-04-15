$swFile = 'd:\cabang\sw.js'
$mainFile = 'd:\cabang\app\js\core\main.js'

# Update STATIC_CACHE version in sw.js
$swContent = [System.IO.File]::ReadAllText($swFile)
$swContent = $swContent.Replace("const STATIC_CACHE = 'static-v40';", "const STATIC_CACHE = 'static-v41';")
[System.IO.File]::WriteAllText($swFile, $swContent)
Write-Host "sw.js cache version updated to v41"

# Update SW_VERSION in main.js
$mainContent = [System.IO.File]::ReadAllText($mainFile)
$mainContent = $mainContent.Replace("const SW_VERSION = '40';", "const SW_VERSION = '41';")
[System.IO.File]::WriteAllText($mainFile, $mainContent)
Write-Host "main.js SW_VERSION updated to 41"
