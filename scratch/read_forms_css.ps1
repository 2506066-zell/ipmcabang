$c = [System.IO.File]::ReadAllText('d:\cabang\app\css\forms.css')
Write-Host $c.Substring(0, [Math]::Min(5000, $c.Length))
