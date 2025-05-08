/** User Inputs **/
var fluxCoords = ee.Geometry.Point([19.04520892, 68.35594288]);
var fluxBuffer = 200;

var bands = ["Red", "NIR", "SWIR_1"];

/** Data **/
var fluxFootprint = fluxCoords.buffer(fluxBuffer);

var landsat = 
  ee.ImageCollection("LANDSAT/LT04/C02/T1_L2")
    .select(["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7", "QA_PIXEL"],
          ["Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2", "QA_Pixel"])
    .map(function(image) {return image.set("platformID", ee.String("LT04"))})
  .merge(
    ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
      .select(["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7", "QA_PIXEL"],
              ["Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2", "QA_Pixel"])
    .map(function(image) {return image.set("platformID", ee.String("LT05"))}))
  .merge(
    ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
      .select(["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7", "QA_PIXEL"], 
              ["Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2", "QA_Pixel"])
    .map(function(image) {return image.set("platformID", ee.String("LE07"))}))
  .merge(
    ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
      .select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7", "QA_PIXEL"],
              ["Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2", "QA_Pixel"])
    .map(function(image) {return image.set("platformID", ee.String("LC08"))}))
  .merge(
    ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
      .select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7", "QA_PIXEL"],
              ["Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2", "QA_Pixel"])
    .map(function(image) {return image.set("platformID", ee.String("LC09"))}));

