$filepath = "$env:USERPROFILE\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"
$lines = Get-Content -Path $filepath
for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($line -like "*2026*" -and ($line -like "*Nov*" -or $line -like "*Dec*" -or $line -like "*November*" -or $line -like "*December*")) {
        Write-Host "Match at Line $i :"
        $start = [Math]::Max(0, $i - 4)
        $end = [Math]::Min($lines.Length - 1, $i + 4)
        for ($j = $start; $j -le $end; $j++) {
            $lineContent = $lines[$j].Trim()
            $len = [Math]::Min(150, $lineContent.Length)
            Write-Host ("  {0}: {1}" -f $j, $lineContent.Substring(0, $len))
        }
        Write-Host "--------------------"
    }
}
