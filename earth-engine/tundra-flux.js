/** Data **/
// Flux Tower
var fluxSeSto = ee.Geometry.Point([19.04520892, 68.35594288]);
var fluxSeStoFootprint = fluxSeSto.buffer(200);

// Landsat
var landsat = 
    ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
      .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_Pixel'])
      .map(function(image) {return image.set("platformID", ee.String("LT04"))})
    .merge(
      ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
        .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_Pixel'])
      .map(function(image) {return image.set("platformID", ee.String("LT05"))})
      )
    .merge(
      ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
        .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'], 
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_Pixel'])
      .map(function(image) {return image.set("platformID", ee.String("LE07"))})
      )
    .merge(
      ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_Pixel'])
      .map(function(image) {return image.set("platformID", ee.String("LC08"))})
      )
    .merge(
      ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
        .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_Pixel'])
      .map(function(image) {return image.set("platformID", ee.String("LC09"))})
      );

// Sentinel2
var sentinel2CloudScore = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .select(['B2', 'B3', 'B4', 'B8A', 'B11', 'B12',
             'QA60', "SCL"],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2',
             'QA_Pixel', "SCL"])
      .map(function(image) {return image.set("platformID", ee.String("S2_SR_HARMONIZED"))})
    .linkCollection(sentinel2CloudScore, ["cs"]); // Use 'cs' or 'cs_cdf', depending on your use case; see docs for guidance: https://medium.com/google-earth/all-clear-with-cloud-score-bd6ee2e2235e: The cs band tends to be more sensitive to haze and cloud edges (which is great if you need only the absolute clearest pixels) while cs_cdf tends to be less sensitive to these low-magnitude spectral changes as well as terrain shadows (potentially giving you more “usable” pixels to work with).

// Aster
var aster = ee.ImageCollection('ASTER/AST_L1T_003')
  .filterBounds(fluxSeStoFootprint)
  .select(['B01', 'B02', 'B3N', /****/ 'B04', 'B05', 'B06', 'B07', 'B08', 'B09',/****/ 'B10', 'B11', 'B12', 'B13', 'B14'],
          ['Green', 'Red', 'NIR', /****/ 'SWIR_1', 'SWIR_2', 'SWIR_3', 'SWIR_4', 'SWIR_5', 'SWIR_6',/****/ 'TIR_1', 'TIR_2', 'TIR_3', 'TIR_4', 'TIR_5'])
      .map(function(image) {return image.set("platformID", ee.String("AST_L1T_003"))})
  .filterDate("2000-03-04", "2008-04-01"); // filter to this date range as SWIR bands failed in 2008! :( https://asterweb.jpl.nasa.gov/swir-alert.asp

// ModisA1 (500m)
var modisA1 = ee.ImageCollection('MODIS/061/MOD09A1')
      .map(function(image) {return image.set("platformID", ee.String("MOD09A1"))})
      .merge(ee.ImageCollection('MODIS/061/MYD09A1')
        .map(function(image) {return image.set("platformID", ee.String("MOD09A1"))})) // Combine aqua and terra
  .select(['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b05', 'sur_refl_b06',
           'StateQA', "SolarZenith", "ViewZenith"],
          ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2',
           'QA_Pixel', "SolarZenith", "ViewZenith"]
           );
    

// ModisQ1 (250m)
var modisQ1 = ee.ImageCollection("MODIS/061/MOD09Q1")
      .map(function(image) {return image.set("platformID", ee.String("MOD09Q1"))})
      .merge(ee.ImageCollection("MODIS/061/MYD09Q1"))
      .map(function(image) {return image.set("platformID", ee.String("MYD09Q1"))}) // Merge aqua and terra
      .select(['sur_refl_b01', 'sur_refl_b02',
               'State'],
              ['Red', 'NIR',
               'QA_Pixel']);