var sentinel2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .select(["B2", "B3", "B4", "B8", "B11", "B12",
           "QA60", "SCL"],
          ["Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2",
           "QA_Pixel", "SCL"])
    .map(function(image) {return image.set("platformID", ee.String("S2_SR_HARMONIZED"))})
  .linkCollection(ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED"), ["cs"]); // Use "cs" or "cs_cdf", depending on your use case; see docs for guidance: https://medium.com/google-earth/all-clear-with-cloud-score-bd6ee2e2235e: The cs band tends to be more sensitive to haze and cloud edges (which is great if you need only the absolute clearest pixels) while cs_cdf tends to be less sensitive to these low-magnitude spectral changes as well as terrain shadows (potentially giving you more “usable” pixels to work with).

var hlsS30 = 
  ee.ImageCollection("NASA/HLS/HLSS30/v002")
    .select(["B1", "B2", "B3", "B4", "B5", "B6", "B7",
             "Fmask", "SZA"],
            ["Coastal_Aerosol", "Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2",
             "QA_Pixel", "SZA"])
    .map(function(image) {return image.set("platformID", ee.String("HLSL30"))})
    .merge(
      ee.ImageCollection("NASA/HLS/HLSL30/v002")
        .select(["B1", "B2", "B3", "B4", "B5", "B6", "B7",
                   "Fmask", "SZA"],
                  ["Coastal_Aerosol", "Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2",
                   "QA_Pixel", "SZA"])
        .map(function(image) {return image.set("platformID", ee.String("HLSS30"))})
    );

var aster = ee.ImageCollection("ASTER/AST_L1T_003")
  .select(["B01", "B02", "B3N", /****/ "B04", "B05", "B06", "B07", "B08", "B09",/****/ "B10", "B11", "B12", "B13", "B14"],
          ["Green", "Red", "NIR", /****/ "SWIR_1", "SWIR_2", "SWIR_3", "SWIR_4", "SWIR_5", "SWIR_6",/****/ "TIR_1", "TIR_2", "TIR_3", "TIR_4", "TIR_5"])
      .map(function(image) {return image.set("platformID", ee.String("AST_L1T_003"))})
  .filterDate("2000-03-04", "2008-04-01"); // filter to this date range as SWIR bands failed in 2008! :( https://asterweb.jpl.nasa.gov/swir-alert.asp

var modisA1 = ee.ImageCollection("MODIS/061/MOD09A1")
  .map(function(image) {return image.set("platformID", ee.String("MOD09A1"))})
  .merge(ee.ImageCollection("MODIS/061/MYD09A1")
    .map(function(image) {return image.set("platformID", ee.String("MYD09A1"))})) // Combine aqua and terra
    .select(["sur_refl_b03", "sur_refl_b04", "sur_refl_b01", "sur_refl_b02", "sur_refl_b05", "sur_refl_b06",
             "StateQA", "SolarZenith", "ViewZenith"],
            ["Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2",
             "QA_Pixel", "SolarZenith", "ViewZenith"]);

var avhrr = ee.ImageCollection("NOAA/CDR/AVHRR/SR/V5")// Provider"s note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
  .select(["SREFL_CH1", "SREFL_CH2", "SREFL_CH3",
           "BT_CH3", "BT_CH4", "BT_CH5",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA"],
          ["Red", "NIR", "SWIR_1",
           "brightness1", "brightness2", "brightness3",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA_Pixel"])
  .map(function(image) {return image.set("platformID", ee.String("AVHRR"))});

var viirs = ee.ImageCollection("NASA/VIIRS/002/VNP09GA") // Provider"s note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
  .select(["M1", "M2", "M3", "M4", "M5", "M7", "M8", "M10", "M11",
           "I1", "I2", "I3",
           "SensorAzimuth", "SensorZenith", "SolarAzimuth", "SolarZenith", "iobs_res", "num_observations_1km", "num_observations_500m", "obscov_1km", "obscov_500m", "orbit_pnt", "QF1"],
           ["LoSuperBlue1", "LoSuperBlue2", "LoBlue", "LoGreen", "LoRedLo", "LoNIRLo", "LoSWIR_1", "LoSWIR_2", "LoSWIR_3",
            "Red", "NIR", "SWIR_1",
            "SensorAzimuth", "SensorZenith", "SolarAzimuth", "SolarZenith", "iobs_res", "num_observations_1km", "num_observations_500m", "obscov_1km", "obscov_500m", "orbit_pnt", "QA_Pixel"])
  .map(function(image) {return image.set("platformID", ee.String("VNP09GA"))});

/** Create Pixel Resolution Property **/
function setPixResProp(pixRes) {
  return function(image) {
    return image.set({"pixelResolution": pixRes});
  };
}

/** Extract Sun Elevation and Create as Property **/
// Why? Some platforms don"t have solar elevation angle in the object properties quite like landsat does and some store it as a band. Therefore, we need to add them manually ourselves for each platform.
function setSunElevSentinel2(image) {
  var solarZenith = image.get("MEAN_SOLAR_ZENITH_ANGLE"); // Get solar zenith property
  var solarElevation = ee.Number(90).subtract(solarZenith); // convert to solar elevation angle (like landsat has)
  return image.set("SUN_ELEVATION", solarElevation); // set as new property
}
function setSunElevAster(image) {return image.set("SUN_ELEVATION", image.get("SOLAR_ELEVATION"));}

function setSunElevAvhrr(imageCollection) {
  imageCollection = imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", image.select("SZEN").reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: fluxFootprint,
      scale: image.get("pixelResolution")
    }).get("SZEN"));
  });
  imageCollection = imageCollection.filter(ee.Filter.notNull(["SUN_ELEVATION"])); // Additional Filtering for Viirs as the solar elevation band can be missing and we need that
  return imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", ee.Number(image.get("SUN_ELEVATION")).divide(100));
  });
}
function setSunElevModisViirs(imageCollection) {
  imageCollection = imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", image.select("SolarZenith").reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: fluxFootprint,
      scale: image.get("pixelResolution")
    }).get("SolarZenith"));
  });
  imageCollection = imageCollection.filter(ee.Filter.notNull(["SUN_ELEVATION"])); // Additional Filtering for Viirs as the solar elevation band can be missing and we need that
  return imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", ee.Number(90).subtract(ee.Number(image.get("SUN_ELEVATION")).divide(ee.Number(100))));
  });
}

/** Extract Time of Day **/
// TIMEOFDAY band for avhrr
//function setSunElevModisViirs(imageCollection) {
//  imageCollection = imageCollection.map(function(image) {
//    return image.set("SUN_ELEVATION", image.select("SolarZenith").reduceRegion({
//      reducer: ee.Reducer.mean(),
//      geometry: fluxFootprint,
//      scale: image.get("pixelResolution")
//    }).get("SolarZenith"));
//  });

