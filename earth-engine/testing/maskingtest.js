
/** Flux Tower **/
var fluxSeSto = ee.Geometry.Point([19.04520892, 68.35594288]);
var fluxSeStoFootprint = fluxSeSto.buffer(200);
Map.addLayer(fluxSeStoFootprint, [], "fluxSeSto footprint");
Map.centerObject(fluxSeStoFootprint, 10);

/** Landsat **/
var landsat = 
    ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
      .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    .merge(
      ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
        .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
        .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'], 
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
        .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    )
    .filterBounds(fluxSeStoFootprint)
    .map(function(image) {
      // Select the quality band from the imagery
      var qa = image.select('QA_PIXEL');
  
      // Extract the bitmasks for cloud and snow
      var bitmaskCloudDilated = 1 << 1;
      var bitmaskcloudCirrus = 1 << 2;
      var bitmaskCloud = 1 << 3;
      var bitmaskCloudShadow = 1 << 4;
      var bitmaskSnow = 1 << 5;
      
      // Apply each bitmask to the image and add together to create a combined mask
      var bitmaskCombined = qa.bitwiseAnd(bitmaskCloudDilated).eq(0)
        .and(qa.bitwiseAnd(bitmaskcloudCirrus).eq(0))
        .and(qa.bitwiseAnd(bitmaskCloud).eq(0))
        .and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
        .and(qa.bitwiseAnd(bitmaskSnow).eq(0));
      
      // Apply combined mask to image
      return image.updateMask(bitmaskCombined);//.copyProperties(image, ['system:time_start']);
    });

Map.addLayer(landsat.first(), [], "Landsat");

/** Sentinel2 **/
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .select(['B2', 'B3', 'B4', 'B8A', 'B11', 'B12', 'QA60', "SCL"],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL', "SCL"])
    .linkCollection(csPlus, ["cs"]) // Use 'cs' or 'cs_cdf', depending on your use case; see docs for guidance: https://medium.com/google-earth/all-clear-with-cloud-score-bd6ee2e2235e: The cs band tends to be more sensitive to haze and cloud edges (which is great if you need only the absolute clearest pixels) while cs_cdf tends to be less sensitive to these low-magnitude spectral changes as well as terrain shadows (potentially giving you more “usable” pixels to work with).
    .filterBounds(fluxSeStoFootprint)
    .filter(ee.Filter.calendarRange(7, 8, 'month'));
Map.addLayer(sentinel2.first(), [], "Sentinel2");

var sentinel2 = sentinel2
  .map(function(image){return image.updateMask(image.select("cs").gte(0.50));}) // The threshold for masking; values between 0.50 and 0.65 generally work well. Higher values will remove thin clouds, haze & cirrus shadows.
  .map(function(image){return image.updateMask(image.select("SCL").eq(11).not());}); // SCL band value for snow
Map.addLayer(sentinel2.first(), [], "Sentinel2Masked");

/** Modis A1 500m **/
function maskModisA1(image) {
  
  var qa = image.select('QA_PIXEL');
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskCloudCirrus = 1 << 9;
  var bitmaskCloudAdjacent = 1 << 13;
  var bitmaskSnowMOD35 = 1 << 12;
  var bitmaskSnowInternal = 1 << 15; // seems more aggressive.
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
    '(Red - NIR) / (Red + NIR)',
    {'Red': image.select('Red'),
     'NIR':  image.select('NIR')}); // replace this with proper NSDI?
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).eq(0)
    .and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
    .and(qa.bitwiseAnd(bitmaskCloudCirrus).eq(0))
    //.and(qa.bitwiseAnd(bitmaskCloudAdjacent).eq(0)) // too aggresive.
    .and(qa.bitwiseAnd(bitmaskSnowMOD35).eq(0))
    .and(qa.bitwiseAnd(bitmaskSnowInternal).eq(0))
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);//.copyProperties(image, ['system:time_start']);
}

