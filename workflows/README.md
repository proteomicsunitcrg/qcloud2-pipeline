Knime workflows batch execution: 

First workflow: 

Description: applies OpenMS Shotgun workflow via Knime. <br />
Input: mzML files and qcML, featureXML and idXML file names. <br />
Output: qcML, featureXML and idXML files.

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave  -workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun_bsa.knwf" -workflow.variable=input_mzml_file,/path/to/180308_Q_QC1X_01_01.mzML,String -workflow.variable=output_qcml_file,/path/to/180308_Q_QC1X_01_01.qcml,String -workflow.variable=output_featurexml_file,/path/to/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=output_idxml_file,/path/to/1804/180308_Q_QC1X_01_01.idXML,String
```

Second workflow: 

Description: computes mean IT of ident. pept. <br />
Input: mzML and featureXML files. <br />
Output: mean_it_ident_pep.csv with a summary of all the ouput parameters.

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/path/to/module_parameter_mean_it.knwf" -workflow.variable=input_featurexml_file,/path/to/180308_Q_QC1X_01_01.featureXML,String -workflow.variable=input_mzml_file,/path/to/180308_Q_QC1X_01_01.mzML,String
```
