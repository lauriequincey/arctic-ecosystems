/** Flux Tower **/
var abisko = ee.Geometry.Point([18.779951840247904, 68.35228257482156]);
var footprint = abisko.buffer(500);
Map.addLayer(footprint);

/** Cloud Mask Functions **/
function maskLandsat(image) {
  var qa = image.select('QA_PIXEL');
  var cloudShadow = 1 << 3;
  var snow = 1 << 4;
  var cloud = 1 << 5;
  var mask = qa.bitwiseAnd(cloudShadow).eq(0)
               .and(qa.bitwiseAnd(snow).eq(0))
               .and(qa.bitwiseAnd(cloud).eq(0));
  return image.updateMask(mask).copyProperties(image, ['system:time_start']);
}

function maskSentinel(image) {
  var qa = image.select('QA_PIXEL');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
               .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).copyProperties(image, ['system:time_start']);
}

function maskMODIS_A1(image) {
  var qa = image.select('QA_PIXEL');
  var clear = qa.eq(0);  // Only pixels marked as 'good'
  return image.updateMask(clear).copyProperties(image, ['system:time_start']);
}

function maskMODIS_Q1(image) {
  var qa = image.select('QA_PIXEL');
  var clear = qa.bitwiseAnd(3).eq(0); // Bits 0–1: cloud state
  return image.updateMask(clear).copyProperties(image, ['system:time_start']);
}

function maskAVHRR(image) {
  var red = image.select('Red');  // Red band (640 nm)
  var nir = image.select('NIR');  // NIR band (860 nm)
  var swir = image.select('SWIR'); // SWIR band (3.75 µm)

  // Cloud detection logic based on reflectance thresholds
  var cloudMask = red.gt(0.3).or(swir.gt(0.3));  // Thresholds for cloud detection
  
  return image.updateMask(cloudMask.not()).copyProperties(image, ['system:time_start']);
}

// Function to mask clouds based on SurfReflect_State_500m
function maskVIIRSClouds(image) {
  // Select the state QA band
  var stateQA = image.select('QA_Pixel');

  // Bitmask for cloud state (bits 0-1)
  var cloudStateBits = ee.Number(3); // 0b11

  // Extract cloud state bits
  var cloudState = stateQA.bitwiseAnd(cloudStateBits);

  // Keep only clear pixels (value == 0)
  var clearMask = cloudState.eq(0);

  // Apply the mask to all reflectance bands
  return image.updateMask(clearMask);
}

function maskASTER(image) {
  var cloudMask = image.select('Green').gt(100)
    .and(image.select('Red').gt(100))
    .and(image.select('NIR').gt(100));
    
  return image.updateMask(cloudMask).copyProperties(image, ['system:time_start']);
}

/** NDVI  **/
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['NIR', 'Red']).rename('NDVI');
  return image.addBands(ndvi).copyProperties(image, ['system:time_start']);
}

/** EVI **/
var computeEVI = function(image) {
  var evi = image.expression(
    '2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))', {
      'NIR': image.select('NIR'),
      'Red': image.select('Red'),
      'Blue': image.select('Blue')
    }).rename('EVI');

  return image.addBands(evi);
};

/** EVI2 **/
// https://grass.osgeo.org/grass-stable/manuals/i.vi.html
// https://www.spiedigitallibrary.org/conference-proceedings-of-spie/6679/1/2-band-enhanced-vegetation-index-without-a-blue-band-and/10.1117/12.734933.short
var computeEVI2 = function(image) {
  var evi2 = image.expression(
    '2.5 * ((NIR - Red) / (NIR + 2.4 * Red + 1))', {
      'NIR': image.select('NIR'),
      'Red': image.select('Red')
    }).rename('EVI2');
  
  return image.addBands(evi2);
};

