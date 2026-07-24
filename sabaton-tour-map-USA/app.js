document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let tourData = [];
    let markers = [];
    let routeLine = null;
    let activeIndex = -1;
    let autoplayInterval = null;
    let isAutoplayRunning = false;
    let currentAutoplaySpeed = 3000; // ms per stop
    let currentFilteredData = [];

    // Leaflet Map instance
    const map = L.map('map', {
        center: [39.8283, -98.5795], // Geocentroid of USA
        zoom: 4,
        minZoom: 3,
        maxZoom: 12
    });

    // Add CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // DOM Elements
    const tourListContainer = document.getElementById('tour-list');
    const searchInput = document.getElementById('search-input');
    const stateFilter = document.getElementById('state-filter');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const filteredCountBadge = document.getElementById('filtered-count');
    const btnAutoplay = document.getElementById('btn-autoplay');
    const btnPause = document.getElementById('btn-pause');
    const speedRange = document.getElementById('speed-range');
    const speedLabel = document.getElementById('speed-label');
    const statShows = document.getElementById('stat-shows');
    const statStates = document.getElementById('stat-states');
    const statDistance = document.getElementById('stat-distance');

    // Load Tour Data from global TOUR_DATA (injected by data.js)
    // Using a global constant avoids CORS restrictions when opened via file:// protocol
    if (typeof TOUR_DATA !== 'undefined' && Array.isArray(TOUR_DATA)) {
        tourData = TOUR_DATA;
        initializeTourApp();
    } else {
        console.error("Error: TOUR_DATA is not defined. Make sure data.js is loaded before app.js.");
        tourListContainer.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Error loading tour dates. Make sure data.js is present and loaded.</div>`;
    }

    function initializeTourApp() {
        currentFilteredData = [...tourData];
        // 1. Populate UI Stats
        statShows.textContent = tourData.length;
        
        // Count unique states
        const uniqueStates = new Set();
        tourData.forEach(event => {
            const state = getStateFromCity(event.City);
            if (state) uniqueStates.add(state);
        });
        statStates.textContent = uniqueStates.size;

        // Calculate and display cumulative distance
        const totalDist = calculateTotalTourDistance(tourData);
        statDistance.textContent = Math.round(totalDist).toLocaleString();

        // 2. Populate State Filter Dropdown
        const sortedStates = Array.from(uniqueStates).sort();
        sortedStates.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateFilter.appendChild(option);
        });

        // 3. Render Markers and Sidebar Cards
        renderMarkers();
        renderTourList(tourData);
        drawRoute(tourData);

        // Adjust map bounds to show all markers initially
        fitMapBounds(tourData);

        // 4. Attach Event Listeners
        searchInput.addEventListener('input', handleFilterChange);
        stateFilter.addEventListener('change', handleFilterChange);
        btnResetFilters.addEventListener('click', resetFilters);

        btnAutoplay.addEventListener('click', startAutoplay);
        btnPause.addEventListener('click', pauseAutoplay);
        speedRange.addEventListener('input', handleSpeedChange);
    }

    // ==========================================================================
    // Mapping Functions
    // ==========================================================================
    function renderMarkers() {
        tourData.forEach((event, index) => {
            const isStart = index === 0;
            const isEnd = index === tourData.length - 1;
            
            let pinClass = "marker-pin";
            let pulseHtml = "";
            
            if (isStart) {
                pinClass += " start-pin";
                pulseHtml = '<div class="marker-pulse-ring"></div>';
            } else if (isEnd) {
                pinClass += " end-pin";
                pulseHtml = '<div class="marker-pulse-ring end-pulse"></div>';
            }

            // Custom Leaflet DivIcon for heavy-metal numbered pin
            const markerIcon = L.divIcon({
                className: 'custom-map-marker',
                html: `${pulseHtml}<div class="${pinClass}" id="pin-${index}">${index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([event.Latitude, event.Longitude], { icon: markerIcon })
                .addTo(map);

            // Bind Popup
            const gMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.Venue + ', ' + event.City)}`;
            const popupContent = `
                <div class="popup-header">
                    <span class="popup-date">${event.DateStr}</span>
                    <span class="popup-seq">Stop ${index + 1} of ${tourData.length}</span>
                </div>
                <div class="popup-venue">${event.Venue}</div>
                <div class="popup-city">${event.City}</div>
                <div class="popup-actions">
                    <a href="${event.Tickets}" target="_blank" class="btn btn-gold"><i class="fa-solid fa-ticket"></i> Tickets</a>
                    <a href="${gMapsLink}" target="_blank" class="btn btn-secondary"><i class="fa-solid fa-diamond-turn-right"></i> Directions</a>
                </div>
            `;
            marker.bindPopup(popupContent, {
                closeButton: true,
                offset: [0, -5]
            });

            // Marker click interaction
            marker.on('click', () => {
                selectTourStop(index, true); // Select card but don't fly (already centering on click)
            });

            markers.push(marker);
        });
    }

    function drawRoute(data) {
        if (routeLine) {
            map.removeLayer(routeLine);
        }

        const latLngs = data.map(event => [event.Latitude, event.Longitude]);
        
        // Draw route polyline with custom class for CSS animated dashes
        routeLine = L.polyline(latLngs, {
            color: '#f1c40f',
            weight: 3.5,
            opacity: 0.7,
            dashArray: '8, 12',
            className: 'flowing-route'
        }).addTo(map);
    }

    function fitMapBounds(data) {
        if (data.length === 0) return;
        const bounds = L.latLngBounds(data.map(e => [e.Latitude, e.Longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // ==========================================================================
    // Sidebar & UI Functions
    // ==========================================================================
    function renderTourList(data) {
        tourListContainer.innerHTML = '';
        
        if (data.length === 0) {
            tourListContainer.innerHTML = '<div class="no-results">No tour dates found matching your criteria.</div>';
            return;
        }

        data.forEach(event => {
            // Find its original sequence index in tourData
            const originalIndex = tourData.findIndex(e => e.DateStr === event.DateStr && e.City === event.City);
            
            const state = getStateFromCity(event.City);
            const gMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.Venue + ', ' + event.City)}`;
            
            const card = document.createElement('div');
            card.className = `tour-card ${originalIndex === activeIndex ? 'active' : ''}`;
            card.id = `card-${originalIndex}`;
            
            card.innerHTML = `
                <div class="tour-card-header">
                    <div class="tour-card-num-date">
                        <span class="tour-seq">${originalIndex + 1}</span>
                        <span class="tour-date-txt">${event.DateStr}</span>
                    </div>
                    <span class="state-badge">${state || 'USA'}</span>
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

            // Card click behavior
            card.addEventListener('click', () => {
                if (isAutoplayRunning) {
                    pauseAutoplay();
                }
                selectTourStop(originalIndex, true);
            });

            tourListContainer.appendChild(card);
        });

        filteredCountBadge.textContent = `${data.length} show${data.length === 1 ? '' : 's'}`;
    }

    function selectTourStop(index, flyToMarker = true) {
        if (index < 0 || index >= tourData.length) return;

        // 1. Remove active class from previous card and pin
        const prevCard = document.querySelector('.tour-card.active');
        if (prevCard) prevCard.classList.remove('active');
        
        const prevPin = document.querySelector('.marker-pin.active-pin');
        if (prevPin) prevPin.classList.remove('active-pin');

        // Remove active pulse ring if any
        const prevRing = document.getElementById('active-pulse-ring');
        if (prevRing) prevRing.remove();

        // 2. Set new active index
        activeIndex = index;

        // 3. Highlight current card
        const card = document.getElementById(`card-${index}`);
        if (card) {
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // 4. Highlight current map marker pin
        const pin = document.getElementById(`pin-${index}`);
        if (pin) {
            pin.classList.add('active-pin');
            
            // Add a temporary glow ring
            const markerContainer = pin.parentElement;
            const ring = document.createElement('div');
            ring.className = `marker-pulse-ring ${index === tourData.length - 1 ? 'end-pulse' : ''}`;
            ring.id = 'active-pulse-ring';
            markerContainer.insertBefore(ring, pin);
        }

        // 5. Open popup and Fly map
        const event = tourData[index];
        const marker = markers[index];

        if (marker) {
            marker.openPopup();
            
            if (flyToMarker) {
                map.flyTo([event.Latitude, event.Longitude], 7, {
                    animate: true,
                    duration: 1.5
                });
            }
        }
    }

    // ==========================================================================
    // Filter & Search Logic
    // ==========================================================================
    function handleFilterChange() {
        if (isAutoplayRunning) {
            pauseAutoplay();
        }

        const query = searchInput.value.toLowerCase().trim();
        const selectedState = stateFilter.value;

        // Filter the dates list
        const filtered = tourData.filter(event => {
            const matchesQuery = event.City.toLowerCase().includes(query) || 
                                 event.Venue.toLowerCase().includes(query) || 
                                 event.DateStr.toLowerCase().includes(query);
            
            const state = getStateFromCity(event.City);
            const matchesState = !selectedState || state === selectedState;

            return matchesQuery && matchesState;
        });

        // Toggle map markers visibility
        tourData.forEach((event, index) => {
            const isMatch = filtered.some(e => e.DateStr === event.DateStr && e.City === event.City);
            if (isMatch) {
                if (!map.hasLayer(markers[index])) {
                    markers[index].addTo(map);
                }
            } else {
                if (map.hasLayer(markers[index])) {
                    map.removeLayer(markers[index]);
                }
            }
        });

        // Re-draw route path only through matches if filtered, or keep full route
        // We will keep the full tour route drawn but just fade it if filters are active
        if (filtered.length < tourData.length && filtered.length > 0) {
            routeLine.setStyle({ opacity: 0.25 });
        } else {
            routeLine.setStyle({ opacity: 0.7 });
        }

        // Re-render sidebar cards
        renderTourList(filtered);

        currentFilteredData = filtered;

        if (filtered.length > 0 && filtered.length < tourData.length) {
            fitMapBounds(filtered);
        } else if (filtered.length === tourData.length) {
            fitMapBounds(tourData);
        }
    }

    function resetFilters() {
        searchInput.value = '';
        stateFilter.value = '';
        handleFilterChange();
        fitMapBounds(tourData);
    }

    // ==========================================================================
    // Autoplay Cinematic Travel
    // ==========================================================================
    function startAutoplay() {
        if (isAutoplayRunning) return;

        isAutoplayRunning = true;
        btnAutoplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Touring...';
        btnAutoplay.disabled = true;
        btnPause.disabled = false;
        
        // Reset to first stop if we are at the end
        if (activeIndex === -1 || activeIndex === tourData.length - 1) {
            selectTourStop(0, true);
        } else {
            // Otherwise transition to next stop immediately
            goToNextAutoplayStop();
        }

        // Start interval
        autoplayInterval = setInterval(goToNextAutoplayStop, currentAutoplaySpeed);
    }

    function goToNextAutoplayStop() {
        let nextIndex = activeIndex + 1;
        if (nextIndex >= tourData.length) {
            pauseAutoplay();
            // Automatically fit bounds at end of tour
            setTimeout(() => {
                fitMapBounds(tourData);
            }, 1000);
            return;
        }

        selectTourStop(nextIndex, true);
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

        // If running, restart interval with new speed
        if (isAutoplayRunning) {
            clearInterval(autoplayInterval);
            autoplayInterval = setInterval(goToNextAutoplayStop, currentAutoplaySpeed);
        }
    }

    // ==========================================================================
    // Helper & Utility Functions
    // ==========================================================================
    function getStateFromCity(cityStr) {
        // City format is usually: "Dallas, Texas" or "National Harbor, MD"
        const parts = cityStr.split(',');
        if (parts.length > 1) {
            return parts[1].trim();
        }
        return "";
    }

    // Great-Circle distance formula (Haversine)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3958.8; // Earth radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function calculateTotalTourDistance(data) {
        let total = 0;
        for (let i = 0; i < data.length - 1; i++) {
            total += calculateDistance(
                data[i].Latitude, data[i].Longitude,
                data[i+1].Latitude, data[i+1].Longitude
            );
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
