var fluxCoords = ee.Geometry.Point([19.04520892, 68.35594288]);
var fluxBuffer = 200;
var fluxFootprint = fluxCoords.buffer(fluxBuffer);

var bands = ["Red", "NIR", "SWIR_1"];


var modisGA = ee.ImageCollection("MODIS/061/MOD09GA")
  .map(function(image) {return image.set("platformID", ee.String("MOD09GA"))})
  .merge(ee.ImageCollection("MODIS/061/MYD09GA")
    .map(function(image) {return image.set("platformID", ee.String("MYD09GA"))})) // Combine aqua and terra
  .select(["sur_refl_b03", "sur_refl_b04", "sur_refl_b01", "sur_refl_b02", "sur_refl_b05", "sur_refl_b06", "sur_refl_b07",
           "state_1km", "SolarZenith", "SolarAzimuth"],
          [ "Blue", "Green", "Red", "NIR", "SWIR_1", "SWIR_2", "SWIR_3",
           "QA_Pixel", "SolarZenith", "SolarAzimuth"])
  .map(function(image) {return image.reproject({crs: "EPSG:4326", scale: 500})}) // Modis mixes projections across bands... which is highly annoying so we need to fix that:
  //.filterBounds(modisGA)
  .filterDate("2011-07-01", "2011-08-01")

function maskModis(image) {
  
  var qa = image.select("QA_Pixel");
  
  var bitmaskCloud = 1 << 10; // use internal cloud bit mask instead of cloud state (bit 0-1) as the latter is more conservative.
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

modisGA = modisGA.map(maskModis);

Map.addLayer(modisGA)

/** Chart **/
// Create scatter chart
//var chart = ui.Chart.feature.byFeature({
//  features: features,
//  xProperty: 'time',
//  yProperties: ['Red']
//}).setChartType('ScatterChart')
//  .setOptions({
//    title: 'NDVI Time Series Scatter',
//    hAxis: {title: 'Date', format: 'yyyy-MM-dd'},
//    vAxis: {title: 'NDVI'},
//    pointSize: 5,
//    lineWidth: 0
//  });
//print(chart);