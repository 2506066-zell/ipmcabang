$c = [System.IO.File]::ReadAllText('d:\cabang\app\css\style.css')
# Find mobile-header section
$idx = $c.IndexOf('.mobile-header {')
if ($idx -ge 0) {
    Write-Host "=== .mobile-header { at index $idx ==="
    Write-Host $c.Substring($idx, [Math]::Min(600, $c.Length - $idx))
}
Write-Host ""
# Also get lines 130-170
$lines = $c -split "`n"
Write-Host "=== Lines 130-175 ==="
for ($i = 129; $i -lt [Math]::Min(175, $lines.Length); $i++) {
    Write-Host ($i+1).ToString() + ": " + $lines[$i]
}
