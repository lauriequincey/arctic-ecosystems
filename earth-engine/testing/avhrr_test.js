var avhrr = ee.ImageCollection("NOAA/CDR/AVHRR/SR/V5")// Provider"s note: the orbital drift of N-19 (the last NOAA satellite carrying the AVHRR sensor) began to severely degrade the retrieved product quality. Therefore, VIIRS is now the primary sensor being used for these products from 2014-present.
  .select(["SREFL_CH1", "SREFL_CH2", "SREFL_CH3",
           "BT_CH3", "BT_CH4", "BT_CH5",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA"],
          ["Red", "NIR", "SWIR_1",
           "brightness1", "brightness2", "brightness3",
           "TIMEOFDAY", "RELAZ", "SZEN", "VZEN", "QA_Pixel"])
  .map(function(image) {return image.set("platformID", ee.String("AVHRR"))});