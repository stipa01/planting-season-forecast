// Load the necessary datasets
var startDate = '2008-01-01';
var endDate = '2023-12-31';
var lateStartDate = '2015-03-31';

// Rainfall data
var rainfall = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
                .filterDate(startDate, endDate)
                .select('precipitation');

// EVI data
var evi = ee.ImageCollection('MODIS/061/MOD13Q1')
            .filterDate(startDate, endDate)
            .select('EVI');

// NDVI data
var ndvi = ee.ImageCollection('MODIS/061/MOD13Q1')
            .filterDate(startDate, endDate)
            .select('NDVI');

// Soil Moisture data
var soilMoisture = ee.ImageCollection('NASA/SMAP/SPL4SMGP/007')
                     .filterDate(lateStartDate, endDate)
                     .select('sm_rootzone');

// Land Surface Temperature data
var lst = ee.ImageCollection('MODIS/061/MOD11A2')
            .filterDate(startDate, endDate)
            .select('LST_Day_1km');

// Solar Radiation data
var solarRadiation = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
                       .filterDate(startDate, endDate)
                       .select('surface_solar_radiation_downwards_sum');

// Load Rwanda district boundaries
var rwanda = ee.FeatureCollection("FAO/GAUL/2015/level2")
               .filter(ee.Filter.eq('ADM0_NAME', 'Rwanda'));

// Check the number of districts (should be 30)
print('Rwanda Districts', rwanda.size());  // This should print 30

// Mask the world and keep only Rwanda
var world = ee.Image(1);  // Create an image of value 1 for the whole world
var rwandaMask = world.clip(rwanda);  // Clip the image to the boundary of Rwanda

// Add Rwanda's districts to the map
Map.addLayer(rwanda, {color: 'red'}, 'Rwanda District Boundaries');

// Add the mask for Rwanda
Map.addLayer(rwandaMask, {palette: ['white'], opacity: 0.5}, 'Rwanda Mask');

// Center the map on Rwanda
Map.centerObject(rwanda, 7);  // Adjust zoom level as needed

// Function to reduce data to a time series for all districts
function reduceToTimeSeries(imageCollection, variableName, scale) {
  // Calculate the time series
  var timeseries = imageCollection.map(function(image) {
    // Get the date of the image
    var date = image.date().format('YYYY-MM-dd');

    // Map over each district and calculate the mean for each one
    var districtValues = rwanda.map(function(feature) {
      var mean = image.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: feature.geometry(),
        scale: scale,
        bestEffort: true
      }).get(variableName);

      // Return the district name and the calculated mean value
      return ee.Feature(null, {
        'district': feature.get('ADM2_NAME'),
        'date': date,
        'value': mean
      });
    });

    // Convert the FeatureCollection of district values into a dictionary
    var districtDict = ee.FeatureCollection(districtValues)
        .reduceColumns(ee.Reducer.toList(2), ['district', 'value'])
        .get('list');

    // Convert the result into an Earth Engine list
    districtDict = ee.List(districtDict);

    // Separate district names and values
    var districtNames = districtDict.map(function(item) {
      return ee.List(item).get(0);  // Get district name
    });

    var districtValues = districtDict.map(function(item) {
      return ee.List(item).get(1);  // Get the value for the variable
    });

    // Create a dictionary with the date and district values
    var dict = ee.Dictionary.fromLists(
      ee.List(['date']).cat(districtNames),  // district names as keys
      ee.List([date]).cat(districtValues)    // values (precipitation, EVI, etc.) as entries
    );

    return ee.Feature(null, dict);
  });

  return timeseries;
}

// Reduce the datasets to time series for all districts
var rainfallTimeSeries = reduceToTimeSeries(rainfall, 'precipitation', 5000);
var eviTimeSeries = reduceToTimeSeries(evi, 'EVI', 500);
var ndviTimeSeries = reduceToTimeSeries(ndvi, 'NDVI', 500);
var soilMoistureTimeSeries = reduceToTimeSeries(soilMoisture, 'sm_rootzone', 10000);
var lstTimeSeries = reduceToTimeSeries(lst, 'LST_Day_1km', 1000);
var solarRadiationTimeSeries = reduceToTimeSeries(solarRadiation, 'surface_solar_radiation_downwards_sum', 1000);

// Export the time series to Google Drive
Export.table.toDrive({
  collection: rainfallTimeSeries,
  description: 'RainfallTimeSeries_Districts',
  folder: 'earth-engine-exports',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: eviTimeSeries,
  description: 'EVITimeSeries_Districts',
  folder: 'earth-engine-exports',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: ndviTimeSeries,
  description: 'NDVITimeSeries_Districts',
  folder: 'earth-engine-exports',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: soilMoistureTimeSeries,
  description: 'SoilMoistureTimeSeries_Districts',
  folder: 'earth-engine-exports',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: lstTimeSeries,
  description: 'LSTTimeSeries_Districts',
  folder: 'earth-engine-exports',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: solarRadiationTimeSeries,
  description: 'SolarRadiationTimeSeries_Districts',
  folder: 'earth-engine-exports',
  fileFormat: 'CSV'
});