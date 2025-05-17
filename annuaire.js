// sheetID you can find in the URL of your spreadsheet after "spreadsheet/d/" 
// 2PACX-1vTe08AFR6tKXG2HZnf0_R1D80LJRbbcvC0hbGPCeOlKju9G9RZDMAeQhEehfVeKaZSEAsJKuQZlPFbA
// https://docs.google.com/spreadsheets/d/1MfGjhr7cJbvxpPZ9H5kYzrvjj73-MujS_FgwKuUHxmU/edit?usp=sharing
const sheetId = "1MfGjhr7cJbvxpPZ9H5kYzrvjj73-MujS_FgwKuUHxmU"

// "1oea0EZsCaTb1viVIPzve-80LwA1zhT1ulmZrYn2lBzc";
// sheetName is the name of the TAB in your spreadsheet (default is "Sheet1")
const sheetName = encodeURIComponent("BDD_ESGTD");
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

// Update map initialization with better defaults
const map = L.map('map', {
    center: [46.603354, 1.888334], // Center of France
    zoom: 6,
    minZoom: 2,
    maxZoom: 18,
    zoomControl: false,
    tap: true
}).on('load', function() {
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
});

// Add the OpenStreetMap tile layer to the map (background map imagery)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


let markersLayer = L.layerGroup();
let markers = L.markerClusterGroup();

map.addLayer(markersLayer);

const companyNameMap = new Map(); // Store standardized company names
const cityNameMap = new Map(); // Store standardized city names

