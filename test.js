// Google Sheets setup
const sheetId = "1oea0EZsCaTb1viVIPzve-80LwA1zhT1ulmZrYn2lBzc";
const sheetName = encodeURIComponent("Réponses au formulaire 1");
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;


let members = [];
let currentIndex = 0;

// Leaflet map setup
const map = L.map('map').setView([51.505, -0.09], 1);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let markersLayer = L.layerGroup();
let markers = L.markerClusterGroup();
map.addLayer(markersLayer);





// Fetch and display data from Google Sheets
function showInfo() {
    console.log('Data fetched from Google Sheets:', data); // Log fetched data to the console
  
    $.ajax({
    type: "GET",
    url: sheetURL,
    dataType: "text",
    success: function (response) {
      let data = $.csv.toObjects(response);
      console.log(data);
      members = data;  // Store members globally
      renderMembersList(members);  // Create the member list
      loadMember(currentIndex);  // Load the first member initially
      addMarkers(members);  // Add map markers for all members
    }
  });
}

// Function to render the list of members in the sidebar
function renderMembersList(members) {
  const memberListElement = document.getElementById('memberList');
  memberListElement.innerHTML = '';  // Clear the list first

  members.forEach(function(member, index) {
    const listItem = `<li onclick="loadMember(${index})">${member.Nom} ${member.Prenom}</li>`;
    memberListElement.innerHTML += listItem;
  });
}


function loadMember(index) {
  const member = members[index];
  console.log(member)
  console.log(index)
  document.getElementById('member-name').textContent = `${member.Nom} ${member.Prenom}`;
  document.getElementById('member-experience').textContent = member.description_perso;
  document.getElementById('member-photo').src = member.photo || 'default-photo.jpg';
}

// Function to go to the previous member
function prevMember() {
  if (currentIndex > 0) {
      currentIndex--;
      loadMember(currentIndex);
  }
}

// Function to go to the next member
function nextMember() {
  if (currentIndex < members.length - 1) {
      currentIndex++;
      loadMember(currentIndex);
  }
}


// Function to add markers for all members on the map
function addMarkers(members) {
  members.forEach(function(member) {
    let lat = parseFloat(member.LatHome);
    let lon = parseFloat(member.LonHome);

    if (!isNaN(lat) && !isNaN(lon)) {
      let marker = L.marker([lat, lon])
        .bindPopup(`
          <b>${member.Nom} ${member.Prenom}</b><br>
          ${member.Poste} at ${member.Entreprise}<br>
          Promotion: ${member.Date_diplomation}<br>
          Contact: ${member.email}<br>
        `);

      marker.options.name = member.Nom;
      markersLayer.addLayer(marker);
      markers.addLayer(marker);
    }
  });

  // Add cluster and search functionality
  map.addLayer(markers);
  const searchControl = new L.Control.Search({
    layer: markersLayer,
    propertyName: 'name',
    moveToLocation: function(latlng, title, map) {
      map.setView(latlng, 14);
    }
  });
  map.addControl(searchControl);
}


// Initialize the map and member list on page load
window.addEventListener('DOMContentLoaded', showInfo);
