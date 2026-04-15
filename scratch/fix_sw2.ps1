$file = 'd:\cabang\sw.js'
$content = [System.IO.File]::ReadAllText($file)

$old = "self.addEventListener('install', (event) => {`r`n  event.waitUntil(`r`n    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))`r`n  );`r`n  self.skipWaiting();`r`n});"

$new = "self.addEventListener('install', (event) => {`r`n  event.waitUntil(`r`n    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))`r`n  );`r`n  // NOTE: Do NOT call self.skipWaiting() here automatically.`r`n  // It is triggered via postMessage('SKIP_WAITING') from the client`r`n  // so the page can control when the reload happens and avoid loops.`r`n});"

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    [System.IO.File]::WriteAllText($file, $content)
    Write-Host "SUCCESS: sw.js updated."
} else {
    Write-Host "ERROR: Old content not found."
    $idx = $content.IndexOf("self.skipWaiting()")
    if ($idx -ge 0) {
        $start = [Math]::Max(0, $idx - 100)
        Write-Host "skipWaiting found at index $idx. Context:"
        Write-Host $content.Substring($start, [Math]::Min(250, $content.Length - $start))
    } else {
        Write-Host "self.skipWaiting() NOT found in file at all"
    }
}
