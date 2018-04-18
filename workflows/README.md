Knime workflows batch execution: 

First workflo
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave  -workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun_bsa.knwf" -workflow.variable=input_mzml_file,/users/pr/rolivella/myframeworks/qcweb/scripts/input/vib/erika_2p/mzML/1804/El_02534_2p_QC1W.mzML,String -workflow.variable=output_qcml_file,/users/pr/rolivella/myframeworks/qcweb/scripts/input/vib/erika_2p/qcml/1804/El_02534_2p_QC1W.qcml,String -workflow.variable=output_featurexml_file,/users/pr/rolivella/myframeworks/qcweb/scripts/input/vib/erika_2p/featureXML/1804/El_02534_2p_QC1W.featureXML,String -workflow.variable=output_idxml_file,/users/pr/rolivella/myframeworks/qcweb/scripts/input/vib/erika_2p/idXML/1804/El_02534_2p_QC1W.idXML,String
```