function formatCompanyName(name) {
    if (!name) return '';
    
    // Standardize company name
    const standardized = name.trim()
        .toLowerCase()
        // Remove special characters except hyphen and apostrophe
        .replace(/[^\w\s\-']/g, '')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Capitalize first letter of each word
        .replace(/\b\w/g, c => c.toUpperCase());
    
    // Store in map for reference
    companyNameMap.set(standardized, name);
    return standardized;
}

function formatCity(city) {
    if (!city) return '';
    
    // Standardize city name
    const standardized = city.trim()
        .toLowerCase()
        // Remove special characters
        .replace(/[^\w\s\-]/g, '')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Capitalize first letter of each word
        .replace(/\b\w/g, c => c.toUpperCase());
    
    // Store in map for reference
    cityNameMap.set(standardized, city);
    return standardized;
}

// Add this to your data processing function
function processCompanyData(data) {
    const companyStats = new Map();
    
    data.forEach(member => {
        const companyName = formatCompanyName(member.Entreprise);
        const city = formatCity(member['Adresse/Ville']);
        const companyKey = `${companyName}-${city}`;
        
        if (!companyStats.has(companyKey)) {
            companyStats.set(companyKey, {
                name: companyName,
                city: city,
                currentMembers: 0,
                pastMembers: 0,
                totalMembers: 0
            });
        }
        
        const stats = companyStats.get(companyKey);
        if (member['Entreprise_Actuelle'] === member.Entreprise) {
            stats.currentMembers++;
        } else {
            stats.pastMembers++;
        }
        stats.totalMembers++;
    });
    
    return companyStats;
}

// Use this when adding companies to the map
function addCompanyMarker(company, stats) {
    const popupContent = `
        <div class="company-popup">
            <h3>${company.name}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${company.city}</p>
            <div class="company-stats">
                <p><i class="fas fa-users"></i> Membres actuels: ${stats.currentMembers}</p>
                <p><i class="fas fa-history"></i> Anciens membres: ${stats.pastMembers}</p>
                <p><i class="fas fa-chart-bar"></i> Total: ${stats.totalMembers}</p>
            </div>
        </div>
    `;
    // ... rest of your marker creation code ...
}

// Function to handle the Google Sheet data and place markers on the map
function showInfo(data) {
    $.ajax({
        type: "GET",
        url: sheetURL,
        dataType: "text",
        success: function (response) {
            let data = $.csv.toObjects(response);
            
            // Initialize sets to store unique values
            const postes = new Set();
            const villes = new Set();
            const promos = new Set();

            // Clear existing markers
            markersLayer.clearLayers();
            markers.clearLayers();
            document.getElementById('memberList').innerHTML = '';

            // Populate filters with exact field names from spreadsheet
            data.forEach(member => {
                if (member['Poste Occupé']) postes.add(member['Poste Occupé']);
                if (member['Adresse/Ville']) villes.add(member['Adresse/Ville']);
                if (member['Année de diplomation']) promos.add(member['Année de diplomation']);
            });

            // Update stats immediately after data is loaded
            updateMemberStats(data);

            // Rest of your existing code
            populateDropdown('posteFilter', Array.from(postes).sort());
            populateDropdown('villeFilter', Array.from(villes).sort());
            populateDropdown('promoFilter', Array.from(promos).sort());

            addMarkersAndList(data);
            setupFilterListeners(data);

            // Force map refresh after loading data
            setTimeout(() => {
                map.invalidateSize();
                // Center map on France
                map.setView([46.603354, 1.888334], 6);
            }, 100);
        },
        error: function(xhr, status, error) {
            console.error('Error loading data:', error);
        }
    });
}

// Modify the populateDropdown function to use standardized values
function populateDropdown(elementId, values) {
    const dropdown = document.getElementById(elementId);
    const currentValue = dropdown.value;
    const defaultTexts = {
        'posteFilter': 'Chercher par Poste',
        'villeFilter': 'Chercher par Ville',
        'promoFilter': 'Chercher par Promotion',
        'entrepriseFilter': 'Chercher par Entreprise'
    };
    
    // Convert Set to Array, standardize, and sort alphabetically
    const sortedValues = Array.from(values)
        .map(value => {
            if (elementId === 'villeFilter') {
                return formatCity(value);
            } else if (elementId === 'promoFilter') {
                return formatGraduationYear(value);
            } else if (elementId === 'entrepriseFilter') {
                return formatCompanyName(value);
            }
            return value;
        })
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    dropdown.innerHTML = `<option value="">${defaultTexts[elementId]}</option>`;
    sortedValues.forEach(value => {
        dropdown.innerHTML += `<option value="${value}">${value}</option>`;
    });
    dropdown.value = currentValue;
}

function addMarkersAndList(data, filters = {}) {
    markersLayer.clearLayers();
    markers.clearLayers();
    document.getElementById('memberList').innerHTML = '';

    data.forEach(function(member) {
        if (!matchesFilters(member, filters)) return;

        let lat = parseFloat(member.Latitude_Home);
        let lon = parseFloat(member.Longitude_Home);

        if (!isNaN(lat) && !isNaN(lon)) {
            // Create popup content
            const popupContent = createMemberPopup(member);

            // Create marker
            let marker = L.marker([lat, lon])
                .bindPopup(popupContent, {
                    className: 'custom-popup'
                });

            // Add member to list with enhanced styling
            addMemberToList(member, marker);

            // Store member data in marker for later reference
            marker.member = member;
            
            markersLayer.addLayer(marker);
            markers.addLayer(marker);
        }
    });

    // Center map on France if no filters are active
    if (Object.keys(filters).length === 0) {
        map.setView([46.603354, 1.888334], 6);
    }
}

// Update matchesFilters function to use standardized values
function matchesFilters(member, filters) {
    return (!filters.poste || member['Poste Occupé'] === filters.poste) &&
           (!filters.ville || formatCity(member['Adresse/Ville']) === formatCity(filters.ville)) &&
           (!filters.promo || formatGraduationYear(member['Année de diplomation']) === formatGraduationYear(filters.promo));
}

function setupFilterListeners(data) {
    const filters = ['poste', 'ville', 'promo'];
    filters.forEach(filter => {
        document.getElementById(`${filter}Filter`).addEventListener('change', function() {
            const activeFilters = {};
            filters.forEach(f => {
                const value = document.getElementById(`${f}Filter`).value;
                if (value) activeFilters[f] = value;
            });
            addMarkersAndList(data, activeFilters);
        });
    });
    setupFilters(data);
}

function setupFilters(data) {
    // Add reset button functionality
    document.getElementById('resetFilters').addEventListener('click', function() {
        // Reset all filter selects
        document.getElementById('posteFilter').value = '';
        document.getElementById('villeFilter').value = '';
        document.getElementById('promoFilter').value = '';

        // Add animation class
        this.classList.add('rotating');
        setTimeout(() => this.classList.remove('rotating'), 500);

        // Reset the map view and markers
        addMarkersAndList(data);
        if (map) {
            map.setView([46.603354, 1.888334], 6); // Center on France
        }
        
        // Clear any active states
        const activeElements = document.querySelectorAll('.active');
        activeElements.forEach(el => el.classList.remove('active'));
        
        // Refresh the member list
        const memberList = document.getElementById('memberList');
        memberList.innerHTML = '';
        data.forEach(member => {
            addMemberToList(member);
        });
    });
}

function formatGraduationYear(dateString) {
    // If it's already a year (4 digits), return as is
    if (/^\d{4}$/.test(dateString)) {
        return dateString;
    }
    
    // Try to parse the date and extract year
    try {
        const date = new Date(dateString);
        return date.getFullYear().toString();
    } catch (e) {
        return dateString; // Return original if parsing fails
    }
}

function addMemberToList(member, marker) {
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = `
        <h4>${member.Nom} ${member.Prénom}</h4>
        <p class="member-position"><strong>${member['Poste Occupé']}</strong></p>
        <p class="member-company">${formatCompanyName(member.Entreprise)}</p>
        <div class="member-details">
            <div class="member-location">
                <i class="fas fa-location-dot"></i>
                <span>${formatCity(member['Adresse/Ville'])}</span>
            </div>
            <div class="member-promo">
                <i class="fas fa-graduation-cap"></i>
                <span>Promotion ${formatGraduationYear(member['Année de diplomation'])}</span>
            </div>
            <div class="member-links">
                <a href="mailto:${member['Adresse e-mail']}" title="Email">
                    <i class="fas fa-envelope"></i>
                </a>
                <a href="${member['Lien LinkedIn']}" target="_blank" title="LinkedIn">
                    <i class="fab fa-linkedin"></i>
                </a>
            </div>
        </div>
    `;

    // Add click event to highlight member on map
    li.addEventListener('click', () => {
        // Remove active class from all items
        document.querySelectorAll('.member-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        li.classList.add('active');
        
        // Center map and open popup
        const lat = parseFloat(member.Latitude_Home);
        const lon = parseFloat(member.Longitude_Home);
        if (!isNaN(lat) && !isNaN(lon)) {
            map.setView([lat, lon], 13);
            marker.openPopup();
        }
    });

    // Add hover effect
    li.addEventListener('mouseenter', () => {
        marker.openPopup();
    });

    document.getElementById('memberList').appendChild(li);
}

// Add CSS animation for reset button
const style = document.createElement('style');
style.textContent = `
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .rotating i {
        animation: rotate 0.5s ease-in-out;
    }
`;
document.head.appendChild(style);

function createMemberPopup(member) {
    return `
        <div class="member-popup">
            <div class="popup-header">
                <div class="member-main">
                    <h3>${member.Nom} ${member.Prénom}</h3>
                    <span class="member-title">${member['Poste Occupé']}</span>
                </div>
                <div class="member-company-info">
                    <i class="fas fa-building"></i>
                    <span>${member.Entreprise}</span>
                </div>
            </div>
            <div class="popup-body">
                <div class="info-grid">
                    <div class="info-item">
                        <i class="fas fa-location-dot"></i>
                        <span>${member['Adresse/Ville']}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>Promotion ${formatGraduationYear(member['Année de diplomation'])}</span>
                    </div>
                </div>
                <div class="contact-links">
                    <a href="mailto:${member['Adresse e-mail']}" class="contact-button email">
                        <i class="fas fa-envelope"></i>
                        <span>Email</span>
                    </a>
                    <a href="${member['Lien LinkedIn']}" target="_blank" class="contact-button linkedin">
                        <i class="fab fa-linkedin"></i>
                        <span>LinkedIn</span>
                    </a>
                </div>
            </div>
        </div>`;
}

function createCompanyPopup(company, stats) {
    return `
        <div class="company-popup">
            <div class="popup-header">
                <h3>${company.name}</h3>
                <div class="company-location">
                    <i class="fas fa-location-dot"></i>
                    <span>${company.city}</span>
                </div>
            </div>
            <div class="popup-body">
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value">${stats.currentMembers}</div>
                        <div class="stat-label">Actuels</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.pastMembers}</div>
                        <div class="stat-label">Anciens</div>
                    </div>
                    <div class="stat-box total">
                        <div class="stat-value">${stats.totalMembers}</div>
                        <div class="stat-label">Total Membres</div>
                    </div>
                </div>
            </div>
        </div>`;
}

function updateMemberStats(data) {
    // Count unique cities
    const cities = new Set(data.map(member => 
        formatCity(member['Adresse/Ville'])).filter(Boolean));
    
    // Count unique promos
    const promos = new Set(data.map(member => 
        formatGraduationYear(member['Année de diplomation'])).filter(Boolean));

    // Update DOM elements
    const totalMembersElement = document.getElementById('totalMembers');
    const totalPromosElement = document.getElementById('totalPromos');
    const totalCitiesElement = document.getElementById('totalCities');

    if (totalMembersElement) totalMembersElement.textContent = data.length;
    if (totalPromosElement) totalPromosElement.textContent = promos.size;
    if (totalCitiesElement) totalCitiesElement.textContent = cities.size;

    // Debug log to verify counts
    console.log('Stats Update:', {
        members: data.length,
        cities: cities.size,
        promos: promos.size
    });
}

let searchControl = new L.Control.Search({
    layer: markersLayer,  // Here, you specify the layer to search within
    propertyName: 'name',  // Field to search by (e.g., name or another property)
    moveToLocation: function(latlng,title, map) {
        map.setView(latlng, 14); // Zoom in when a result is found
    }
});  

// add markers clusters
map.addLayer(markers)
// Add the search control to the map
map.addControl(searchControl);


// Call the init function when the page loads
window.addEventListener('DOMContentLoaded', showInfo);

// Add resize handler at the end of the file
window.addEventListener('resize', () => {
    if (map) {
        map.invalidateSize();
    }
});