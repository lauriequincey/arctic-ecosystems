# An Arctic in Flux: Exploring Arctic Flora Response to Climate in Northern Scandinavia
A project for my masters dissertation to produce site-specific gross primary production (GPP) estimates from satellite imagery in Northern Scandinavia. The project uses flux tower eddy covariance GPP ([ICOS](https://www.icos-cp.eu/)) and satellite data ([MOD09GA](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD09GA)/[MYD09GA](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MYD09GA), [Landsats 4-9](https://developers.google.com/earth-engine/datasets/catalog/landsat), and [Sentinel-2](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED?hl=en)) to train a random forest regressor model that can convert satellite data to site-specific GPP. This project explores the influence of temperature and snowdepth on GPP and demonstrates an innovative application of a random forest regressor for Arctic Greening research. The more granular, sub-annual data allows this study to quantify the importance of spring and winter snowdepth on GPP. It provides insight into the effects of varying Arctic flora on the remote sensing and accurate detection of Arctic greening trends. This highlights potential issues, especially for pan-Arctic investigations, as indices exhibit different sensitivities to the reflected light that contain the GPP signal. This study finds popular indices, such as NDVI, may perform poorly in Sphagnum moss and Norway Spruce dominated ecosystems and produce misleading Arctic greening trends. 

## Earth Engine
/satellite.js

The project begins on Google Earth Engine to collect, filter, and pre-process satellite imagery into a non-spatial timeseries of band values with accompanying gray-level covariance matrix outputs and time/solar information.

## Model Training
/fluxsat processing.ipynb

Flux data from ICOS are datewise paried with the satellite data and features are generated to create a training dataset for the random forest regressor.

## Climate
/climate processing.ipynb

Climate data from NOAA (atmospheric indices) and the 5 flux tower sites used in the study (temperature, precipitation, snowdepth) are cleaned and processed.

## Analysis
/statistics.ipynb

GPP estimates from the model (GPPe) are analysed here through time, against NDVI, and in relation to climate.

## Figures
/figures.ipynb

Figures and statistical outputs from above are made into graphs.