var modisA1 = ee.ImageCollection('MODIS/061/MOD09A1')
    .select(['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b05', 'sur_refl_b06', 'StateQA', "SolarZenith", "ViewZenith"],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL', "SolarZenith", "ViewZenith"])
    .merge(
      ee.ImageCollection('MODIS/061/MYD09A1')
      .select(['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b05', 'sur_refl_b06', 'StateQA', "SolarZenith", "ViewZenith"],
              ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL', "SolarZenith", "ViewZenith"]))
    .filterBounds(fluxSeStoFootprint)
    .filter(ee.Filter.date("2010-01-01", "2024-01-01"))
    .filter(ee.Filter.calendarRange(6, 8, 'month'));

Map.addLayer(modisA1.first(), [], "modisA1");
Map.addLayer(modisA1.map(maskModisA1).first(), [], "modisA1 Masked");

// Modis also doesn't have solar angle etc. in properties and instead they are kept in pixels so we add them manually ourselves for our 1 site pixel (at this res)
var modisA1 = modisA1.map(function(image){
  var solarZenith = image.select("SolarZenith").reduceRegion({
    "reducer": ee.Reducer.mean(),
    "geometry": fluxSeStoFootprint,
    "scale": 500
    });
  return image.set(solarZenith);
});
var modisA1 = modisA1.map(function(image){
  var viewZenith = image.select("ViewZenith").reduceRegion({
    "reducer": ee.Reducer.mean(),
    "geometry": fluxSeStoFootprint,
    "scale": 500
    });
  return image.set(viewZenith);
});

/** Modis Q1 250m **/
function maskModisQ1(image) {
  
  var qa = image.select('QA_PIXEL');
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskCloudCirrus = 1 << 9;
  var bitmaskCloudAdjacent = 1 << 13;
  var bitmaskSnowMOD35 = 1 << 12;
  var bitmaskSnowInternal = 1 << 15; // seems more aggressive.
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
      '(Red - NIR) / (Red + NIR)',
      {'Red': image.select('Red'),
       'NIR':  image.select('NIR')});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).eq(0)
    .and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
    .and(qa.bitwiseAnd(bitmaskCloudCirrus).eq(0))
    //.and(qa.bitwiseAnd(bitmaskCloudAdjacent).eq(0)) // too aggresive.
    .and(qa.bitwiseAnd(bitmaskSnowMOD35).eq(0))
    .and(qa.bitwiseAnd(bitmaskSnowInternal).eq(0))
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);//.copyProperties(image, ['system:time_start']);
}

var modisQ1 = ee.ImageCollection("MODIS/061/MOD09Q1")
    .select(['sur_refl_b01', 'sur_refl_b02', 'State'],
            ['Red', 'NIR', 'QA_PIXEL'])
    .merge(
      ee.ImageCollection("MODIS/061/MYD09Q1")
      .select(['sur_refl_b01', 'sur_refl_b02', 'State'],
              ['Red', 'NIR', 'QA_PIXEL']))
    .filterBounds(fluxSeStoFootprint)
    .filter(ee.Filter.date("2010-01-01", "2024-01-01"))
    .filter(ee.Filter.calendarRange(6, 8, 'month'));

Map.addLayer(modisQ1.first(), [], "modisQ1");
Map.addLayer(modisQ1.map(maskModisQ1).first(), [], "modisQ1 Masked");

/** Aster **/
function maskASTER(image) {
  
  // clouds should be...
  //var cloudMask = image.select('Green').gt(50) // ...bright in green
  //  .and(image.select('Red').gt(20)) // ...bright in red
  //  .and(image.select('NIR').gt(50)) // ...bright in NIR
  //  .and(image.select('TIR1').lt(750));// ...dim in TIR

  // GLCM-based cloud and snow removal
  var bandMath = image.expression(
    '(Green + NIR - TIR) / (Green - NIR + TIR)',
    {'Green': image.select('Green'),
     'NIR': image.select('NIR'),
     'TIR':  image.select('TIR1')});
  var glcm = bandMath.unitScale(-1, 1).multiply(255).toInt32().glcmTexture({size: 4}).select('Green_savg');
  var cloudMask = glcm.gt(60)
    .focalMax({ // morphological filter
      radius: 200,
      kernelType: 'circle',
      units: 'meters',
      iterations: 1
    })
    .not()
    .rename('cloudMask');
    
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
    '(Green - NIR) / (Green + NIR)',
    {'Green': image.select('Green'),
     'NIR':  image.select('NIR')});
  
  return image.updateMask(cloudMask.and(terribleSnowIndex.lt(0.4)));
}

var aster = ee.ImageCollection('ASTER/AST_L1T_003')
  .filterBounds(fluxSeStoFootprint)
  .select(['B01', 'B02', 'B3N', /**'B04', 'B05', 'B06', 'B07', 'B08', 'B09',**/ 'B10', 'B11', 'B12', 'B13', 'B14'], // remember SWIR bands failed in 2008!
          ['Green', 'Red', 'NIR', /**'SWIR1', 'SWIR2', 'SWIR3', 'SWIR4', 'SWIR5', 'SWIR6',**/ 'TIR1', 'TIR2', 'TIR3', 'TIR4', 'TIR5']);

Map.addLayer(aster.first(), [], "aster");
Map.addLayer(aster.map(maskASTER).first(), [], "asterMasked");