// Avhrr
// Provider's note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
var avhrr = ee.ImageCollection('NOAA/CDR/AVHRR/SR/V5')
  .select(['SREFL_CH1', 'SREFL_CH2', 'SREFL_CH3',
           "BT_CH3", "BT_CH4", "BT_CH5",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA"],
          ['Red', 'NIR', 'SWIR_1',
           "brightness1", "brightness2", "brightness3",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA_Pixel"]
           )
  .map(function(image) {return image.set("platformID", ee.String("AVHRR"))});

// Viirs
var viirs = ee.ImageCollection("NASA/VIIRS/002/VNP09GA")
  .select([ //m6 has high radiance fold over issue so is not available: https://rammb.cira.colostate.edu/projects/npp/VIIRS_bands_and_bandwidths.pdf
    'M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M10', 'M11',
    'I1', 'I2', 'I3',
    'SensorAzimuth', 'SensorZenith', 'SolarAzimuth', 'SolarZenith', 'iobs_res', 'num_observations_1km', 'num_observations_500m', 'obscov_1km', 'obscov_500m', 'orbit_pnt', 'QF1'
    ],[
     "LoSuperBlue1", "LoSuperBlue2", "LoBlue", "LoGreen", "LoRedLo", "LoNIRLo", "LoSWIR_1", "LoSWIR_2", "LoSWIR_3",
     "Red", "NIR", "SWIR_1",
     'SensorAzimuth', 'SensorZenith', 'SolarAzimuth', 'SolarZenith', 'iobs_res', 'num_observations_1km', 'num_observations_500m', 'obscov_1km', 'obscov_500m', 'orbit_pnt', 'QA_Pixel'
     ])
  .map(function(image) {return image.set("platformID", ee.String("VNP09GA"))});

/** Pre-processing **/

// Cloud and Snow Masking
function maskLandsat(image) {
    // Select the quality band from the imagery
    var qa = image.select('QA_Pixel');

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
    return image.updateMask(bitmaskCombined);
  }
function maskSentinel2(image) {
  image.updateMask(image.select("cs").gte(0.50)); // The threshold for masking; values between 0.50 and 0.65 generally work well. Higher values will remove thin clouds, haze & cirrus shadows.
  image.updateMask(image.select("SCL").eq(11).not()); // SCL (predone scene classification) band value for snow, and invert
  return image;
}
function maskAster(image) {
  
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
     'TIR':  image.select('TIR_1')});
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
function maskModis(image) {
  
  var qa = image.select('QA_Pixel');
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskCloudCirrus = 1 << 9;
  var bitmaskCloudAdjacent = 1 << 13;
  var bitmaskSnowMOD35 = 1 << 12;
  var bitmaskSnowInternal = 1 << 15; // seems more aggressive.
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
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
  
  return image.updateMask(bitmaskCombined);
}
function maskAvhrr(image) {
  
  var qa = image.select('QA_Pixel');
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskCloudNight = 1 << 6; // No nightime!
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don't catch.
    '(Red - NIR) / (Red + NIR)',
    {'Red': image.select('Red'),
     'NIR':  image.select('NIR')});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).eq(0)
    .and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
    .and(qa.bitwiseAnd(bitmaskCloudNight).eq(0))
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}
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


