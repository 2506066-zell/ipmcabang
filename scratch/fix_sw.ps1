$file = 'd:\cabang\app\js\core\main.js'
$content = [System.IO.File]::ReadAllText($file)

$old = "    if (isProd && 'serviceWorker' in navigator) {`r`n        window.addEventListener('load', () => {`r`n            navigator.serviceWorker.register(SW_URL)`r`n                .then((reg) => {`r`n                    console.log('SW registered');`r`n                    reg.update();`r`n`r`n                    if (reg.waiting) {`r`n                        reg.waiting.postMessage('SKIP_WAITING');`r`n                    }`r`n`r`n                    reg.addEventListener('updatefound', () => {`r`n                        const newWorker = reg.installing;`r`n                        if (!newWorker) return;`r`n                        newWorker.addEventListener('statechange', () => {`r`n                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {`r`n                                newWorker.postMessage('SKIP_WAITING');`r`n                            }`r`n                        });`r`n                    });`r`n                })`r`n                .catch((err) => console.log('SW failed', err));`r`n        });`r`n`r`n        navigator.serviceWorker.addEventListener('controllerchange', () => {`r`n            if (window.__swReloading) return;`r`n            window.__swReloading = true;`r`n            window.location.reload();`r`n        });`r`n    }"

$new = "    if (isProd && 'serviceWorker' in navigator) {`r`n        // Track whether a controller existed before registration so we can`r`n        // distinguish a first-time install from a genuine update.`r`n        const hadController = !!navigator.serviceWorker.controller;`r`n`r`n        window.addEventListener('load', () => {`r`n            navigator.serviceWorker.register(SW_URL)`r`n                .then((reg) => {`r`n                    console.log('SW registered');`r`n`r`n                    // Only prompt for update when the user already had an`r`n                    // active SW (i.e. this is a revisit, not the very first load).`r`n                    if (!hadController) return;`r`n`r`n                    if (reg.waiting) {`r`n                        reg.waiting.postMessage('SKIP_WAITING');`r`n                    }`r`n`r`n                    reg.addEventListener('updatefound', () => {`r`n                        const newWorker = reg.installing;`r`n                        if (!newWorker) return;`r`n                        newWorker.addEventListener('statechange', () => {`r`n                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {`r`n                                newWorker.postMessage('SKIP_WAITING');`r`n                            }`r`n                        });`r`n                    });`r`n                })`r`n                .catch((err) => console.log('SW failed', err));`r`n        });`r`n`r`n        // Only reload when there was a previous controller (real update) and`r`n        // only once per page-session to prevent infinite reload loops.`r`n        navigator.serviceWorker.addEventListener('controllerchange', () => {`r`n            if (!hadController) return;           // first install - no reload needed`r`n            if (window.__swReloading) return;     // already reloading`r`n            try {`r`n                if (sessionStorage.getItem('__swReloaded')) return;`r`n                sessionStorage.setItem('__swReloaded', '1');`r`n            } catch (e) {}`r`n            window.__swReloading = true;`r`n            window.location.reload();`r`n        });`r`n    }"

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    [System.IO.File]::WriteAllText($file, $content)
    Write-Host "SUCCESS: File updated."
} else {
    Write-Host "ERROR: Old content not found. Trying without reg.update()..."
    # Try without the reg.update() line
    $old2 = $old
    if ($content.Contains("reg.update();")) {
        Write-Host "reg.update() exists in file"
    } else {
        Write-Host "reg.update() NOT in file"
    }
    
    # Debug: show what's around isProd
    $idx = $content.IndexOf("isProd && 'serviceWorker'")
    if ($idx -ge 0) {
        Write-Host "Found isProd at index $idx"
        Write-Host $content.Substring($idx, [Math]::Min(200, $content.Length - $idx))
    } else {
        Write-Host "isProd && serviceWorker NOT FOUND"
        $idx2 = $content.IndexOf("isProd")
        if ($idx2 -ge 0) {
            Write-Host "Found isProd at $idx2"
            Write-Host $content.Substring($idx2, [Math]::Min(200, $content.Length - $idx2))
        }
    }
}
