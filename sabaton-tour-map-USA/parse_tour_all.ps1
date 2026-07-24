$filepath = "$env:USERPROFILE\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"
$content = Get-Content -Path $filepath -Raw

$tableStartIdx = $content.IndexOf('<table class="table">')
if ($tableStartIdx -lt 0) {
    Write-Host "Table not found!"
    exit
}

$tableEndIdx = $content.IndexOf('</table>', $tableStartIdx)
$tableHtml = $content.Substring($tableStartIdx, $tableEndIdx - $tableStartIdx + 8)

# Get all <tr>...</tr>
$trPattern = '(?s)<tr>(.*?)<\/tr>'
$matches = [regex]::Matches($tableHtml, $trPattern)

Write-Host "Total rows: $($matches.Count)"

$events = @()

foreach ($m in $matches) {
    $row = $m.Groups[1].Value.Trim()
    
    # Skip if it is a month row (has colspan)
    if ($row -like "*tour-month-row*") {
        continue
    }
    
    # Extract Date: e.g. <span>26 Sep</span><span>2026</span>
    $dayMonth = ""
    $year = ""
    if ($row -match '<span class="tour-date">\s*<span>([^<]+)<\/span>\s*<span>([^<]+)<\/span>') {
        $dayMonth = $Matches[1].Trim()
        $year = $Matches[2].Trim()
    }
    
    # Extract Country and City
    $country = ""
    $city = ""
    if ($row -match '<span class="tour-country-city">(?:<img[^>]*>)?\s*([^,&<]+)(?:,&nbsp;)?\s*<span class="tour-city">([^<]+)<\/span>') {
        $country = $Matches[1].Trim()
        $city = $Matches[2].Trim()
    } else {
        # Fallback regex if it differs
        if ($row -match '<span class="tour-city">([^<]+)<\/span>') {
            $city = $Matches[1].Trim()
        }
        if ($row -match '<span class="tour-country-city">([\s\S]*?)<\/span>') {
            $rawCC = $Matches[1] -replace '<[^>]+>', ''
            $country = ($rawCC -split ',')[0].Trim()
        }
    }
    
    # Extract Venue
    $venue = ""
    if ($row -match '<span class="tour-venue">([^<]+)<\/span>') {
        $venue = $Matches[1].Trim()
    }
    
    # Extract Tickets Link
    $ticketsLink = ""
    if ($row -match '<a href="([^"]+)" title="[^"]*" target="_blank" class="btn btn-primary">TICKETS<\/a>') {
        $ticketsLink = $Matches[1].Trim()
    }
    
    if ($dayMonth -or $city -or $venue) {
        $events += [PSCustomObject]@{
            DateStr = "$dayMonth $year"
            DayMonth = $dayMonth
            Year = $year
            Country = $country
            City = $city
            Venue = $venue
            Tickets = $ticketsLink
        }
    }
}

# Print Nov & Dec 2026
Write-Host "`n=== November & December 2026 Tour Dates ==="
$targetEvents = @()
foreach ($e in $events) {
    if ($e.Year -eq "2026" -and ($e.DayMonth -match "Nov" -or $e.DayMonth -match "Dec")) {
        $targetEvents += $e
        Write-Host "Date: $($e.DateStr) | City: $($e.City) | Country: $($e.Country) | Venue: $($e.Venue) | Tickets: $($e.Tickets)"
    }
}

# Convert to JSON for easy copy-paste
$json = $targetEvents | ConvertTo-Json -Depth 5
Set-Content -Path "tour_dates.json" -Value $json
Write-Host "`nSaved $($targetEvents.Length) events to tour_dates.json"
