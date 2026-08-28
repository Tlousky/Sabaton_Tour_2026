document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // Application State
    // =========================================================================
    let tourData = [];
    let markers = [];
    let routeLine = null;
    let activeIndex = -1;
    let autoplayInterval = null;
    let isAutoplayRunning = false;
    let currentAutoplaySpeed = 3000;
    let currentFilteredData = [];

    // =========================================================================
    // Leaflet Map Init
    // =========================================================================
    const map = L.map('map', {
        center: [48.0, -90.0], // Centered over Canada/US border
        zoom: 4,
        minZoom: 3,
        maxZoom: 13
    });

    // CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // =========================================================================
    // DOM References
    // =========================================================================
    const tourListContainer = document.getElementById('tour-list');
    const searchInput       = document.getElementById('search-input');
    const btnResetFilters   = document.getElementById('btn-reset-filters');
    const filteredCountBadge = document.getElementById('filtered-count');
    const btnAutoplay       = document.getElementById('btn-autoplay');
    const btnPause          = document.getElementById('btn-pause');
    const speedRange        = document.getElementById('speed-range');
    const speedLabel        = document.getElementById('speed-label');
    const statShows         = document.getElementById('stat-shows');
    const statCities        = document.getElementById('stat-cities');
    const statDistance      = document.getElementById('stat-distance');

    // =========================================================================
    // Load Data
    // =========================================================================
    if (typeof TOUR_DATA !== 'undefined' && Array.isArray(TOUR_DATA)) {
        tourData = TOUR_DATA;
        initializeTourApp();
    } else {
        console.error('TOUR_DATA not found. Make sure data.js is loaded.');
        tourListContainer.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Error loading tour data.</div>`;
    }

    // =========================================================================
    // Initialize App
    // =========================================================================
    function initializeTourApp() {
        currentFilteredData = [...tourData];
        // Stats
        statShows.textContent = tourData.length;
        const uniqueCities = new Set(tourData.map(e => e.City));
        statCities.textContent = uniqueCities.size;
        const totalDist = calculateTotalDistance(tourData);
        statDistance.textContent = Math.round(totalDist).toLocaleString();

        // Render map content
        renderMarkers();
        drawRoute(tourData);
        fitMapBounds(tourData);
        renderTourList(tourData);

        // Event Listeners
        searchInput.addEventListener('input', handleFilterChange);
        btnResetFilters.addEventListener('click', resetFilters);
        btnAutoplay.addEventListener('click', startAutoplay);
        btnPause.addEventListener('click', pauseAutoplay);
        speedRange.addEventListener('input', handleSpeedChange);
    }

    // =========================================================================
    // Map Functions
    // =========================================================================
    function renderMarkers() {
        tourData.forEach((event, index) => {
            const isStart = index === 0;
            const isEnd   = index === tourData.length - 1;
            const isUSA   = event.Country === 'United States';

            let pinClass = 'marker-pin';
            let pulseHtml = '';

            if (isStart) {
                pinClass += isUSA ? ' usa-pin' : ' start-pin';
                pulseHtml = '<div class="marker-pulse-ring"></div>';
            } else if (isEnd) {
                pinClass += ' end-pin';
                pulseHtml = '<div class="marker-pulse-ring end-pulse"></div>';
            } else if (isUSA) {
                pinClass += ' usa-pin';
            }

            const markerIcon = L.divIcon({
                className: 'custom-map-marker',
                html: `${pulseHtml}<div class="${pinClass}" id="pin-${index}">${index + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = L.marker([event.Latitude, event.Longitude], { icon: markerIcon }).addTo(map);

            // Popup
            const gMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.Venue + ', ' + event.City)}`;
            const countryClass = event.Country === 'Canada' ? 'canada' : 'usa';
            const flag = event.Country === 'Canada' ? '🍁' : '🇺🇸';
            const popupContent = `
                <div class="popup-header">
                    <span class="popup-date">${event.DateStr}</span>
                    <span class="popup-seq">Stop ${index + 1} of ${tourData.length}</span>
                </div>
                <div class="popup-venue">${event.Venue}</div>
                <div class="popup-city">${event.City}</div>
                <div class="popup-country ${countryClass}">${flag} ${event.Country}</div>
                <div class="popup-actions">
                    <a href="${event.Tickets}" target="_blank" class="btn btn-gold"><i class="fa-solid fa-ticket"></i> Tickets</a>
                    <a href="${gMapsLink}" target="_blank" class="btn btn-secondary"><i class="fa-solid fa-diamond-turn-right"></i> Directions</a>
                </div>
            `;

            marker.bindPopup(popupContent, { closeButton: true, offset: [0, -5] });
            marker.on('click', () => selectTourStop(index, false));

            markers.push(marker);
        });
    }

    function drawRoute(data) {
        if (routeLine) map.removeLayer(routeLine);
        const latLngs = data.map(e => [e.Latitude, e.Longitude]);
        routeLine = L.polyline(latLngs, {
            color: '#e8b800',
            weight: 3,
            opacity: 0.65,
            dashArray: '8, 12',
            className: 'flowing-route'
        }).addTo(map);
    }

    function fitMapBounds(data) {
        if (!data || data.length === 0) return;
        const bounds = L.latLngBounds(data.map(e => [e.Latitude, e.Longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // =========================================================================
    // Sidebar / Tour List
    // =========================================================================
    function renderTourList(data) {
        tourListContainer.innerHTML = '';

        if (data.length === 0) {
            tourListContainer.innerHTML = '<div class="no-results">No tour dates match your filter.</div>';
            filteredCountBadge.textContent = '0 shows';
            return;
        }

        data.forEach(event => {
            const originalIndex = tourData.findIndex(e => e.DateStr === event.DateStr && e.Venue === event.Venue);
            const isCanada = event.Country === 'Canada';
            const gMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.Venue + ', ' + event.City)}`;
            const flag = isCanada ? '🍁' : '🇺🇸';

            const card = document.createElement('div');
            card.className = `tour-card ${originalIndex === activeIndex ? 'active' : ''}`;
            card.id = `card-${originalIndex}`;

            card.innerHTML = `
                <div class="tour-card-header">
                    <div class="tour-card-num-date">
                        <span class="tour-seq">${originalIndex + 1}</span>
                        <span class="tour-date-txt">${event.DateStr}</span>
                    </div>
                    <span class="state-badge ${isCanada ? 'canada-badge' : 'usa-badge'}">${flag} ${isCanada ? 'Canada' : 'USA'}</span>
                </div>
                <div class="tour-card-body">
                    <div class="tour-venue-name">${event.Venue}</div>
                    <div class="tour-city-name">${event.City}</div>
                </div>
                <div class="tour-card-footer">
                    <a href="${event.Tickets}" target="_blank" class="btn btn-gold btn-ticket" onclick="event.stopPropagation()">
                        <i class="fa-solid fa-ticket"></i> Tickets
                    </a>
                    <a href="${gMapsLink}" target="_blank" class="btn-card-dir" onclick="event.stopPropagation()">
                        <i class="fa-solid fa-diamond-turn-right"></i> Directions
                    </a>
                </div>
            `;

            card.addEventListener('click', () => {
                if (isAutoplayRunning) pauseAutoplay();
                selectTourStop(originalIndex, true);
            });

            tourListContainer.appendChild(card);
        });

        filteredCountBadge.textContent = `${data.length} show${data.length === 1 ? '' : 's'}`;
    }

    function selectTourStop(index, flyTo = true) {
        if (index < 0 || index >= tourData.length) return;

        // Deactivate previous
        const prevCard = document.querySelector('.tour-card.active');
        if (prevCard) prevCard.classList.remove('active');
        const prevPin = document.querySelector('.marker-pin.active-pin');
        if (prevPin) prevPin.classList.remove('active-pin');
        const prevRing = document.getElementById('active-pulse-ring');
        if (prevRing) prevRing.remove();

        activeIndex = index;

        // Activate new card
        const card = document.getElementById(`card-${index}`);
        if (card) {
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Activate pin
        const pin = document.getElementById(`pin-${index}`);
        if (pin) {
            pin.classList.add('active-pin');
            const ring = document.createElement('div');
            ring.className = `marker-pulse-ring ${index === tourData.length - 1 ? 'end-pulse' : ''}`;
            ring.id = 'active-pulse-ring';
            pin.parentElement.insertBefore(ring, pin);
        }

        // Open popup and fly
        const event = tourData[index];
        const marker = markers[index];
        if (marker) {
            marker.openPopup();
            if (flyTo) {
                map.flyTo([event.Latitude, event.Longitude], 7, { animate: true, duration: 1.5 });
            }
        }
    }

    // =========================================================================
    // Filter Logic
    // =========================================================================
    function handleFilterChange() {
        if (isAutoplayRunning) pauseAutoplay();

        const query = searchInput.value.toLowerCase().trim();

        const filtered = tourData.filter(event => {
            const matchesText = event.City.toLowerCase().includes(query) ||
                                event.Venue.toLowerCase().includes(query) ||
                                event.DateStr.toLowerCase().includes(query);
            return matchesText;
        });

        currentFilteredData = filtered;

        // Show/hide markers
        tourData.forEach((event, i) => {
            const isMatch = filtered.some(e => e.DateStr === event.DateStr && e.Venue === event.Venue);
            if (isMatch) {
                if (!map.hasLayer(markers[i])) markers[i].addTo(map);
            } else {
                if (map.hasLayer(markers[i])) map.removeLayer(markers[i]);
            }
        });

        // Fade route when filtered
        if (filtered.length < tourData.length && filtered.length > 0) {
            routeLine.setStyle({ opacity: 0.2 });
        } else {
            routeLine.setStyle({ opacity: 0.65 });
        }

        renderTourList(filtered);

        if (filtered.length > 0 && filtered.length < tourData.length) {
            fitMapBounds(filtered);
        } else if (filtered.length === tourData.length) {
            fitMapBounds(tourData);
        }
    }

    function resetFilters() {
        searchInput.value = '';
        handleFilterChange();
        fitMapBounds(tourData);
    }

    // =========================================================================
    // Autoplay
    // =========================================================================
    function startAutoplay() {
        if (isAutoplayRunning) return;

        isAutoplayRunning = true;
        btnAutoplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Touring...';
        btnAutoplay.disabled = true;
        btnPause.disabled = false;

        if (activeIndex === -1 || activeIndex === tourData.length - 1) {
            selectTourStop(0, true);
        } else {
            goToNextStop();
        }

        autoplayInterval = setInterval(goToNextStop, currentAutoplaySpeed);
    }

    function goToNextStop() {
        const next = activeIndex + 1;
        if (next >= tourData.length) {
            pauseAutoplay();
            setTimeout(() => fitMapBounds(tourData), 1000);
            return;
        }
        selectTourStop(next, true);
    }

    function pauseAutoplay() {
        if (!isAutoplayRunning) return;
        isAutoplayRunning = false;
        clearInterval(autoplayInterval);
        autoplayInterval = null;
        btnAutoplay.innerHTML = '<i class="fa-solid fa-play"></i> Resume Journey';
        btnAutoplay.disabled = false;
        btnPause.disabled = true;
    }

    function handleSpeedChange() {
        currentAutoplaySpeed = parseInt(speedRange.value);
        speedLabel.textContent = `${(currentAutoplaySpeed / 1000).toFixed(1)}s`;
        if (isAutoplayRunning) {
            clearInterval(autoplayInterval);
            autoplayInterval = setInterval(goToNextStop, currentAutoplaySpeed);
        }
    }

    // =========================================================================
    // Utilities
    // =========================================================================
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3958.8;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 +
                  Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function calculateTotalDistance(data) {
        let total = 0;
        for (let i = 0; i < data.length - 1; i++) {
            total += calculateDistance(data[i].Latitude, data[i].Longitude,
                                       data[i+1].Latitude, data[i+1].Longitude);
        }
        return total;
    }

    // Auto-fit bounds on window resize with a debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            map.invalidateSize();
            fitMapBounds(currentFilteredData);
        }, 250);
    });
});
