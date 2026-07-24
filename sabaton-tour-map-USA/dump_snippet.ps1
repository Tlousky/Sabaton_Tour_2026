$filepath = "$env:USERPROFILE\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"
$content = Get-Content -Path $filepath -Raw

$idx = $content.IndexOf("tour-wrapper")
if ($idx -ge 0) {
    Write-Host "Found 'tour-wrapper' at index $idx"
    $start = [Math]::Max(0, $idx - 200)
    $len = [Math]::Min($content.Length - $start, 2500)
    $snippet = $content.Substring($start, $len)
    Write-Host "Snippet:"
    Write-Host $snippet
} else {
    Write-Host "'tour-wrapper' not found"
}
