Knime workflows batch execution: 

STEP 1

First Knime workflow: 

Description: applies OpenMS Shotgun workflow via Knime. <br />
Input: mzML files and qcML, featureXML and idXML file names. <br />
Output: qcML, featureXML and idXML files.

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave  -workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun_bsa.knwf" -workflow.variable=input_mzml_file,/path/to/180308_Q_QC1X_01_01.mzML,String -workflow.variable=output_qcml_file,/path/to/180308_Q_QC1X_01_01.qcml,String -workflow.variable=output_featurexml_file,/path/to/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=output_idxml_file,/path/to/1804/180308_Q_QC1X_01_01.idXML,String
```

STEP 2

Description: given a mzML, removes the string xmlns="http://psi.hupo.org/ms/mzml" in both 'indexedmzML' and 'mzML' tags inside the mzML file.  

```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' /path/to/1804/180308_Q_QC1X_01_01.mzML
```

STEP 3

Second Knime workflow: 

Description: computes mean IT of ident. pept. <br />
Input: mzML and featureXML files and where to store the ouput CSV file. <br />
Output: CSV file with a summary of all the ouput parameters.

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_it.knwf" -workflow.variable=input_featurexml_file,/path/to/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=input_mzml_file,/path/to/180308_Q_QC1X_01_01.mzML,String -workflow.variable=output_csv_file,/path/to/180308_Q_QC1X_01_01.csv,String
```
