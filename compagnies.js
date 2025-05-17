// sheetID you can find in the URL of your spreadsheet after "spreadsheet/d/"
const sheetId = "1oea0EZsCaTb1viVIPzve-80LwA1zhT1ulmZrYn2lBzc";
// sheetName is the name of the TAB in your spreadsheet (default is "Sheet1")
const sheetName = encodeURIComponent("Réponses au formulaire 1");
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

// Initialize the Leaflet map, centered on the world with a default zoom level of 2
const map = L.map('map').setView([51.505, -0.09], 1);

// Add the OpenStreetMap tile layer to the map (background map imagery)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


let markersLayer = L.layerGroup();
let markers = L.markerClusterGroup();

map.addLayer(markersLayer);

// Function to handle the Google Sheet data and place markers on the map
function showInfo(data) {
    console.log('Data fetched from Google Sheets:', data); // Log fetched data to the console
    
    $.ajax({
        type: "GET",
        url: sheetURL,
        dataType: "text",
        success: function (response) {
          // let data = $.csv.toArrays(response);
          let data = $.csv.toObjects(response);
          console.log(data);
          // 'data' is an Array of Objects
          // ADD YOUR CODE HERE
 // Loop through each row of the sheet data
 data.forEach(function(member) {
    // console.log('Processing member:', member);  // Log each member data to see what's being processed

        let lat = parseFloat(member.LatHome);   // Convert latitude to a floating-point number
        let lon = parseFloat(member.LonHome);  // Convert longitude to a floating-point number
    
    // console.log(lat)
    // console.log(lon)
    // Check if the latitude and longitude are valid numbers
    if (!isNaN(lat) && !isNaN(lon)) {
        // Add a marker to the map for each member's location
        let marker = L.marker([lat, lon])
            .bindPopup(`
               <b> ${member.Nom + ' ' + member.Prenom  } </b> <br>
               <b> ${member.Poste + ' chez ' + member.Entreprise} </b> <br>
               <b> Promo  </b> ${member.Date_diplomation}  <br>
               <b> Contact: </b> ${member.email}  <br>
                
            
            
            `);  // Display the member's name and role on clicking the marker

        let listItem = `<li onclick="map.setView([${lat}, ${lon}], 14)">${member.Nom}</li>`;
        document.getElementById('memberList').innerHTML += listItem;

        marker.options.name = member.Nom;
        
        // add markers layers for search options
        markersLayer.addLayer(marker)

        // add markers clusters for clusters options
        markers.addLayer(marker)
    }
    console.log('markers layer is: ', markersLayer)
});
},


        })
        
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