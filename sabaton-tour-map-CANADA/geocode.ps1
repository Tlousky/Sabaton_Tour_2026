$venues = @(
    @{ DateStr="17 Sep 2026"; City="Louisville, Kentucky"; Country="United States"; Venue="Louder Than Life Festival 2026"; Tickets="https://on.louderthanlifefestival.com/trk/sabaton"; Query="Louisville, Kentucky, USA" },
    @{ DateStr="23 Sep 2026"; City="Halifax, Nova Scotia"; Country="Canada"; Venue="Scotiabank Centre"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=halifax&subId2=legends-on-tour&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F3100632BC75633EB"; Query="Halifax, Nova Scotia, Canada" },
    @{ DateStr="25 Sep 2026"; City="Laval, Quebec"; Country="Canada"; Venue="Place Bell"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=laval&subId2=legends-on-tour&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F31006329B7123161"; Query="Laval, Quebec, Canada" },
    @{ DateStr="26 Sep 2026"; City="Ottawa, Ontario"; Country="Canada"; Venue="History Ottawa"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=ottawa&subId2=legends-on-tour&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F31006472AC4F6A88"; Query="Ottawa, Ontario, Canada" },
    @{ DateStr="27 Sep 2026"; City="Toronto, Ontario"; Country="Canada"; Venue="Great Canadian Casino Resort Toronto"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=toronto&subId2=legends-on-tour&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F1000632BAF262337"; Query="Toronto, Ontario, Canada" },
    @{ DateStr="29 Sep 2026"; City="Thunder Bay, Ontario"; Country="Canada"; Venue="Thunder Bay Community Auditorium"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=legends-on-tour&subId2=thunderbay-ontario&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F100064B5B277F62A"; Query="Thunder Bay, Ontario, Canada" },
    @{ DateStr="1 Oct 2026"; City="Winnipeg, Manitoba"; Country="Canada"; Venue="Burton Cummings Theatre"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=winnipeg&subId2=legends-on-tour&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F1100632AD2C6353F"; Query="Winnipeg, Manitoba, Canada" },
    @{ DateStr="2 Oct 2026"; City="Winnipeg, Manitoba"; Country="Canada"; Venue="Burton Cummings Theatre (2nd Night)"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=winnipeg-new-show&subId2=legends-on-tour-2026&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F11006458ABEF4DA1"; Query="Winnipeg, Manitoba, Canada" },
    @{ DateStr="4 Oct 2026"; City="Edmonton, Alberta"; Country="Canada"; Venue="Edmonton Convention Centre"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=edmonton&subId2=legends-on-tour&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F1100632B61180D35"; Query="Edmonton, Alberta, Canada" },
    @{ DateStr="5 Oct 2026"; City="Calgary, Alberta"; Country="Canada"; Venue="Grey Eagle Event Centre"; Tickets="https://ticketmaster.evyy.net/c/2868897/264167/4272?subId1=calgary&subId2=legends-on-tour&u=https%3A%2F%2Fwww.ticketmaster.ca%2Fevent%2F110063299E151794"; Query="Calgary, Alberta, Canada" },
    @{ DateStr="8 Oct 2026"; City="Vancouver, British Columbia"; Country="Canada"; Venue="PNE Forum"; Tickets="https://ticketleader.ca/events/detail/sabaton25"; Query="Vancouver, British Columbia, Canada" }
)

$results = @()

foreach ($v in $venues) {
    $q = [uri]::EscapeDataString($v.Query)
    $url = "https://nominatim.openstreetmap.org/search?q=$q&format=json&limit=1"
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = "SabatonTourMapBot/1.0 (educational project)" }
        if ($resp.Count -gt 0) {
            $lat = [double]$resp[0].lat
            $lon = [double]$resp[0].lon
            Write-Host "OK: $($v.City) -> $lat, $lon"
        } else {
            $lat = 0; $lon = 0
            Write-Host "NOT FOUND: $($v.City)"
        }
    } catch {
        $lat = 0; $lon = 0
        Write-Host "ERROR: $($v.City) - $_"
    }
    $results += [ordered]@{
        DateStr   = $v.DateStr
        Country   = $v.Country
        City      = $v.City
        Venue     = $v.Venue
        Tickets   = $v.Tickets
        Latitude  = $lat
        Longitude = $lon
    }
    Start-Sleep -Milliseconds 1200
}

$json = $results | ConvertTo-Json -Depth 5
$json | Out-File -FilePath "C:\Users\משתמש\.gemini\antigravity\scratch\sabaton-tour-map-sepoct\data.json" -Encoding utf8
Write-Host "`nDone! data.json written."