// Reflectance Rescaling
//function rescaleLandsat(image) {return image.select('Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2').multiply(0.0000275).subtract(0.2).copyProperties(image, image.propertyNames());} // https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC09_C02_T1_L2#bands
//function rescaleSentinel2(image) {return image.select('Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2').divide(10000).copyProperties(image, image.propertyNames());} // https://docs.sentinel-hub.com/api/latest/data/sentinel-2-l2a/
//var asterCoefB01 = ee.Number(aster.first().get("GAIN_COEFFICIENT_B01"));
//var asterCoefB02 = ee.Number(aster.first().get("GAIN_COEFFICIENT_B02"));
//var asterCoefB3N = ee.Number(aster.first().get("GAIN_COEFFICIENT_B3N"));
//var asterCoefB04 = ee.Number(aster.first().get("GAIN_COEFFICIENT_B04"));
//function rescaleAster(image) {
//  // https://lpdaac.usgs.gov/resources/e-learning/working-aster-l1t-visible-and-near-infrared-vnir-data-r/ AND https://asterweb.jpl.nasa.gov/content/03_data/04_Documents/aster_user_guide_v2.pdf
//
//  // Get gain coefficients from image metadata as server-side ee.Number
//  //var g1 = ee.Number(image.get("GAIN_COEFFICIENT_B01"));
//  //var g2 = ee.Number(image.get("GAIN_COEFFICIENT_B02"));
//  //var g3 = ee.Number(image.get("GAIN_COEFFICIENT_B3N"));
//  //var g11 = ee.Number(image.get("GAIN_COEFFICIENT_B11"));
//  //var g12 = ee.Number(image.get("GAIN_COEFFICIENT_B12"));
//  //var g13 = ee.Number(image.get("GAIN_COEFFICIENT_B13"));
//  //var g14 = ee.Number(image.get("GAIN_COEFFICIENT_B14"));
//  //var g15 = ee.Number(image.get("GAIN_COEFFICIENT_B15"));
//
//  // Apply scaling: (DN - 1) * gain
//  var green = image.select("Green").subtract(1).multiply(asterCoefB01);
//  var red   = image.select("Red").subtract(1).multiply(asterCoefB02);
//  var nir   = image.select("NIR").subtract(1).multiply(asterCoefB3N);
//  //var tir1  = image.select("TIR1").subtract(1).multiply(g11);
//  //var tir2  = image.select("TIR2").subtract(1).multiply(g12);
//  //var tir3  = image.select("TIR3").subtract(1).multiply(g13);
//  //var tir4  = image.select("TIR4").subtract(1).multiply(g14);
//  //var tir5  = image.select("TIR5").subtract(1).multiply(g15);
//
//  // Combine all rescaled bands into one image
//  var scaled = green
//    .addBands(red.rename("Red"))
//    .addBands(nir.rename("NIR"));
//    //.addBands(tir1.rename("TIR1"))
//    //.addBands(tir2.rename("TIR2"))
//    //.addBands(tir3.rename("TIR3"))
//    //.addBands(tir4.rename("TIR4"))
//    //.addBands(tir5.rename("TIR5"));
//
//  // Reattach properties to the rescaled image
//  return scaled.copyProperties(image, image.propertyNames());
//}
//function rescaleModis(image) {return image.select('Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2').divide(10000).copyProperties(image, image.propertyNames());} // https://lpdaac.usgs.gov/documents/306/MOD09_User_Guide_V6.pdf
//function rescaleAvhrr(image) {return image.select('Red', 'NIR', 'SWIR_1').divide(10000).copyProperties(image, image.propertyNames());} // https://developers.google.com/earth-engine/datasets/catalog/NOAA_CDR_AVHRR_SR_V5#bands
//function rescaleViirs(image) {return image.select("SuperBlue1", "SuperBlue2", "Blue", "Green", "RedLo", "NIRLo", "SWIR_1", "SWIR_2", "SWIR3", "Red", "NIR", "Swir").multiply(0.0001).copyProperties(image, image.propertyNames());} // values in metadata/properties


// Create Pixel Resolution Property 
landsat = landsat.map(function(image){return image.set({"pixelResolution": 30});});
sentinel2 = sentinel2.map(function(image){return image.set({"pixelResolution": 10});});
aster = aster.map(function(image){return image.set({"pixelResolution": 15});});
modisA1 = modisA1.map(function(image){return image.set({"pixelResolution": 500});});
modisQ1 = modisQ1.map(function(image){return image.set({"pixelResolution": 250});});
avhrr = avhrr.map(function(image){return image.set({"pixelResolution": 1000});});
viirs = viirs.map(function(image){return image.set({"pixelResolution": 1000});});