/** Viirs **/
function maskViirs(image) {
  
  var qa = image.select('QA_Pixel');
  
  var bitmaskCloud = 1 << 2;
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
      '(Red - NIR) / (Red + NIR)',
      {'Red': image.select('Red'),
       'NIR':  image.select('NIR')});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).lte(1)
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}

var viirs = ee.ImageCollection("NASA/VIIRS/002/VNP09GA")
  .select([ //m6 has high radiance fold over issue so is not available: https://rammb.cira.colostate.edu/projects/npp/VIIRS_bands_and_bandwidths.pdf
    'M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M10', 'M11',
    'I1', 'I2', 'I3',
    'SensorAzimuth', 'SensorZenith', 'SolarAzimuth', 'SolarZenith', 'iobs_res', 'num_observations_1km', 'num_observations_500m', 'obscov_1km', 'obscov_500m', 'orbit_pnt', 'QF1'
    ],[
     "SuperBlue1", "SuperBlue2", "Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2", "SWIR3",
     "RedHi", "NIRHi", "SwirHi",
     'SensorAzimuth', 'SensorZenith', 'SolarAzimuth', 'SolarZenith', 'iobs_res', 'num_observations_1km', 'num_observations_500m', 'obscov_1km', 'obscov_500m', 'orbit_pnt', 'QA_Pixel'
     ])
  .filterBounds(fluxSeStoFootprint)
  .filter(ee.Filter.date("2010-01-01", "2024-01-01"))
  .filter(ee.Filter.calendarRange(7, 7, 'month'));
     
Map.addLayer(viirs.first(), [], "viirs");
Map.addLayer(viirs.map(maskViirs).first(), [], "viirsMasked");

/** VIIRS 8-day Best-pixel**/
function maskViirs8day(image) {
  
  var qa = image.select('QA_Pixel');
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskCloudCirrus = 1 << 9;
  var bitmaskCloudAdjacent = 1 << 13;
  var bitmaskSnowMOD35 = 1 << 12;
  var bitmaskSnowInternal = 1 << 15; // seems more aggressive.
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
      '(Red - NIR) / (Red + NIR)',
      {'Red': image.select('Red'),
       'NIR':  image.select('NIR')});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).eq(0)
    .and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
    .and(qa.bitwiseAnd(bitmaskCloudCirrus).eq(0))
    //.and(qa.bitwiseAnd(bitmaskCloudAdjacent).eq(0)) // too aggressive.
    .and(qa.bitwiseAnd(bitmaskSnowMOD35).eq(0))
    .and(qa.bitwiseAnd(bitmaskSnowInternal).eq(0))
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}

// https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP09GA
// could use this instead for precomputed no clouds!https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP09H1#description
// or even this one with precomputed NDVI: https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP13A1
var viirs8day = ee.ImageCollection('NASA/VIIRS/002/VNP09H1')
  .select(['SurfReflect_I1', 'SurfReflect_I2', 'SurfReflect_I3', 'SurfReflect_State_500m'],
          ['Red', 'NIR', 'SWIR', 'QA_Pixel'])
  .filterBounds(fluxSeStoFootprint)
  .filter(ee.Filter.date("2010-01-01", "2024-01-01"))
  .filter(ee.Filter.calendarRange(4, 4, 'month'));
//  .map(maskViirs8day);
  
Map.addLayer(viirs8day.first(), [], "viirs8day");
Map.addLayer(viirs8day.map(maskViirs8day).first(), [], "viirs8dayMasked");


/** AVHRR **/
// Provider's note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
var avhrr = ee.ImageCollection('NOAA/CDR/AVHRR/SR/V5')
  .select(['SREFL_CH1', 'SREFL_CH2', 'SREFL_CH3',
           "BT_CH3", "BT_CH4", "BT_CH5",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA"],
          ['Red', 'NIR', 'SWIR',
           "brightness1", "brightness2", "brightness3",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA_Pixel"])
  .filterBounds(fluxSeStoFootprint)
  .filter(ee.Filter.date("2005-01-01", "2024-01-01"))
  .filter(ee.Filter.calendarRange(7, 7, 'month'));

function maskAvhrr(image) {
  
  var qa = image.select('QA_Pixel');
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskNight = 1 << 6; // No nightime!
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
      '(Red - NIR) / (Red + NIR)',
      {'Red': image.select('Red'),
       'NIR':  image.select('NIR')});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).eq(0)
    .and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
    .and(qa.bitwiseAnd(bitmaskNight).eq(0))
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}

Map.addLayer(avhrr.first(), [], "avhrr");
Map.addLayer(avhrr.map(maskAvhrr).first(), [], "avhrrMasked");























