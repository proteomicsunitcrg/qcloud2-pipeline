Knime workflows batch execution: 

First workflow: 

Description: applies OpenMS Shotgun workflow via Knime
Input: mzML files and qcML, featureXML and idXML file names. 
Output: qcML, featureXML and idXML files.

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave  -workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun_bsa.knwf" -workflow.variable=input_mzml_file,/path/to/El_02534_2p_QC1W.mzML,String -workflow.variable=output_qcml_file,/path/to/El_02534_2p_QC1W.qcml,String -workflow.variable=output_featurexml_file,/path/to/El_02534_2p_QC1W.featureXML,String -workflow.variable=output_idxml_file,/path/to/1804/El_02534_2p_QC1W.idXML,String
```

Second workflow: 

Description: computes mean IT of ident. pept.
Input: mzML and featureXML files. 
Output: mean_it_ident_pep.csv with a summary of all the ouput parameters.

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave -workflowFile="/path/to/module_parameter_mean_injection_time_of_identified_peptides_MS1.knwf" -workflow.variable=input_featurexml_file,/path/to/1804/El_02534_2p_QC1W.featureXML,String -workflow.variable=input_mzml_file,/path/to/El_02534_2p_QC1W.mzML,String

```
