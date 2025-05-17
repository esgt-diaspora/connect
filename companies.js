document.documentElement.classList.add('ontouchstart' in window ? 'touch' : 'no-touch');

//https://docs.google.com/spreadsheets/d/1vFkuYxiSxJYIno_2OVuqcLQxUJuf4I4eX7uIxK7a5rY/edit?usp=sharing
const sheetId = "1vFkuYxiSxJYIno_2OVuqcLQxUJuf4I4eX7uIxK7a5rY";
const sheetName = encodeURIComponent("BDD_Entreprises");
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
console.log('Sheet URL:', sheetURL); // Debug log

// Initialize map
const map = L.map('map', {
    center: [46.603354, 1.888334],
    zoom: 6,
    zoomControl: false, // We'll add it manually in a better position for mobile
    tap: true // Enable tap handler for touch devices
});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

L.control.zoom({
    position: 'topright'
}).addTo(map);

let markersLayer = L.layerGroup();
let markers = L.markerClusterGroup({
    disableClusteringAtZoom: 7,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 30
});
map.addLayer(markersLayer);

function processCompanies(data) {
    const companiesMap = new Map();
    
    data.forEach(member => {
        const positions = [
            { 
                type: 'Stage_IG3', 
                company: member['Entreprise stage IG3'], 
                ville: member['Ville Stage IG3'],
                location: member['Loc_Stage_IG3'],
                contact: member['Contact Stage IG3']
            },
            { 
                type: 'Stage_IG4', 
                company: member['Entreprise Stage IG4'], 
                ville: member['Ville Stage IG4'],
                location: member['Loc_Stage_IG4'],
                contact: member['Contact Stage IG4']
            },
            { 
                type: 'TFE', 
                company: member['Stage TFE'], 
                ville: member['Ville Stage TFE'],
                location: member['Loc_TFE'],
                contact: member['Contact Stage TFE']
            },
            { 
                type: 'Emploi_1', 
                company: member['Entreprise 1'], 
                ville: member['Ville Entreprise 1'],
                location: member['Loc_Entreprise_1'],
                contact: member['Contact Entreprise 1']
            },
            { 
                type: 'Emploi_2', 
                company: member['Entreprise 2'], 
                ville: member['Ville Entreprise 2'],
                location: member['Lon_Entreprise_2'], // Note: This seems to be a typo in the sheet header
                contact: member['Contact Entreprise 2']
            },
            { 
                type: 'Emploi_3', 
                company: member['Entreprise 3'], 
                ville: member['Ville Entreprise 3'],
                location: null, // No location column for Entreprise 3
                contact: member['Contact Entreprise 3']
            },
            { 
                type: 'Emploi_Actuel', 
                company: member['Entreprise Actuelle'], 
                ville: member['Ville Entreprise Actuelle'],
                location: member['Loc_Entreprise_Actuelle'],
                contact: null
            }
        ];

        positions.forEach(pos => {
            if (pos.company && pos.location) {
                const key = `${pos.company}-${pos.ville}`;
                const [lat, lon] = pos.location.split(',').map(coord => parseFloat(coord.trim()));
                
                if (!companiesMap.has(key)) {
                    companiesMap.set(key, {
                        name: pos.company,
                        ville: pos.ville,
                        lat: lat,
                        lon: lon,
                        types: new Set([pos.type]),
                        members: new Set([{
                            name: `${member.Nom} ${member.Prénom}`,
                            poste: member.Poste_Actuel,
                            linkedin: member.Lien_LinkedIn
                        }]),
                        contact: pos.contact
                    });
                } else {
                    const company = companiesMap.get(key);
                    company.types.add(pos.type);
                    company.members.add({
                        name: `${member.Nom} ${member.Prénom}`,
                        poste: member.Poste_Actuel,
                        linkedin: member.Lien_LinkedIn
                    });
                }
            }
        });
    });

    return Array.from(companiesMap.values());
}

