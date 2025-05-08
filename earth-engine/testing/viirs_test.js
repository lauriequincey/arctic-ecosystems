/** User Inputs **/
var fluxCoords = ee.Geometry.Point([19.04520892, 68.35594288]);
var fluxBuffer = 200;

var bands = ["Red", "NIR", "SWIR_1"];

/** Data **/
var fluxFootprint = fluxCoords.buffer(fluxBuffer);


var viirs = ee.ImageCollection("NASA/VIIRS/002/VNP09GA") // Provider"s note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
  .select(["M1", "M2", "M3", "M4", "M5", "M7", "M8", "M10", "M11",
           "I1", "I2", "I3",
           "SensorAzimuth", "SensorZenith", "SolarAzimuth", "SolarZenith", "iobs_res", "num_observations_1km", "num_observations_500m", "obscov_1km", "obscov_500m", "orbit_pnt", "QF1"],
           ["LoSuperBlue1", "LoSuperBlue2", "LoBlue", "LoGreen", "LoRedLo", "LoNIRLo", "LoSWIR_1", "LoSWIR_2", "LoSWIR_3",
            "Red", "NIR", "SWIR_1",
            "SensorAzimuth", "SensorZenith", "SolarAzimuth", "SolarZenith", "iobs_res", "num_observations_1km", "num_observations_500m", "obscov_1km", "obscov_500m", "orbit_pnt", "QA_Pixel"])
  .map(function(image) {return image.set("platformID", ee.String("VNP09GA"))});


function maskViirs(image) {
  
  var qa = image.select("QA_Pixel").toInt();
  
  var bitmaskCloud = 1 << 3;
  var terribleSnowIndex = image.expression( // based off nsdi but exploiting high red, low NIR reflectance properties of snow. Helps deal with messy cloud/snow/mountain pixels which the bitmasks don"t catch.
      "(Red - NIR) / (Red + NIR)",
      {"Red": image.select("Red"),
       "NIR":  image.select("NIR")});
  
  var bitmaskCombined = qa.bitwiseAnd(bitmaskCloud).eq(0)
    .and(terribleSnowIndex.lt(-0.2));
  
  return image.updateMask(bitmaskCombined);
}


viirs = viirs.map(maskViirs).filterBounds(fluxFootprint).filterDate("2020-05-01", "2020-07-01")

Map.addLayer(viirs)