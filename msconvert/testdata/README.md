- **ERROR_FILE_completed_but_corrupted.raw** Sample file that was received correctly but is anyway corrupted for some unknown reason.</br> 
- **ERROR_FILE_incomplete.raw.gz** Sample file that was not received correctly.</br>
- **OK_file_QC01.raw.** Correct RAW file</br> 
- **180615_Q_QC1L_01_04.wiff** and **180615_Q_QC1L_01_04.wiff.scan** Files from AB SCIEX Qtrap. This files are processed in the same way than the RAW files but only the .wiff and not the wiff.scan, i.e.</br> 

```
msconvert.exe Z:\data\QQQ\wiff\1806\QC1L\180615_Q_QC1L_01_04.wiff --32 --mzML --zlib --filter "peakPicking true 1-"  --outfile 180615_Q_QC1L_01_04 -o Z:\data\QQQ\mzml\1806
```
