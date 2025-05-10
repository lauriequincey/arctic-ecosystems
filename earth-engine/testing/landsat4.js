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


landsat = landsat.filterBounds(fluxFootprint)
landsat = landsat.map(maskLandsat)
//landsat = landsat.filterDate("1985-04-01", "1990-09-01")


//Map.addLayer(landsat.first())
Map.addLayer(landsat)