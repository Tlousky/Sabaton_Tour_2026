$filepath = "$env:USERPROFILE\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"
$content = Get-Content -Path $filepath -Raw

# Find the tour table
if ($content -match '<table class="tour-table[^"]*">([\s\S]*?)<\/table>') {
    $tableBody = $Matches[1]
    Write-Host "Found Tour Table!"
    
    # Split by tr
    $rows = $tableBody -split '<tr>|</tr>'
    Write-Host "Total rows found: $($rows.Length)"
    
    foreach ($row in $rows) {
        if ($row -match '2026') {
            # Extract date, venue, city, country, ticket link
            # Usually rows look like:
            # <td class="date">...</td><td class="city">...</td>
            $date = ""
            $city = ""
            $venue = ""
            $country = ""
            
            if ($row -match '<td[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/td>') { $date = $Matches[1].Trim() }
            if ($row -match '<td[^>]*class="[^"]*venue[^"]*"[^>]*>([\s\S]*?)<\/td>') { $venue = $Matches[1].Trim() }
            if ($row -match '<td[^>]*class="[^"]*city[^"]*"[^>]*>([\s\S]*?)<\/td>') { $city = $Matches[1].Trim() }
            if ($row -match '<td[^>]*class="[^"]*country[^"]*"[^>]*>([\s\S]*?)<\/td>') { $country = $Matches[1].Trim() }
            
            # Clean HTML tags
            $date = $date -replace '<[^>]+>', ''
            $venue = $venue -replace '<[^>]+>', ''
            $city = $city -replace '<[^>]+>', ''
            $country = $country -replace '<[^>]+>', ''
            
            if ($city -or $date -or $venue) {
                Write-Host "Date: $date | Venue: $venue | City: $city | Country: $country"
            }
        }
    }
} else {
    Write-Host "Tour table not found in HTML"
}