// Extract Sun Elevation and Create as Property 
// Why? Some platforms don't have solar elevation angle in the object properties quite like landsat does and some store it as a band. Therefore, we need to add them manually ourselves for each platform.
function extractSunElevSentinel2(image) {
  var solarZenith = image.get("MEAN_SOLAR_ZENITH_ANGLE"); // Get solar zenith property
  var solarElevation = ee.Number(90).subtract(solarZenith); // convert to solar elevation angle (like landsat has)
  return image.set("SUN_ELEVATION", solarElevation); // set as new property
}
function extractSunElevAster(image) {return image.set("SUN_ELEVATION", image.get("SOLAR_ELEVATION"));}
function extractSunElevAvhrr(imageCollection) {
  imageCollection = imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", image.select("SZEN").reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: fluxSeStoFootprint,
      scale: image.get("pixelResolution")
    }).get("SZEN"));
  });
  imageCollection = imageCollection.filter(ee.Filter.notNull(["SUN_ELEVATION"])); // Additional Filtering for Viirs as the solar elevation band can be missing and we need that
  return imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", ee.Number(image.get("SUN_ELEVATION")).divide(100));
  });
}
function extractSunElevModisViirs(imageCollection) {
  imageCollection = imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", image.select("SolarZenith").reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: fluxSeStoFootprint,
      scale: image.get("pixelResolution")
    }).get("SolarZenith"));
  });
  imageCollection = imageCollection.filter(ee.Filter.notNull(["SUN_ELEVATION"])); // Additional Filtering for Viirs as the solar elevation band can be missing and we need that
  return imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", ee.Number(90).subtract(ee.Number(image.get("SUN_ELEVATION")).divide(ee.Number(100))));
  });
}
  

// Add image property to flag if pixels are present under the flux tower footprint
function setEmptyFlag(image) {
  // Adapted/fixed from: https://gis.stackexchange.com/questions/354398/filter-imagecollection-to-images-with-non-masked-coverage-within-aoi-in-earth-en
  var isNotEmpty = image.reduceRegion({
    reducer: ee.Reducer.mean(),//ee.Reducer.sum(), // count doesn't seem to work always and some imagery gets filtered out when it shouldn't
    geometry: fluxSeStoFootprint,
    scale: image.get("pixelResolution"),
  }).values().get(0);
  return image.set('isNotEmpty', isNotEmpty);
}


// Apply Pre-processing and Merge
var imagery =
  landsat.map(maskLandsat)/**.map(rescaleLandsat)**/
  .merge(sentinel2.map(maskSentinel2).map(extractSunElevSentinel2)/**.map(rescaleSentinel2)**/)
  .merge(aster.map(maskAster).map(extractSunElevAster)/**.map(rescaleAster)**/)
  .merge(extractSunElevModisViirs(modisA1).map(maskModis)/**.map(rescaleModis)**/)
  //.merge(modisQ1.map(maskModis)) // really do need the extra bands that ModisA1 gives so I won't use modisQ1. Can't get elevation angles from this one anyway...
  .merge(extractSunElevAvhrr(avhrr).map(maskAvhrr))//.map(rescaleAvhrr) // no green so no mdnwi! Also has vegetation trend detection issues.
  .merge(extractSunElevModisViirs(viirs).map(maskViirs)/**.map(rescaleViirs)**/)
  ////.select(["Green", "Red", "NIR"]) // Homogenise collection to common and only useful bands
  .select(["Red", "NIR", "SWIR_1"]) // Homogenise collection to common and only useful bands
  .filterBounds(fluxSeStoFootprint) // Filter to Site
  //.filter(ee.Filter.calendarRange(5, 10, 'month')) // seems to cover the entire growing season NDVI: 0 in May> 0.7 in Jul > 0 in Oct. But for water we need all year round to capture the snow melt pulse
  .filterDate("1998-01-01", "2002-01-01") // for testing
  //.map(setEmptyFlag).filter(ee.Filter.gt('isNotEmpty', 0)); // Add empty flags and filter by them to get only the images with pixels in our footprint.

/** Processing **/

