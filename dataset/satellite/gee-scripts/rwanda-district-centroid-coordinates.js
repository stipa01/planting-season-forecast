// Load Rwanda district boundaries
var rwanda = ee.FeatureCollection("FAO/GAUL/2015/level2")
               .filter(ee.Filter.eq('ADM0_NAME', 'Rwanda'));

// Check the number of districts (should be 30)
print('Rwanda Districts', rwanda.size());  // This should print 30

// Function to compute the centroid of each district and extract latitude and longitude
var centroids = rwanda.map(function(feature) {
  var centroid = feature.geometry().centroid();  // Calculate the centroid
  var lonLat = centroid.coordinates();           // Get the longitude and latitude

  return ee.Feature(centroid, {
    'district': feature.get('ADM2_NAME'),        // Preserve the district name
    'province': feature.get('ADM1_NAME'),       // Preserve the province name
    'longitude': lonLat.get(0),                  // Extract longitude
    'latitude': lonLat.get(1)                    // Extract latitude
  });
});

// Print the centroids to check
print('District Centroids:', centroids);

// Export the centroids as a CSV file to Google Drive
Export.table.toDrive({
  collection: centroids,
  description: 'RwandaDistrictCentroidsLongitude_Latitude',
  folder: 'earth-engine-exports',
  fileFormat: 'CSV',
  selectors: ['district', 'province', 'longitude', 'latitude', '.geo']  // Include district name, province name, longitude, latitude
});