/** LANDSAT **/
var landsat = 
    ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
      //.filterMetadata('CLOUD_COVER', 'less_than', 30)
      .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    .merge(
      ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
        //.filterMetadata('CLOUD_COVER', 'less_than', 30)
        .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
        //.filterMetadata('CLOUD_COVER', 'less_than', 30)
        .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'], 
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        //.filterMetadata('CLOUD_COVER', 'less_than', 30)
        .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
        //.filterMetadata('CLOUD_COVER', 'less_than', 30)
        .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
                ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .map(maskLandsat)
    .map(addNDVI)
    .map(computeEVI2);

/** SENTINEL-2 **/
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .select(['B2', 'B3', 'B4', 'B8A', 'B11', 'B12', 'QA60'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    .map(maskSentinel)
    .map(addNDVI)
    .map(computeEVI2);

/** MODIS A1 **/
var modisA1 = ee.ImageCollection('MODIS/061/MOD09A1')
    .select(['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b05', 'sur_refl_b06', 'QA'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    .merge(
      ee.ImageCollection('MODIS/061/MYD09A1')
      .select(['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b05', 'sur_refl_b06', 'QA'],
              ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .map(maskMODIS_A1)
    .map(addNDVI)
    .map(computeEVI2);

/** MODIS Q1 **/
var modisQ1 = ee.ImageCollection('MODIS/061/MOD09Q1')
  .select(['sur_refl_b01', 'sur_refl_b02', 'State'],
          ['Red', 'NIR', 'QA_PIXEL'])
  .map(maskMODIS_Q1)
  .map(addNDVI)
  .map(computeEVI2);

/** AVHRR **/
// Provider's note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
var avhrr = ee.ImageCollection('NOAA/CDR/AVHRR/SR/V5')
  .select(['SREFL_CH1', 'SREFL_CH2', 'SREFL_CH3'],
          ['Red', 'NIR', 'SWIR'])
  //.map(maskAVHRR)
  .map(addNDVI)
  .map(computeEVI2);

/** ASTER **/
var aster = ee.ImageCollection('ASTER/AST_L1T_003')
  .filterBounds(abisko)
  .select(['B01', 'B02', 'B3N', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14'],
          ['Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'SWIR3', 'SWIR4', 'SWIR5', 'SWIR6', 'TIR1', 'TIR2', 'TIR3', 'TIR4', 'TIR5'])
  .map(maskASTER)
  .map(addNDVI)
  .map(computeEVI2);
  
/** VIIRS **/
// https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP09GA
// could use this instead for precomputed no clouds!https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP09H1#description
// or even this one with precomputed NDVI: https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP13A1
var viirs = ee.ImageCollection('NASA/VIIRS/002/VNP09H1')
  .select(['SurfReflect_I1', 'SurfReflect_I2', 'SurfReflect_I3', 'SurfReflect_State_500m'],
          ['Red', 'NIR', 'SWIR', 'QA_Pixel'])
  //.map(maskAVHRR)
  .map(maskVIIRSClouds)
  .map(addNDVI)
  .map(computeEVI2);

/** Merge All Sensors **/
var collection = 
  landsat
  .merge(sentinel2)
  .merge(modisA1)
  .merge(modisQ1)
  .merge(aster)
  .merge(viirs)
  .merge(avhrr)
  .filterBounds(abisko)
  .filter(ee.Filter.calendarRange(6, 8, 'month'));

//collection = collection.distinct(['system:time_start']);

/** Filter Imagery Based on Pixel Count (just to get size, not actually necessary) **/
print('No. of Images:', collection.size());
Map.addLayer(collection.first());

function setEmptyFlag(image) {
  // Adapted/fixed from: https://gis.stackexchange.com/questions/354398/filter-imagecollection-to-images-with-non-masked-coverage-within-aoi-in-earth-en
  var isNotEmpty = image.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: footprint,
    scale: 30,
  }).values().get(0);

  return image.set('isNotEmpty', isNotEmpty);
}
var collection = collection.map(setEmptyFlag);
var collection = collection.filter(ee.Filter.gt('isNotEmpty', 0));

print('No. of Images with Pixels inside footprint:', collection.size());
print('Image Collection Head:', collection.limit(5));

/** NDVI Time Series Chart **/
var chart = ui.Chart.image.series({
  imageCollection: collection.select('NDVI'),
  region: footprint,
  reducer: ee.Reducer.mean(),//ee.Reducer.sum(),//
  scale: 250,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'NDVI Time Series at Abisko',
  vAxis: {title: 'NDVI'},
  hAxis: {title: 'Date'},
  lineWidth: 2,
  pointSize: 3
});
print(chart);

/** NDVI array chart **/
//// Get the time series of NDVI values as arrays
//var ndviValues = collection.select('NDVI').getRegion(footprint, 250).map(function(f) {
//  return ee.List(f).slice(4, 5);  // NDVI values (Index 4 corresponds to NDVI)
//});
//
//// Get the datetime values as arrays
//var timeStamps = collection.getRegion(footprint, 250).map(function(f) {
//  return ee.List(f).slice(3, 4);  // system:time_start values (Index 1 corresponds to datetime)
//});
//
//// Flatten the list of lists into single arrays for plotting
//var ndviArray = ee.List(ndviValues).flatten();
//var timeArray = ee.List(timeStamps).flatten();
//
//// Create a scatter chart using arrays
//var chart = ui.Chart.array.values(ndviArray, 0, timeArray)
//  .setChartType('ScatterChart')
//  .setOptions({
//    title: 'NDVI Time Series at Abisko',
//    vAxis: {title: 'NDVI'},
//    hAxis: {
//      title: 'Date',
//      format: 'yyyy-MM-dd',
//      gridlines: {count: 10}
//    },
//    pointSize: 5,
//    lineWidth: 0,
//  });
//
//print(chart);

/** Histogram **/
// Extract the year from the 'system:time_start' property
var collectionWithYear = collection.map(function(image) {
  var year = ee.Date(image.get('system:time_start')).get('year');
  return image.set('year', year);
});

// Count the number of images per year using aggregate_histogram
var countPerYear = collectionWithYear.aggregate_histogram('year');

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
var histogramChart = ui.Chart.feature.byFeature({
  features: yearCountFeatureCollection,
  xProperty: 'year'
}).setChartType('ColumnChart')
  .setOptions({
    title: 'Number of Images per Year',
    vAxis: {title: 'Number of Images'},
    hAxis: {title: 'Year'},
    legend: {position: 'none'}
  });

// Print the chart
print(histogramChart);

/** Max-EVI2 **/
var years = ee.List.sequence(1981, 2024);

var maxevi2 = ee.FeatureCollection(years.map(function(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, 'year');
  
  var imagesInYear = collection.filterDate(start, end);
  
  // Map over images to reduce each to mean in the geometry
  var means = imagesInYear.map(function(image) {
    var meanDict = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: footprint,
      scale: 250, // Adjust scale based on the dataset
      maxPixels: 1e13
    });
    return ee.Feature(null, {mean: meanDict.get('EVI2')});
  });

  // Sum all the mean values for this year
  var max = ee.FeatureCollection(means)
               .aggregate_max('mean');//.aggregate_mean('mean');//.aggregate_sum('mean');
  
  return ee.Feature(null, {
    'Year': year,
    'max_EVI2': max
  });
}));
print('Max-EVI', maxevi2);

/** Max-EVI2 Chart **/
var chart = ui.Chart.feature.byFeature({
  features: maxevi2, 
  xProperty: 'Year', 
  yProperties: ['max_EVI2']
})
.setChartType('LineChart')
.setOptions({
  title: 'Max_EVI2 Through Time',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Max_EVI2'},
  lineWidth: 2,
  pointSize: 4
});
print(chart);

/** TI-NDVI **/
//var tiNdvi = ee.Number(0);
//
//// Iterate through each pair of consecutive features
//var integrated = ee.List.sequence(1, list.size().subtract(1)).iterate(function(i, acc) {
//  i = ee.Number(i);
//  acc = ee.Number(acc);
//  
//  var prev = ee.Feature(list.get(i.subtract(1)));
//  var curr = ee.Feature(list.get(i));
//
//  var t1 = ee.Date(prev.get('system:time_start')).millis();
//  var t2 = ee.Date(curr.get('system:time_start')).millis();
//  var dt = t2.subtract(t1).divide(1000 * 60 * 60 * 24);  // in days
//
//  var ndvi1 = ee.Number(prev.get('NDVI'));
//  var ndvi2 = ee.Number(curr.get('NDVI'));
//
//  // Trapezoidal area: (ndvi1 + ndvi2)/2 * dt
//  var area = ndvi1.add(ndvi2).divide(2).multiply(dt);
//  
//  return acc.add(area);
//}, tiNdvi);
//
//// Print Time-Integrated NDVI
//print('Time-Integrated NDVI (TI-NDVI):', integrated);

/** Export **/
Export.table.toDrive({
  collection: collection.select('NDVI').map(function(img) {
    img = ee.Image(img);
    var ndvi = img.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: footprint,
      scale: 250,
      maxPixels: 1e9
    }).get('NDVI');
    
    var date = img.date().format('YYYY-MM-dd');
    return ee.Feature(null, {'NDVI': ndvi, 'date': date});
  }),
  description: 'NDVI_TimeSeries_Export',
  fileFormat: 'CSV'
});