// Indices
var ndvi = function(image) {
  return image.addBands(image.normalizedDifference(['NIR', 'Red']).rename('ndvi'));
};
var NIRv = function(image) {
  return image.addBands(image.expression(
    '( ( ( NIR - Red ) / ( NIR + Red ) ) - c ) * NIR',
    {'NIR': image.select('NIR'),
     'Red': image.select('Red'),
      "c": 0.08}) // c help remove some affects of bare soil which NDVI suffers from.
      .rename('NIRv')); 
};
var mSavi2 = function(image) {
  var NIR = image.select('NIR');
  var Red = image.select('Red');
  var numerator = ee.Image(0.5).multiply(ee.Image(2).multiply(NIR).add(1));
  var sqrtArg = ee.Image(2).multiply(NIR).add(1).pow(2).subtract(ee.Image(8).multiply(NIR.subtract(Red)));
  var msavi2 = numerator.subtract(sqrtArg.sqrt());
  msavi2 = msavi2.updateMask(sqrtArg.gte(0)); // Mask out invalid sqrt. This is why we do the above steps like so and not as an expression.
  return image.addBands(msavi2.rename('mSavi2'));
};
var mndwi = function(image) {
  return image.addBands(image.expression(
    '( Green - NIR ) / ( Green + NIR)',
    {'NIR': image.select('NIR'),
     'Green': image.select('Green')})
      .rename('mndwi')); 
};
//var pdi = function(image) { // https://link.springer.com/article/10.1007/S00254-006-0544-2 // https://gis.stackexchange.com/questions/307967/calculate-bare-soil-line-intercept-using-r
//  return image.addBands(image.expression(
//    '(NIR - a*Red - b) / sqrt(1 + a^2)',
//    {'NIR': image.select('NIR'),
//     'Red': image.select('Red')})
//      .rename('pdi')); 
//};
var msi = function(image) { // https://link.springer.com/article/10.1007/S00254-006-0544-2 // https://gis.stackexchange.com/questions/307967/calculate-bare-soil-line-intercept-using-r
  return image.addBands(image.expression(
    '(SWIR / NIR)',
    {'SWIR': image.select('SWIR_1'),
     'NIR': image.select('NIR')})
      .rename('msi')); 
};
var lswi = function(image) { // developed for rice
  return image.addBands(image.expression(
    "(NIR - SWIR) / (NIR + SWIR)",
    {'SWIR': image.select('SWIR_1'),
     'NIR': image.select('NIR')})
      .rename('lswi')); 
};
var gvmi = function(image) { // canopy water content
  return image.addBands(image.expression(
    "(NIR + 0.1 - SWIR - 0.02) / (NIR + 0.1 + SWIR + 0.02)",
    {'SWIR': image.select('SWIR_1'),
     'NIR': image.select('NIR')})
      .rename('gvmi')); 
};
var nmdi = function(image) { // Better for distinguishing moisture in both vegetation and soil.
  return image.addBands(image.expression(
    "(NIR - (SWIR1 - SWIR2)) / (NIR + (SWIR1 - SWIR2))",
    {'SWIR': image.select('SWIR_1'),
     'NIR': image.select('NIR')})
      .rename('nmdi')); 
};


// Extract pixel values
var reducer = function(image) {
  
   var bandValues = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: fluxSeStoFootprint,
    scale: image.get("pixelResolution"),
    //crs:,
    //crsTransform:,
    bestEffort: true,
    //maxPixels:,
    //tileScale:
  });
  
  var platformID = ee.Dictionary({"platformID": ee.String(image.get("platformID"))});
  var time = ee.Dictionary({"time": image.get("system:time_start")});
  var solarElevation = ee.Dictionary({"solarElevation": image.get("SUN_ELEVATION")});
  
  return ee.Feature(null, bandValues.combine(platformID).combine(time).combine(solarElevation));
  
};

// Apply Processing
imagery = imagery
  .map(ndvi)
  .map(NIRv)
  .map(mSavi2)
  //.map(mndwi)
  .map(msi)
  .map(lswi)
  .map(gvmi);
  //.map(nmdi);