/** Cloud and Snow Masking **/
function maskLandsat(image) {
    // Select the quality band from the imagery
    var qa = image.select("QA_Pixel");

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
  image = image.updateMask(image.select("cs").gte(0.50)); // The threshold for masking; values between 0.50 and 0.65 generally work well. Higher values will remove thin clouds, haze & cirrus shadows.
  image = image.updateMask(image.select("SCL").eq(11).not()); // SCL (predone scene classification) band value for snow, and invert
  return image;
}
function maskAster(image) {
  
  // clouds should be...
  //var cloudMask = image.select("Green").gt(50) // ...bright in green
  //  .and(image.select("Red").gt(20)) // ...bright in red
  //  .and(image.select("NIR").gt(50)) // ...bright in NIR
  //  .and(image.select("TIR1").lt(750));// ...dim in TIR

  // GLCM-based cloud and snow removal
  var bandMath = image.expression(
    "(Green + NIR - TIR) / (Green - NIR + TIR)",
    {"Green": image.select("Green"),
     "NIR": image.select("NIR"),
     "TIR":  image.select("TIR_1")});
  var glcm = bandMath.unitScale(-1, 1).multiply(255).toInt32().glcmTexture({size: 4}).select("Green_savg");
  var cloudMask = glcm.gt(60)
    .focalMax({ // morphological filter
      radius: 200,
      kernelType: "circle",
      units: "meters",
      iterations: 1
    })
    .not()
    .rename("cloudMask");
    
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don"t catch.
    "(Green - NIR) / (Green + NIR)",
    {"Green": image.select("Green"),
     "NIR":  image.select("NIR")});
  
  return image.updateMask(cloudMask.and(terribleSnowIndex.lt(0.4)));
}
function maskModis(image) {
  
  var qa = image.select("QA_Pixel");
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskCloudCirrus = 1 << 9;
  var bitmaskCloudAdjacent = 1 << 13;
  var bitmaskSnowMOD35 = 1 << 12;
  var bitmaskSnowInternal = 1 << 15; // seems more aggressive.
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don"t catch.
    "(Red - NIR) / (Red + NIR)",
    {"Red": image.select("Red"),
     "NIR":  image.select("NIR")});
  
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
  
  var qa = image.select("QA_Pixel");
  
  var bitmaskCloud = 1 << 1;
  var bitmaskCloudShadow = 1 << 2;
  var bitmaskCloudNight = 1 << 6; // No nightime!
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don"t catch.
    "(Red - NIR) / (Red + NIR)",
    {"Red": image.select("Red"),
     "NIR":  image.select("NIR")});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).eq(0)
    .and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
    .and(qa.bitwiseAnd(bitmaskCloudNight).eq(0))
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}
function maskViirs(image) {
  
  var qa = image.select("QA_Pixel");
  
  var bitmaskCloud = 1 << 2;
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don"t catch.
      "(Red - NIR) / (Red + NIR)",
      {"Red": image.select("Red"),
       "NIR":  image.select("NIR")});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).lte(1)
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}

/** Extract Pixel Values **/
function toFeature(image) {
  var bandValues = ee.Image(image).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: fluxFootprint,
    scale: image.get("pixelResolution"),
    bestEffort: true
  });
  var platformID = ee.Dictionary({"platformID": ee.String(image.get("platformID"))});
  var time = ee.Dictionary({"time": image.get("system:time_start")});
  var solarElevation = ee.Dictionary({"solarElevation": image.get("SUN_ELEVATION")});
  
  return ee.Feature(null, bandValues.combine(platformID).combine(time).combine(solarElevation));
}

