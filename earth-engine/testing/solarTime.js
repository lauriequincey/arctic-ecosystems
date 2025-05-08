var abisko = ee.Geometry.Point([18.779951840247904, 68.35228257482156]);
var footprint = abisko.buffer(500);
Map.addLayer(footprint);

var landsat = 
    ee.ImageCollection("LANDSAT/LT04/C02/T1_Ls2")
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

var image = landsat.first()
print(image)
var sunElevation = landsat.get("SUN_ELEVATION")
var sunAzimuth = landsat.get("SUN_AZIMUTH")

solar_hours_from_noon ≈ (sun_azimuth - 180) / 15