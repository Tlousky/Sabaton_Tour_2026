$tourFile = "tour_dates.json"
if (-not (Test-Path $tourFile)) {
    Write-Host "tour_dates.json not found!"
    exit
}

$events = Get-Content -Path $tourFile | ConvertFrom-Json
$geocodedEvents = @()

$userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravitySabatonTourGeocoder/1.0"

foreach ($e in $events) {
    # We will try to search for the Venue + City + Country first
    $queries = @(
        "$($e.Venue), $($e.City), $($e.Country)",
        "$($e.City), $($e.Country)"
    )
    
    $lat = $null
    $lon = $null
    $success = $false
    
    foreach ($q in $queries) {
        $encodedQuery = [uri]::EscapeDataString($q)
        $url = "https://nominatim.openstreetmap.org/search?q=$encodedQuery&format=json&limit=1"
        
        Write-Host "Querying Nominatim: $q"
        try {
            # Wait 1.1 seconds between requests as required by Nominatim usage policy
            Start-Sleep -Milliseconds 1100
            
            $response = Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = $userAgent }
            if ($response -and $response.Count -gt 0) {
                $lat = [double]$response[0].lat
                $lon = [double]$response[0].lon
                $success = $true
                Write-Host "  Found: Lat=$lat, Lon=$lon"
                break
            }
        } catch {
            Write-Host "  Error geocoding: $_"
        }
    }
    
    # Fallback to rough coordinates if geocoding fails
    if (-not $success) {
        Write-Host "  [WARNING] Geocoding failed for $($e.City). Using default."
        # Standard fallback coordinates
        if ($e.City -like "*Dallas*") { $lat = 32.7767; $lon = -96.7970 }
        elseif ($e.City -like "*Houston*") { $lat = 29.7604; $lon = -95.3698 }
        elseif ($e.City -like "*San Antonio*") { $lat = 29.3855; $lon = -98.5714 }
        elseif ($e.City -like "*Phoenix*") { $lat = 33.4484; $lon = -112.0740 }
        elseif ($e.City -like "*Los Angeles*") { $lat = 34.0976; $lon = -118.3243 }
        elseif ($e.City -like "*Wheatland*") { $lat = 39.0102; $lon = -121.4230 }
        elseif ($e.City -like "*Salt Lake*") { $lat = 40.7608; $lon = -111.8910 }
        elseif ($e.City -like "*Loveland*") { $lat = 40.3978; $lon = -105.0750 }
        elseif ($e.City -like "*Omaha*") { $lat = 41.2565; $lon = -95.9345 }
        elseif ($e.City -like "*Milwaukee*") { $lat = 43.0389; $lon = -87.9065 }
        elseif ($e.City -like "*Minneapolis*") { $lat = 44.9778; $lon = -93.2650 }
        elseif ($e.City -like "*Chicago*") { $lat = 41.8818; $lon = -87.6232 }
        elseif ($e.City -like "*Des Moines*") { $lat = 41.5868; $lon = -93.6250 }
        elseif ($e.City -like "*St. Louis*") { $lat = 38.6270; $lon = -90.1994 }
        elseif ($e.City -like "*Cincinnati*") { $lat = 39.1031; $lon = -84.5120 }
        elseif ($e.City -like "*Detroit*") { $lat = 42.3314; $lon = -83.0458 }
        elseif ($e.City -like "*Boston*") { $lat = 42.3584; $lon = -71.0598 }
        elseif ($e.City -like "*Philadelphia*") { $lat = 39.9526; $lon = -75.1652 }
        elseif ($e.City -like "*Pittsburgh*") { $lat = 40.4406; $lon = -79.9959 }
        elseif ($e.City -like "*Virginia Beach*") { $lat = 36.8529; $lon = -75.9780 }
        elseif ($e.City -like "*National Harbor*") { $lat = 38.7844; $lon = -77.0163 }
        elseif ($e.City -like "*Atlanta*") { $lat = 33.7490; $lon = -84.3880 }
        elseif ($e.City -like "*Nashville*") { $lat = 36.1627; $lon = -86.7816 }
        elseif ($e.City -like "*Orlando*") { $lat = 28.5383; $lon = -81.3792 }
        elseif ($e.City -like "*Fort Lauderdale*" -or $e.City -like "*Ft. Lauderdale*") { $lat = 26.1224; $lon = -80.1373 }
        else { $lat = 37.0902; $lon = -95.7129 } # Center of US
    }
    
    $geocodedEvents += [PSCustomObject]@{
        DateStr = $e.DateStr
        DayMonth = $e.DayMonth
        Year = $e.Year
        Country = $e.Country
        City = $e.City
        Venue = $e.Venue
        Tickets = $e.Tickets
        Latitude = $lat
        Longitude = $lon
    }
}

$json = $geocodedEvents | ConvertTo-Json -Depth 5
Set-Content -Path "tour_dates_geocoded.json" -Value $json
Write-Host "Saved all geocoded dates to tour_dates_geocoded.json"
