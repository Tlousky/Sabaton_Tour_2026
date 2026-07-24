$filepath = "$env:USERPROFILE\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"
$content = Get-Content -Path $filepath -Raw

# Find the start of <table class="table">
$tableStartIdx = $content.IndexOf('<table class="table">')
if ($tableStartIdx -lt 0) {
    Write-Host "Table not found!"
    exit
}

# Find the matching </table>
$tableEndIdx = $content.IndexOf('</table>', $tableStartIdx)
if ($tableEndIdx -lt 0) {
    Write-Host "End of table not found!"
    exit
}

$tableHtml = $content.Substring($tableStartIdx, $tableEndIdx - $tableStartIdx + 8)

# Now, split the table html into individual <tr> elements using regex
$trPattern = '(?s)<tr>(.*?)<\/tr>'
$matches = [regex]::Matches($tableHtml, $trPattern)

Write-Host "Found $($matches.Count) rows in the table."

$tourDates = @()
$currentMonth = ""
$currentYear = ""

foreach ($m in $matches) {
    $rowHtml = $m.Groups[1].Value
    
    # Check if this is a month header row
    if ($rowHtml -match '<span class="year">([^<]+)<\/span>\s*([^<]+)') {
        $currentYear = $Matches[1].Trim()
        $currentMonth = $Matches[2].Trim()
        # Write-Host "Month Header: $currentMonth $currentYear"
        continue
    }
    
    # It's an event row
    # Let's extract date
    $dateText = ""
    if ($rowHtml -match '<span class="tour-date">([\s\S]*?)<\/span>\s*<\/span>') {
        # The inner content may have spans, let's strip HTML
        $dateText = $Matches[1] -replace '<[^>]+>', ' '
        $dateText = ($dateText -replace '\s+', ' ').Trim()
    }
    
    # Let's extract location / venue / country
    # E.g., <span class="tour-country-city">...</span><span class="tour-venue">...</span>
    $cityCountry = ""
    if ($rowHtml -match '<span class="tour-country-city">([\s\S]*?)<\/span>') {
        $cityCountry = $Matches[1] -replace '<[^>]+>', ' '
        $cityCountry = ($cityCountry -replace '\s+', ' ').Trim()
    }
    
    $venue = ""
    if ($rowHtml -match '<span class="tour-venue">([\s\S]*?)<\/span>') {
        $venue = $Matches[1] -replace '<[^>]+>', ' '
        $venue = ($venue -replace '\s+', ' ').Trim()
    }
    
    # If we have some content
    if ($dateText -or $cityCountry -or $venue) {
        $tourDates += [PSCustomObject]@{
            Year = $currentYear
            Month = $currentMonth
            Date = $dateText
            Location = $cityCountry
            Venue = $venue
        }
    }
}

# Filter for November and December 2026
Write-Host "`nFiltering for November and December 2026:`n"
foreach ($event in $tourDates) {
    if ($event.Year -eq "2026" -and ($event.Month -eq "November" -or $event.Month -eq "December")) {
        Write-Host "Month: $($event.Month) | Date: $($event.Date) | Location: $($event.Location) | Venue: $($event.Venue)"
    }
}

# Also let's print ALL events in 2026 to see if there are others in USA
Write-Host "`nAll 2026 USA events (based on USA or United States in Location):`n"
foreach ($event in $tourDates) {
    if ($event.Year -eq "2026" -and ($event.Location -like "*USA*" -or $event.Location -like "*United States*")) {
        Write-Host "Month: $($event.Month) | Date: $($event.Date) | Location: $($event.Location) | Venue: $($event.Venue)"
    }
}
