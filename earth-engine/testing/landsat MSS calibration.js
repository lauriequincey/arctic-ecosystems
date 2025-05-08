// Load Landsat 1 image collection (Level 1)
var collection = ee.ImageCollection('LANDSAT/LM01/C02/T1')
  .filterMetadata('CLOUD_COVER', 'less_than', 30);

// Function to calibrate each image
var calibrateRadiance = function(image) {
  // Extract the necessary metadata from the image properties
  var M_L = image.get('RADIOMETRIC_RESCALING_FACTOR');  // Get rescaling factor (M_L)
  var A_L = image.get('RADIOMETRIC_ADD_FACTORS');  // Get additive factor (A_L)
  
  // Extract additional metadata needed for reflectance conversion
  var solarZenithAngle = image.get('system:solarZenith');  // Solar zenith angle
  var earthSunDistance = image.get('system:EarthSunDistance');  // Earth-Sun distance

  // Apply the calibration formula: L_lambda = M_L * DN + A_L
  var calibratedImage = image.select(['B4', 'B5', 'B6', 'B7']).map(function(band) {
    var bandName = band;
    
    // Apply calibration for each band using extracted metadata
    var M_L_value = ee.Number(M_L);
    var A_L_value = ee.Number(A_L);
    
    // Apply calibration formula: L_lambda = M_L * DN + A_L
    var calibratedBand = image.select([bandName])
      .multiply(M_L_value)
      .add(A_L_value)
      .rename(bandName);
    
    return calibratedBand;
  });
  
  return calibratedImage;
};

// Map the calibration function over the image collection
var calibratedCollection = collection.map(calibrateRadiance);

// Add the calibrated collection to the map for visualization
Map.centerObject(calibratedCollection, 6);
Map.addLayer(calibratedCollection.mean(), {
  bands: ['B5', 'B4', 'B6'], 
  min: 0, 
  max: 255
}, 'Calibrated RGB');