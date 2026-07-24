$filepath = "$env:USERPROFILE\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"
$content = Get-Content -Path $filepath -Raw

$tableStartIdx = $content.IndexOf('<table class="table">')
if ($tableStartIdx -lt 0) {
    Write-Host "Table not found!"
    exit
}

$tableEndIdx = $content.IndexOf('</table>', $tableStartIdx)
$tableHtml = $content.Substring($tableStartIdx, $tableEndIdx - $tableStartIdx + 8)

$trPattern = '(?s)<tr>(.*?)<\/tr>'
$matches = [regex]::Matches($tableHtml, $trPattern)

Write-Host "Found $($matches.Count) rows."
for ($i=0; $i -lt [Math]::Min($matches.Count, 15); $i++) {
    Write-Host "Row $i :"
    Write-Host "  $($matches[$i].Groups[1].Value.Trim() -replace '\s+', ' ')"
    Write-Host "----------------"
}
