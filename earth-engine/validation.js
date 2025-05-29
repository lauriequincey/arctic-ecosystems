/** User Inputs **/
var fluxCoords = ee.Geometry.Point([19.04520892, 68.35594288]);
Map.addLayer(fluxCoords)
var fluxBuffer = 200;

/** Data **/
var fluxFootprint = fluxCoords.buffer(fluxBuffer);

// Annual
//var terra = ee.ImageCollection("MODIS/061/MOD17A3HGF")
//  .map(function(image) {return image.set("platformID", ee.String("MOD17A3HGF"))});
//var aqua = ee.ImageCollection("MODIS/061/MYD17A3HGF")
//  .map(function(image) {return image.set("platformID", ee.String("MYD17A3HGF"))});

// 8-Day
var terra = ee.ImageCollection("MODIS/061/MOD17A2H")
  .map(function(image) {return image.set("platformID", ee.String("MOD17A2H"))});
var aqua = ee.ImageCollection("MODIS/061/MYD17A2H")
  .map(function(image) {return image.set("platformID", ee.String("MYD17A2H"))});

// PML (based on modis, also 8-day) in gC m-2 d-1. VERY IMPORANT!
// Calibrated to evergreen needleleaf forest so probably not representative of our bog.
var pml = ee.ImageCollection("CAS/IGSNRR/PML/V2_v018")
  .map(function(image) {return image.set("platformID", ee.String("PML"))});
  
Map.addLayer(pml.first())
var chart = ui.Chart.image.series({
  imageCollection: pml.limit(5000).select("GPP").filterDate("2023-01-01", "2024-01-01"),
  region: fluxFootprint,
  reducer: ee.Reducer.mean(),
  scale: 500,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'PML GPP Time Series at Abisko',
  vAxis: {title: 'GPP'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 2
});
print(chart)

/** to Feature Collection **/
function toFeature(image) {
  var bandValues = ee.Image(image).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: fluxFootprint,
    scale: 500, // pixel size of Modis in metres
    //bestEffort: true
  });
  var platformID = ee.Dictionary({"platformID": ee.String(image.get("platformID"))});
  var timeStart = ee.Dictionary({"timeStart": image.get("system:time_start")});
  var timeEnd = ee.Dictionary({"timeEnd": image.get("system:time_end")});
  
  return ee.Feature(null, bandValues.combine(platformID).combine(timeStart).combine(timeEnd));
}
function toFeaturePML(image) {
  var bandValues = ee.Image(image).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: fluxFootprint,
    scale: 500, // pixel size of Modis in metres
    //bestEffort: true
  });
  var platformID = ee.Dictionary({"platformID": ee.String(image.get("platformID"))});
  var timeStart = ee.Dictionary({"timeStart": image.get("system:time_start")});
  
  return ee.Feature(null, bandValues.combine(platformID).combine(timeStart));
}

/** Run **/
var terraFeatures = terra
  .select("Gpp")
  .map(toFeature);
var aquaFeatures = aqua
  .select("Gpp")
  .map(toFeature);
var pmlFeatures = pml
  .select("GPP")
  .map(toFeaturePML);

//print(pml.first());
//print(pmlFeatures.limit(2));

/** Export **/
Export.table.toDrive({
  collection: terraFeatures,
  description: "Terra_GPP_Abisko",
  folder: "tundra-flux",
  fileNamePrefix: "Terra_GPP_Abisko",
  fileFormat: "CSV",
  selectors: ["Gpp"].concat(["platformID", "timeStart", "timeEnd"])
});

Export.table.toDrive({
  collection: aquaFeatures,
  description: "Aqua_GPP_Abisko",
  folder: "tundra-flux",
  fileNamePrefix: "Aqua_GPP_Abisko",
  fileFormat: "CSV",
  selectors: ["Gpp"].concat(["platformID", "timeStart", "timeEnd"])
});

Export.table.toDrive({
  collection: aquaFeatures,
  description: "PML_GPP_Abisko",
  folder: "tundra-flux",
  fileNamePrefix: "PML_GPP_Abisko",
  fileFormat: "CSV",
  selectors: ["GPP"].concat(["platformID", "timeStart"])
});