/** Post-processing **/
var features = imagery.map(reducer).filter(ee.Filter.notNull(["Red", "NIR", "SWIR_1"])); // filter to remove empty rows produced from images with no pixels in my study area.

var asterCoefB01 = ee.Number(aster.first().get("GAIN_COEFFICIENT_B01"));
var asterCoefB02 = ee.Number(aster.first().get("GAIN_COEFFICIENT_B02"));
var asterCoefB3N = ee.Number(aster.first().get("GAIN_COEFFICIENT_B3N"));
var asterCoefB04 = ee.Number(aster.first().get("GAIN_COEFFICIENT_B04"));
function rescaler(featureCollection) {
  var featuresLandsat = featureCollection.filter(
    ee.Filter.or(
      ee.Filter.stringContains("platformID", "LT04"),
      ee.Filter.stringContains("platformID", "LT05"),
      ee.Filter.stringContains("platformID", "LE07"),
      ee.Filter.stringContains("platformID", "LC08"),
      ee.Filter.stringContains("platformID", "LC09")
    )
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).multiply(0.0000275).subtract(0.2));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).multiply(0.0000275).subtract(0.2));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).multiply(0.0000275).subtract(0.2));
    return feature;
  });
  
  var featuresSentinel2 = featureCollection.filter(
      ee.Filter.stringContains("platformID", "S2_SR_HARMONIZED")
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).multiply(0.0000275).subtract(0.2));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).multiply(0.0000275).subtract(0.2));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).multiply(0.0000275).subtract(0.2));
    return feature;
  });
  
  var featuresAster = featureCollection.filter(
      ee.Filter.stringContains("platformID", "AST_L1T_003")
  ).map(function(feature) {
    feature = feature.set("Red", (ee.Number(feature.get("Red")).subtract(1)).multiply(asterCoefB02));
    feature = feature.set("NIR", (ee.Number(feature.get("NIR")).subtract(1)).multiply(asterCoefB3N));
    feature = feature.set("SWIR_1", (ee.Number(feature.get("SWIR_1")).subtract(1)).multiply(asterCoefB04));
    return feature;
  });
  
  var featuresMOD09Q1 = featureCollection.filter(
      ee.Filter.stringContains("platformID", "MOD09Q1")
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).divide(10000));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).divide(10000));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).divide(10000));
    return feature;
  });
  
  var featuresMOD09A1 = featureCollection.filter(
      ee.Filter.stringContains("platformID", "MOD09A1")
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).divide(10000));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).divide(10000));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).divide(10000));
    return feature;
  });
  
  var featuresAvhrr = featureCollection.filter(
      ee.Filter.stringContains("platformID", "AVHRR")
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).divide(10000));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).divide(10000));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).divide(10000));
    return feature;
  });
  
  var featuresVNP09GA = featureCollection.filter(
      ee.Filter.stringContains("platformID", "VNP09GA")
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).divide(10000));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).divide(10000));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).divide(10000));
    return feature;
  });
  
  return ee.FeatureCollection(featuresLandsat.merge(featuresSentinel2).merge(featuresAster).merge(featuresMOD09Q1).merge(featuresMOD09A1).merge(featuresAvhrr).merge(featuresVNP09GA));
  
}
features = rescaler(features);

/** Visualise **/

// Filter Imagery Based on Pixel Count (just to get size, not actually necessary)
//print('No. of Images:', imagery.size());
print('No. of Images:', imagery.size());
print('No. of Images with Pixels under Flux Tower Footprint:', features.size());
print('Image Collection Head:', imagery.limit(5));
print("Feature Collection Head:", features.limit(5));

// Histogram
// Extract the year from the 'system:time_start' property
var imageryWithYear = imagery.map(function(image) {
  var year = ee.Date(image.get('system:time_start')).get('year');
  return image.set('year', year);
});

// Count the number of images per year using aggregate_histogram
var countPerYear = imageryWithYear.aggregate_histogram('year');

