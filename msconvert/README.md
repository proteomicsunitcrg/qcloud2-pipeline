msconvert use and configuration

msconvert.exe Z:\rolivella\mydata\raw\QC1F\180218_Q_QC1F_01_11.raw --32 --mzML --zlib --filter "peakPicking true 1-"  --outfile 180218_Q_QC1F_01_11 -o Z:\rolivella\mydata\mzml\</br></br>

Where: </br></br>

Z:\rolivella\mydata\raw\QC1F\180218_Q_QC1F_01_11.raw -> input RAW file </br>
--outfile 180218_Q_QC1F_01_11 -> name for the output mzML file</br>
-o Z:\rolivella\mydata\mzml\ -> folder to save the output mzML file</br></br>

It must ve abailable at the command line. To test it type: </br></br>

C:\msconvert</br></br>

Excpected output: help and version. </br></br>

This is going to be run in a Windows server</br></br>

Links and references
</br></br>
* Proteowizard: http://proteowizard.sourceforge.net/
</br></br>

### Install dependencies

    none


