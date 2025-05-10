/** User Inputs **/
var fluxCoords = ee.Geometry.Point([19.04520892, 68.35594288]);
var fluxBuffer = 200;

var bands = ["Red", "NIR", "SWIR_1"];

/** Data **/
var fluxFootprint = fluxCoords.buffer(fluxBuffer);

var avhrr = ee.ImageCollection("NOAA/CDR/AVHRR/SR/V5")// Provider"s note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
  .select(["SREFL_CH1", "SREFL_CH2", "SREFL_CH3",
           "BT_CH3", "BT_CH4", "BT_CH5",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA"],
          ["Red", "NIR", "SWIR_1",
           "brightness1", "brightness2", "brightness3",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA_Pixel"])
  .map(function(image) {return image.set("platformID", ee.String("AVHRR"))});

function setPixResProp(pixRes) {
  return function(image) {
    return image.set({"pixelResolution": pixRes});
  };
}

function setAvhrrTime(imageCollection) {
  imageCollection = imageCollection.map(function(image) {
    return image.set("TIMEOFDAY", image.select("TIMEOFDAY").reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: fluxFootprint,
      scale: 1000//image.get("pixelResolution")
    }).get("TIMEOFDAY"));
  });
  imageCollection = imageCollection.filter(ee.Filter.notNull(["TIMEOFDAY"])); // Additional Filtering for Viirs as the solar elevation band can be missing and we need that
  return imageCollection.map(function(image) {
    return image.set("system:time_start", ee.Number(image.get("system:time_start")).add(ee.Number(image.get("TIMEOFDAY"))));
  });
}

function setSunElevAvhrr(imageCollection) {
  
  imageCollection = imageCollection.map(function(image) {
    return image.set("SUN_ELEVATION", image.select("SZEN").reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: fluxFootprint,
      scale: 1000,//image.get("pixelResolution")
    }).get("SZEN"));
  });
  imageCollection = imageCollection.filter(ee.Filter.notNull(["SUN_ELEVATION"]));
  
  return imageCollection.map(function(image) {
    image = image.set("SUN_ELEVATION", ee.Number(90).subtract(ee.Number(image.get("SUN_ELEVATION")).divide(ee.Number(100))));
    image = image.set("SUN_AZIMUTH", ee.Number(-9999)); // avhrr does't have solar azimuth but I don't need it as it has a time of day band which I extract. To keep things happy, let's just assign a no data value
    return image;
  });
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
    //.and(qa.bitwiseAnd(bitmaskCloudShadow).eq(0))
    //.and(qa.bitwiseAnd(bitmaskCloudNight).eq(0))
    //.and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}

function setEmptyFlag(image) {
  // Adapted/fixed from: https://gis.stackexchange.com/questions/354398/filter-imagecollection-to-images-with-non-masked-coverage-within-aoi-in-earth-en
  var isNotEmpty = image.reduceRegion({
    reducer: ee.Reducer.mean(),//ee.Reducer.sum(), // count doesn't seem to work always and some imagery gets filtered out when it shouldn't
    geometry: fluxFootprint,
    scale: 1000,
  }).values().get(0);
  return image.set('isNotEmpty', isNotEmpty);
}

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
  var solarAzimuth = ee.Dictionary({"solarAzimuth": image.get("SUN_AZIMUTH")});
  
  return ee.Feature(null, bandValues.combine(platformID).combine(time).combine(solarElevation).combine(solarAzimuth));
}


avhrr = avhrr.filterBounds(fluxFootprint)//.filterDate("2000-05-01", "2000-07-01")
avhrr = avhrr.map(setPixResProp(1000))
avhrr = setAvhrrTime(avhrr)
avhrr = setSunElevAvhrr(avhrr)
avhrr = avhrr.map(maskAvhrr)
avhrr = avhrr.map(setEmptyFlag)
avhrr = avhrr.map(function(image) {return ee.Image(image).select(bands)});
avhrr = avhrr.filter(ee.Filter.gt('isNotEmpty', 0))

avhrr = avhrr.map(function(image) {
  
  return image.addBands(image.normalizedDifference(['NIR', 'Red']).rename('ndvi'));
  
})

print(avhrr.size())
print(avhrr.first())
Map.addLayer(avhrr.first())

var features = avhrr.map(toFeature)
print(features.size())

features = features.filter(ee.Filter.notNull(["Red", "NIR", "SWIR_1"]));

//features = features.map(function(feature) {
//  
//  var red = ee.Number(feature.get("Red"))
//  var nir = ee.Number(feature.get("NIR"))
//  
//  return feature.set("ndvi", (nir.subtract(red).divide((nir.add(red)))))
//  
//})

// NDVI Time Series Chart
var chartNdvi = ui.Chart.image.series({
  imageCollection: avhrr.limit(5000).select('ndvi'),
  region: fluxFootprint,
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
print(chartNdvi)