// Convert the result into a FeatureCollection for charting
var years = ee.List(countPerYear.keys());
var counts = ee.List(countPerYear.values());

// Convert the years and counts into a FeatureCollection
var yearCountFeatures = years.zip(counts).map(function(item) {
  var year = ee.List(item).get(0);
  var count = ee.List(item).get(1);
  return ee.Feature(null, {'year': year, 'count': count});
});

var yearCountFeatureCollection = ee.FeatureCollection(yearCountFeatures);

// Create a histogram chart (without yProperty)
var chartHistogram = ui.Chart.feature.byFeature({
  features: yearCountFeatureCollection,
  xProperty: 'year'
}).setChartType('ColumnChart')
  .setOptions({
    title: 'Number of Images per Year',
    vAxis: {title: 'Number of Images'},
    hAxis: {title: 'Year'},
    legend: {position: 'none'}
  });

// NDVI Time Series Chart
var chartNdvi = ui.Chart.image.series({
  imageCollection: imagery.filterDate("2010-01-01", "2025-01-01").limit(5000).select('ndvi'),
  region: fluxSeStoFootprint,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'NDVI Time Series at Abisko',
  vAxis: {title: 'NDVI'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 2
});

// NIRv Time Series Chart
var chartNIRv = ui.Chart.image.series({
  imageCollection: imagery.filterDate("2010-01-01", "2025-01-01").limit(5000).select('NIRv'),
  region: fluxSeStoFootprint,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'NIRv Time Series at Abisko',
  vAxis: {title: 'NIRv'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 2
});

// NIRv Time Series Chart
var chartMsavi2 = ui.Chart.image.series({
  imageCollection: imagery.filterDate("2010-01-01", "2025-01-01").limit(5000).select('NIRv'),
  region: fluxSeStoFootprint,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'mndwi Time Series at Abisko',
  vAxis: {title: 'NIRv'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 2
});

// msi Time Series Chart
var chartMsi = ui.Chart.image.series({
  imageCollection: imagery.filterDate("2010-01-01", "2025-01-01").limit(5000).select('msi'),
  region: fluxSeStoFootprint,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'msi Time Series at Abisko',
  vAxis: {title: 'msi'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 2
});

// lswi Time Series Chart
var chartlswi = ui.Chart.image.series({
  imageCollection: imagery.filterDate("2010-01-01", "2025-01-01").limit(5000).select('lswi'),
  region: fluxSeStoFootprint,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'lswi Time Series at Abisko',
  vAxis: {title: 'lswi'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 2
});

// gvmi Time Series Chart
var chartgvmi= ui.Chart.image.series({
  imageCollection: imagery.filterDate("2010-01-01", "2025-01-01").limit(5000).select('gvmi'),
  region: fluxSeStoFootprint,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'gvmi Time Series at Abisko',
  vAxis: {title: 'gvmi'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 2
});


// Print the chart
print(chartHistogram);
print(chartNdvi);
print(chartNIRv);
print(chartMsavi2);
print(chartMsi);
print(chartlswi);
print(chartgvmi);

// Add Map Layers
Map.addLayer(fluxSeStoFootprint, [], "fluxSeSto footprint");
Map.centerObject(fluxSeStoFootprint, 10);
Map.addLayer(imagery.first(), {"bands": ["Red"]}, "imagery grayscale");
Map.addLayer(imagery.first(), {"bands": ["ndvi"], "min": -1, "max": 1}, "imagery ndvi");
Map.addLayer(imagery.first(), {"bands": ["NIRv"], "min": 1000, "max": 4500}, "imagery NIRv");

/** Export **/
Export.table.toDrive({
  collection: features,
  description: 'Pixel_Aggregation_Abisko_Test',
  folder: "tundra-flux",
  fileNamePrefix: "tundra-flux_data",
  fileFormat: 'CSV',
  selectors: ["Red", "NIR", "SWIR_1", "ndvi", "NIRv", "mSavi2", "msi", "lswi", "gvmi", "platformID", "solarElevation", "time"]
});