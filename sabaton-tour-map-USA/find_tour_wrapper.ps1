$filepath = "$env:USERPROFILE\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"
$content = Get-Content -Path $filepath -Raw

# Find indices of all occurrences of "tour-wrapper"
$idx = -1
$occurrences = 0
do {
    $idx = $content.IndexOf("tour-wrapper", $idx + 1)
    if ($idx -ge 0) {
        $occurrences++
        Write-Host "Occurrence $occurrences at index $idx"
        $start = [Math]::Max(0, $idx - 50)
        $len = [Math]::Min($content.Length - $start, 500)
        Write-Host "Snippet:"
        Write-Host $content.Substring($start, $len)
        Write-Host "===================="
    }
} while ($idx -ge 0)