function addCompanyMarkersAndList(companies, filters = {}) {
    // Clear existing markers
    markersLayer.clearLayers();
    markers.clearLayers();
    document.getElementById('companyList').innerHTML = '';

    // Create bounds for zooming
    const bounds = L.latLngBounds();
    let hasMarkers = false;

    // Filter and add markers
    companies.forEach(company => {
        if (!matchesFilters(company, filters)) return;

        let marker = L.marker([company.lat, company.lon])
            .bindPopup(createCompanyPopup(company));

        markers.addLayer(marker);
        markersLayer.addLayer(marker);

        // Extend bounds with marker position
        bounds.extend([company.lat, company.lon]);
        hasMarkers = true;

        // Add to company list
        document.getElementById('companyList').innerHTML += `
            <li class="company-item" data-lat="${company.lat}" data-lon="${company.lon}">
                <h4>${company.name}</h4>
                <div class="company-location">
                    <i class="fas fa-location-dot"></i>
                    <p>${company.ville}</p>
                </div>
                <div class="company-types">
                    ${Array.from(company.types).map(type => 
                        `<span class="company-type-tag">${type}</span>`
                    ).join('')}
                </div>
                <div class="company-members-count">
                    <i class="fas fa-users"></i>
                    <span>${company.members.size} membres</span>
                </div>
            </li>
        `;
    });

    // Zoom to bounds if we have markers and filters are active
    if (hasMarkers && (filters.stage || filters.entreprise || filters.ville)) {
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 13,
            animate: true,
            duration: 1
        });
    } else if (!hasMarkers) {
        // Reset to default view if no markers
        map.setView([46.603354, 1.888334], 6);
    }

    // Update click handlers for list items
    document.querySelectorAll('.company-item').forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            map.setView([lat, lon], 13, {
                animate: true,
                duration: 1
            });
        });
    });
}

// Update the matchesFilters function to handle multiple employment types
function matchesFilters(company, filters) {
    const matchStage = !filters.stage || 
        (filters.stage.includes(',') ? 
            filters.stage.split(',').some(type => company.types.has(type)) : 
            company.types.has(filters.stage));
    const matchEntreprise = !filters.entreprise || company.name === filters.entreprise;
    const matchVille = !filters.ville || company.ville === filters.ville;

    return matchStage && matchEntreprise && matchVille;
}

// Update filter options
function setupFilters() {
    const stageFilter = document.getElementById('stageFilter');
    stageFilter.innerHTML = `
        <option value="">Type de Stage/Emploi</option>
        <option value="Stage_IG3">Stage IG3</option>
        <option value="Stage_IG4">Stage IG4</option>
        <option value="TFE">TFE</option>
        <option value="Emploi_1,Emploi_2,Emploi_3">Autres emplois effectués</option>
        <option value="Emploi_Actuel">Emploi Actuel</option>
    `;
}

// Add this function to setup filters
function setupFilters(companies) {
    // Get unique values for each filter
    const entreprises = new Set();
    const villes = new Set();
    
    companies.forEach(company => {
        // Add company name to entreprises set
        if (company.name) entreprises.add(company.name);
        // Add ville to villes set
        if (company.ville) villes.add(company.ville);
    });

    // Populate enterprise filter
    const entrepriseFilter = document.getElementById('entrepriseFilter');
    entrepriseFilter.innerHTML = '<option value="">Chercher par Entreprise</option>';
    Array.from(entreprises).sort().forEach(entreprise => {
        entrepriseFilter.innerHTML += `<option value="${entreprise}">${entreprise}</option>`;
    });

    // Populate ville filter
    const villeFilter = document.getElementById('villeFilter');
    villeFilter.innerHTML = '<option value="">Chercher par Ville</option>';
    Array.from(villes).sort().forEach(ville => {
        villeFilter.innerHTML += `<option value="${ville}">${ville}</option>`;
    });

    // Add event listeners for filters
    ['stageFilter', 'entrepriseFilter', 'villeFilter'].forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', function() {
            const filters = {
                stage: document.getElementById('stageFilter').value,
                entreprise: document.getElementById('entrepriseFilter').value,
                ville: document.getElementById('villeFilter').value
            };
            addCompanyMarkersAndList(companies, filters);
        });
    });

    // Add reset button functionality
    document.getElementById('resetFilters').addEventListener('click', function() {
        // Reset all filter selects
        document.getElementById('stageFilter').value = '';
        document.getElementById('entrepriseFilter').value = '';
        document.getElementById('villeFilter').value = '';

        // Add animation class
        this.classList.add('rotating');
        setTimeout(() => this.classList.remove('rotating'), 500);

        // Reset the map view with animation
        map.setView([46.603354, 1.888334], 6, {
            animate: true,
            duration: 1
        });
        
        // Reset markers
        addCompanyMarkersAndList(companies, {});
    });
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

// Add resize handler
window.addEventListener('resize', function() {
    if (map) {
        map.invalidateSize();
    }
});