/** Radiance Conversion **/
function scaleRadiance(featureCollection) {
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
    feature = feature.set("Red", ee.Number(feature.get("Red")).multiply(0.0001));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).multiply(0.0001));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).multiply(0.0001));
    return feature;
  });
  
  var featuresAster = featureCollection.filter(
      ee.Filter.stringContains("platformID", "AST_L1T_003")
  ).map(function(feature) {
    feature = feature.set("Red", (ee.Number(feature.get("Red")).subtract(1)).multiply(0.708));
    feature = feature.set("NIR", (ee.Number(feature.get("NIR")).subtract(1)).multiply(0.862));
    feature = feature.set("SWIR_1", (ee.Number(feature.get("SWIR_1")).subtract(1)).multiply(0.2174));
    return feature;
  });
  
  var featuresMOD09Q1 = featureCollection.filter(
      ee.Filter.stringContains("platformID", "MOD09Q1")
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).multiply(0.0001));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).multiply(0.0001));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).multiply(0.0001));
    return feature;
  });
  
  var featuresMOD09A1 = featureCollection.filter(
      ee.Filter.stringContains("platformID", "MOD09A1")
  ).map(function(feature) {
    feature = feature.set("Red", ee.Number(feature.get("Red")).multiply(0.0001));
    feature = feature.set("NIR", ee.Number(feature.get("NIR")).multiply(0.0001));
    feature = feature.set("SWIR_1", ee.Number(feature.get("SWIR_1")).multiply(0.0001));
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

/** Run Method 2 **/
//var imageCollectionsList = ee.List([
//  landsat
//    .map(setPixResProp(30))
//    .map(maskLandsat),
//    
//  sentinel2
//    .map(setPixResProp(10))
//    .map(maskSentinel2)
//    .map(setSunElevSentinel2),
//    
//  aster
//    .map(setPixResProp(15))
//    .map(maskAster)
//    .map(setSunElevAster),
//    
//  setSunElevModisViirs(modisA1)
//    .map(setPixResProp(500))
//    .map(maskModis),
//    
//  setSunElevAvhrr(avhrr)
//   .map(setPixResProp(1000))
//   .map(maskAvhrr),
//   
//  setSunElevModisViirs(viirs)
//    .map(setPixResProp(1000))
//    .map(maskViirs)
//  ]);
//
//var imageryFlat = ee.ImageCollection(imageCollectionsList.iterate(function(collection, previous) {
//  return ee.ImageCollection(previous).merge(ee.ImageCollection(collection));
//}, ee.ImageCollection([]))) // Start with an empty ImageCollection
//  .filterBounds(fluxFootprint)
//  //.filterDate("1999-01-01", "2000-01-01")
//  .map(function(image) {return ee.Image(image).select(bands)});
//  
//// Convert to Feature Collection and apply functions
//var features = imageryFlat
//  .map(toFeature)
//  .filter(ee.Filter.notNull(["Red", "NIR", "SWIR_1"]));
//
//features = scaleRadiance(features);
//
//print("No. Images/Data Points", features.size());

/** Run Method 1 **/
// Apply functions specific to each image collection
var imagerySeparate = ee.List([
  landsat
    .map(setPixResProp(30))
    .map(maskLandsat),
    
  sentinel2
    .map(setPixResProp(10))
    .map(maskSentinel2)
    .map(setSunElevSentinel2),
    
  aster
    .map(setPixResProp(15))
    .map(maskAster)
    .map(setSunElevAster),
    
  setSunElevModisViirs(modisA1)
    .map(setPixResProp(500))
    .map(maskModis),
    
  setSunElevAvhrr(avhrr)
   .map(setPixResProp(1000))
   .map(maskAvhrr),
  
  setSunElevModisViirs(viirs)
    .map(setPixResProp(1000))
    .map(maskViirs)
  ]);


// Apply functions to all image collections
var imageryFlat = ee.ImageCollection(ee.FeatureCollection(imagerySeparate).flatten())
  .filterBounds(fluxFootprint)
  //.filterDate("1960-01-01", "2021-01-01")
  .map(function(image) {return ee.Image(image).select(bands)});

// Convert to Feature Collection and apply functions
var features = imageryFlat
  .map(toFeature)
  .filter(ee.Filter.notNull(["Red", "NIR", "SWIR_1"]));

features = scaleRadiance(features);

//print("No. Images/Data Points", features.size());

/** Export **/
Export.table.toDrive({
  collection: features,
  description: "Pixel_Aggregation_Abisko",
  folder: "tundra-flux",
  fileNamePrefix: "tundra-flux_data",
  fileFormat: "CSV",
  selectors: bands.concat(["platformID", "solarElevation", "time"])
});