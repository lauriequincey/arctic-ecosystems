/** Settings **/
var abisko = ee.Geometry.Point([18.779951840247904, 68.35228257482156]);

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
  var cloudBitMask = 1 << 10; // opaque clouds
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
               .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).copyProperties(image, ['system:time_start']);
}

function maskMODIS(image) {
  var qa = image.select('QA_PIXEL');
  var clear = qa.eq(0); // MODIS QA == 0 is good quality
  return image.updateMask(clear).copyProperties(image, ['system:time_start']);
}

/** NDVI Calculation **/
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['NIR', 'Red']).rename('NDVI');
  return image.addBands(ndvi);
}

/** Import and Process Collections **/
var landsat = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
    //.filterMetadata('CLOUD_COVER', 'less_than', 10)
    .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    .merge(
      ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
      .filterMetadata('CLOUD_COVER', 'less_than', 10)
      .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'],
              ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
      .filterMetadata('CLOUD_COVER', 'less_than', 10)
      .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'], 
              ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterMetadata('CLOUD_COVER', 'less_than', 10)
      .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
              ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .merge(
      ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
      .filterMetadata('CLOUD_COVER', 'less_than', 10)
      .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'],
              ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .map(maskLandsat).map(addNDVI);

var sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .select(['B2', 'B3', 'B4', 'B8A', 'B11', 'B12', 'QA60'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    .map(maskSentinel).map(addNDVI);

var modis = ee.ImageCollection('MODIS/061/MOD09A1')
    .select(['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b05', 'sur_refl_b06', 'QA'],
            ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL'])
    .merge(
      ee.ImageCollection('MODIS/061/MYD09A1')
      .select(['sur_refl_b03', 'sur_refl_b04', 'sur_refl_b01', 'sur_refl_b02', 'sur_refl_b05', 'sur_refl_b06', 'QA'],
              ['Blue', 'Green', 'Red', 'NIR', 'SWIR_1', 'SWIR_2', 'QA_PIXEL']))
    .map(maskMODIS).map(addNDVI);

/** Merge All Sensors **/
var collection = landsat.merge(sentinel).merge(modis)
  .filterBounds(abisko)
  .filter(ee.Filter.calendarRange(6, 9, 'month'));

print(collection.size());
print(collection.first().id());

Map.addLayer(collection.first());

/** Time Series Chart **/
var chart = ui.Chart.image.series({
  imageCollection: collection.select('NDVI'),
  region: abisko,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'NDVI Time Series at Abisko (Landsat, Sentinel-2, MODIS)',
  vAxis: {title: 'NDVI'},
  hAxis: {title: 'Date'},
  lineWidth: 2,
  pointSize: 3
});

print(chart);