// Initialize the map when the page loads
$.ajax({
    type: "GET",
    url: sheetURL,
    dataType: "text",
    success: function(response) {
        let data = $.csv.toObjects(response);
        const companies = processCompanies(data);
        addCompanyMarkersAndList(companies);
        setupFilters(companies);
        updateCompanyStats(data);
    }
});

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
                totalMembers: 0,
                members: new Set() // Track unique members
            });
        }
        
        const stats = companyStats.get(companyKey);
        stats.members.add(member['Adresse e-mail']); // Use email as unique identifier
        
        if (formatCompanyName(member['Entreprise_Actuelle']) === companyName) {
            stats.currentMembers++;
        } else {
            stats.pastMembers++;
        }
    });
    
    // Update total members based on unique count
    companyStats.forEach(stats => {
        stats.totalMembers = stats.members.size;
        delete stats.members; // Clean up temporary set
    });
    
    return companyStats;
}

// Add this to your filter setup
function setupCompanyFilters(data) {
    const filterSelect = document.getElementById('stageFilter');
    filterSelect.addEventListener('change', function() {
        const selectedType = this.value;
        const filteredData = data.filter(member => {
            if (!selectedType) return true;
            
            const company = formatCompanyName(member.Entreprise);
            const city = formatCity(member['Adresse/Ville']);
            
            switch(selectedType) {
                case 'Stage_IG3':
                    return member.Stage_IG3 && formatCompanyName(member.Stage_IG3) === company;
                case 'Stage_IG4':
                    return member.Stage_IG4 && formatCompanyName(member.Stage_IG4) === company;
                case 'TFE':
                    return member.TFE && formatCompanyName(member.TFE) === company;
                case 'Emploi_1':
                    return member.Entreprise_1 && formatCompanyName(member.Entreprise_1) === company;
                default:
                    return true;
            }
        });
        
        updateCompanyMarkers(processCompanyData(filteredData));
    });
}

// Update the createCompanyPopup function
function createCompanyPopup(company) {
    return `
        <div class="company-popup">
            <div class="popup-header">
                <h3>${company.name}</h3>
                <div class="company-meta">
                    <div class="company-location">
                        <i class="fas fa-location-dot"></i>
                        <span>${company.ville}</span>
                    </div>
                    <div class="company-count">
                        <i class="fas fa-users"></i>
                        <span>${company.members.size} membres</span>
                    </div>
                </div>
            </div>
            <div class="popup-body">
                ${company.contact ? `
                    <div class="contact-section">
                        <h4>Contact</h4>
                        <p><i class="fas fa-address-card"></i> ${company.contact}</p>
                    </div>
                ` : ''}
                <div class="members-section">
                    <h4>Membres présents</h4>
                    <ul>
                        ${Array.from(company.members).map(member => `
                            <li>
                                <div class="member-info">
                                    <span class="member-name">${member.name}</span>
                                    ${member.linkedin ? `
                                        <a href="${member.linkedin}" target="_blank" class="linkedin-link">
                                            <i class="fab fa-linkedin"></i>
                                        </a>
                                    ` : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>`;
}

// Sort companies alphabetically
function sortCompanies(companies) {
    return [...companies].sort((a, b) => {
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
}

// Update the stats calculation
function updateCompanyStats(data) {
    let totalCompanies = 0;
    const uniqueCompanies = new Set();
    const uniqueCities = new Set();
    const members = new Set();

    data.forEach(member => {
        // Count companies from all positions
        [
            member['Entreprise stage IG3'],
            member['Entreprise Stage IG4'],
            member['Stage TFE'],
            member['Entreprise 1'],
            member['Entreprise 2'],
            member['Entreprise 3'],
            member['Entreprise Actuelle']
        ].forEach(company => {
            if (company) uniqueCompanies.add(company);
        });

        // Count unique cities
        [
            member['Ville Stage IG3'],
            member['Ville Stage IG4'],
            member['Ville Stage TFE'],
            member['Ville Entreprise 1'],
            member['Ville Entreprise 2'],
            member['Ville Entreprise 3'],
            member['Ville Entreprise Actuelle']
        ].forEach(ville => {
            if (ville) uniqueCities.add(ville);
        });

        // Count unique members
        if (member['Email']) members.add(member['Email']);
    });

    // Update DOM
    document.getElementById('totalCompanies').textContent = uniqueCompanies.size;
    document.getElementById('totalEmployees').textContent = members.size;
    document.getElementById('totalCities').textContent = uniqueCities.size;
}

// Make sure to call updateCompanyStats in your data loading function
function processData(data) {
    // ...existing code...
    updateCompanyStats(data);
    // ...existing code...
}