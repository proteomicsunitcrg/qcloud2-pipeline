msconvert use and configuration

msconvert.exe Z:\rolivella\mydata\raw\QC1F\180218_Q_QC1F_01_11.raw --32 --mzML --zlib --filter "peakPicking true 1-"  --outfile 180218_Q_QC1F_01_11 -o Z:\rolivella\mydata\mzml\

Where: 

Z:\rolivella\mydata\raw\QC1F\180218_Q_QC1F_01_11.raw -> input RAW file 
--outfile 180218_Q_QC1F_01_11 -> name for the output mzML file
-o Z:\rolivella\mydata\mzml\ -> folder to save the output mzML file

It must ve abailable at the command line. To test it type: 

C:\msconvert

Excpected output: help and version. 

This is going to be run in a Windows server

Links and references

* Proteowizard: http://proteowizard.sourceforge.net/


### Install dependencies

    none


