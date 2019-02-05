# QCLOUD 2.0 PIPELINE (Nextflow+Knime)

## QCLOUD_C4L_PIPELINE_PARAMS_v_0.0.1</br> </br>

Isotopologues: </br></br>

| Sequence                                             | Mass     | RTref  | Concentr.     | Shortname  | drt | dm | Thresh. area  | 
|------------------------------------------------------|----------|--------|---------------|------------|-----|----|---------------| 
| YV(Heavy)YV(Heavy)ADV(Heavy)A(Heavy)A(Heavy)K(Heavy) | 566.83   | 2017.2 | 100           | YVYVADVAAK | 250 | 5  | 10000         | 
| YV(Heavy)YV(Heavy)ADV(Heavy)AAK(Heavy)               | 562.8229 | 2017.8 | 10            | YVYVADVAAK | 250 | 5  | 10000         | 
| YVYV(Heavy)ADV(Heavy)AAK(Heavy)                      | 559.816  | 1926   | 1             | YVYVADVAAK | 250 | 5  | 10000         | 
| YVYVADV(Heavy)AAK(Heavy)                             | 556.8091 | 1630.8 | 0.1           | YVYVADVAAK | 250 | 5  | 10000         | 
| YVYVADVAAK(Heavy)                                    | 553.8022 | 2077.8 | 0.01          | YVYVADVAAK | 250 | 5  | 10000         | 
| L(Heavy)L(Heavy)SL(Heavy)GAGEF(Heavy)K(Heavy)        | 537.3441 | 2767.2 | 100           | LLSLGAGEFK | 250 | 5  | 10000         | 
| L(Heavy)L(Heavy)SL(Heavy)GAGEFK(Heavy)               | 532.3305 | 2767.2 | 10            | LLSLGAGEFK | 250 | 5  | 10000         | 
| L(Heavy)L(Heavy)SLGAGEFK(Heavy)                      | 528.8219 | 2902.2 | 1             | LLSLGAGEFK | 250 | 5  | 10000         | 
| L(Heavy)LSLGAGEFK(Heavy)                             | 525.3134 | 3535.2 | 0.1           | LLSLGAGEFK | 250 | 5  | 10000         | 
| LLSLGAGEFK(Heavy)                                    | 521.8048 | 2546.4 | 0.01          | LLSLGAGEFK | 250 | 5  | 10000         | 
| L(Heavy)GF(Heavy)TDL(Heavy)F(Heavy)SK(Heavy)         | 535.3281 | 3579.6 | 100           | LGFTDLFSK  | 250 | 5  | 10000         | 
| L(Heavy)GFTDL(Heavy)F(Heavy)SK(Heavy)                | 530.3145 | 3580.2 | 10            | LGFTDLFSK  | 250 | 5  | 10000         | 
| L(Heavy)GFTDL(Heavy)FSK(Heavy)                       | 525.3008 | 3580.2 | 1             | LGFTDLFSK  | 250 | 5  | 10000         | 
| L(Heavy)GFTDLFSK(Heavy)                              | 521.7923 | 2454.6 | 0.1           | LGFTDLFSK  | 250 | 5  | 10000         | 
| LGFTDLFSK(Heavy)                                     | 518.2837 | 2200.2 | 0.01          | LGFTDLFSK  | 250 | 5  | 10000         | 
| V(Heavy)T(Heavy)S(Heavy)GST(Heavy)ST(Heavy)SR(Heavy) | 509.2739 | 1178.4 | 100           | VTSGSTSTSR | 250 | 5  | 10000         | 
| V(Heavy)T(Heavy)SGSTST(Heavy)SR(Heavy)               | 504.7651 | 1821   | 10            | VTSGSTSTSR | 250 | 5  | 10000         | 
| V(Heavy)T(Heavy)SGSTSTSR(Heavy)                      | 502.2599 | 760.2  | 1             | VTSGSTSTSR | 250 | 5  | 10000         | 
| V(Heavy)TSGSTSTSR(Heavy)                             | 499.7547 | 3355.8 | 0.1           | VTSGSTSTSR | 250 | 5  | 10000         | 
| VTSGSTSTSR(Heavy)                                    | 496.7478 | 800.4  | 0.01          | VTSGSTSTSR | 250 | 5  | 10000         | 
| V(Heavy)V(Heavy)GGL(Heavy)V(Heavy)ALR(Heavy)         | 459.8232 | 2359.2 | 100           | VVGGLVALR  | 250 | 5  | 10000         | 
| V(Heavy)V(Heavy)GGLV(Heavy)ALR(Heavy)                | 456.3147 | 2360.4 | 10            | VVGGLVALR  | 250 | 5  | 10000         | 
| V(Heavy)V(Heavy)GGLVALR(Heavy)                       | 453.3078 | 2361.6 | 1             | VVGGLVALR  | 250 | 5  | 10000         | 
| V(Heavy)VGGLVALR(Heavy)                              | 450.3009 | 2406   | 0.1           | VVGGLVALR  | 250 | 5  | 10000         | 
| VVGGLVALR(Heavy)                                     | 447.294  | 2298.6 | 0.01          | VVGGLVALR  | 250 | 5  | 10000         | 
| L(Heavy)A(Heavy)SV(Heavy)SV(Heavy)S(Heavy)R(Heavy)   | 428.2738 | 1152   | 100           | LASVSVSR   | 250 | 5  | 10000         | 
| L(Heavy)ASV(Heavy)SV(Heavy)SR(Heavy)                 | 424.2667 | 1152.6 | 10            | LASVSVSR   | 250 | 5  | 10000         | 
| LASV(Heavy)SV(Heavy)SR(Heavy)                        | 420.7581 | 997.8  | 1             | LASVSVSR   | 250 | 5  | 10000         | 
| LASVSV(Heavy)SR(Heavy)                               | 417.7512 | 1903.2 | 0.1           | LASVSVSR   | 250 | 5  | 10000         | 
| LASVSVSR(Heavy)                                      | 414.7443 | 1615.2 | 0.01          | LASVSVSR   | 250 | 5  | 10000         | 

</br></br>

Feature Finder Multiplex (OpenMS 2.3):

| Parameter            | Value  |
|----------------------|--------|
| charge               | 1 to 4 | 
| rt_typical           | 40 sec | 
| rt_min               | 2 sec  | 
| mz_tolerance         | 10 ppm | 
| intensity_cutoff     | 1000   | 
| peptide_similarity   | 0.5    | 
| averagine_similarity | 0.4    | 
| missed_cleavages     | 0      |

</br></br>
OMSSAAdapter (OpenMS 2.3, omssa-2.1.9): 
</br></br>

| Parameter                | Value   | 
|--------------------------|---------| 
| precursor_mass_tolerance | 7 ppm   | 
| fragment_mass_tolerance  | (a)     | 
| min_precursor_charge     | 1       | 
| max_precursor_charge     | 3       | 
| fixed_modifications      | []      | 
| variable_modifications   | []      | 
| v                        | 1       | 
| enzime                   | Trypsin | 
| hl                       | 30      | 
| he                       | 1000    | 
| i                        | (b)     | 

</br></br>
(a) 0.5 Da for non QExactive instruments and 0.02 Da for QExactive and Velos. 
</br>
(b) Comma delimited list of id numbers of ions to search: CID and HCD = 1,4. ETCID and ETHCD 1,4,2,5.
</br></br>

FileFilter (OpenMS 2.3): 
</br></br>
CID: remove_activation=Electron transfer dissociation, select_activation=Collision-induced dissociation
</br>
HCD: QExactive and Velos remove_activation=none, select_activation=none. Non Qexactive, remove_activation=Electron transfer dissociation, select_activation=High-energy collision-induced dissociation
</br>
ETCID: select_activation=Electron transfer dissociation, select_activation=Collision-induced dissociation
</br>
ETHCD:s elect_activation=Electron transfer dissociation, select_activation=High-energy collision-induced dissociation

</br>
Databases: 
sp_human_2015_10_contaminants_plus_shuffled.fasta.gz
</br></br>

***

## STEP 1 - Proteomics workflows</br> </br> 

Remove XML namespace from mzML file: 
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```
Proteomics **SHOTGUN** (QC01, QC02 and QC03): </br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_shotgun.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_fasta_file,/users/pr/databases/sp_bovine_2015_11_wo_contaminants_shuffled.fasta,String \
-workflow.variable=input_fasta_psq_file,/users/pr/databases/BLASTformattedDB/sp_bovine_2015_11_wo_contaminants_shuffled.fasta.psq,String \
-workflow.variable=output_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=output_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=output_idxml_file,/users/pr/rolivella/mydata/idXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.idxml,String
```
Remove XML namespace from qcML file:
```
sed -i 's@xmlns="http://psi.hupo.org/ms/mzml"@@g' $file_path
```

Proteomics **SRM**: </br>

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_workflow_srm.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/cc58d80d-6e1e-4902-9adc-b0e0d27eb357_QCS1_5c40d14cf709afec1b6d5a968ba222a3.mzML,String \
-workflow.variable=input_traml,/users/pr/rolivella/mydata/traml/qtrap_bsa.traml,String \
-workflow.variable=output_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/cc58d80d-6e1e-4902-9adc-b0e0d27eb357_QCS1_5c40d14cf709afec1b6d5a968ba222a3.featureXML,String
```
## STEP 2 - QC parameters</br> </br> 

module_parameter_QC_0000007 (MS2 spectral count) (Only Shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000007.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000007,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000029 (Total number of PSM) (Only Shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000029.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000029,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000031 (Total number of uniquely identified peptides) (Only shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000031.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000031,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000032 (Total number of uniquely identified proteins) (Only shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000032.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000032,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1000927 (MEDIAN IT MS1) (Both Shotgun and SRM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1000927.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_string_qccv,QC_1000927,String \
-workflow.variable=input_string_qccv_parent,QC_9000002,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1000928 (MEDIAN IT MS2) (Both Shotgun and SRM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1000928.knwf" \
-workflow.variable=input_mzml_file,/users/pr/rolivella/mydata/mzML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.mzML,String \
-workflow.variable=input_string_qccv,QC_1000928,String \
-workflow.variable=input_string_qccv_parent,QC_9000002,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1001844 (Peptide Area) (Both Shotgun and SRM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1001844.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1001844,String \
-workflow.variable=input_string_qccv_parent,QC_1000014,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```

module_parameter_QC_1001844_qc4l (Peptide Area) (for Shotgun QC4L)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1001844_qc4l.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/20180925_isotopologues_complete.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/180928_Q_QC4L_01_01_aliquot1_vial66.featureXML,String \
-workflow.variable=input_sample_type,QC03,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1001844,String \
-workflow.variable=input_string_qccv_parent,QC_1000014,String \
-workflow.variable=output_json_folder,/users/pr/rolivella/mydata/json,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=delta_mass,5,double \
-workflow.variable=delta_rt,250,double \
-workflow.variable=charge,2,double \
-workflow.variable=threshold_area,1000000,double

```

module_parameter_QC_1000014 (Mass accuracy) (Both Shotgun and SRM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1000014.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1000014,String \
-workflow.variable=input_string_qccv_parent,QC_1000014,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_1010086 (Median Fwhm) (Both Shotgun and SRM)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_1010086.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_featurexml_file,/users/pr/rolivella/mydata/featureXML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.featureXML,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_qccv,QC_1010086,String \
-workflow.variable=input_string_qccv_parent,QC_1010086,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```
module_parameter_QC_0000048 (Sum of all Total Ion Current per RT) (Only Shotgun)
```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_parameter_QC_0000048.knwf" \
-workflow.variable=input_qcml_file,/users/pr/rolivella/mydata/qcML/nf/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631.qcml,String \
-workflow.variable=input_string_qccv,QC_0000048,String \
-workflow.variable=input_string_qccv_parent,QC_9000001,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \
-workflow.variable=output_json_id,70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631,String
```

## STEP 3 - Check peptide JSON files, send to database and move</br> </br> 

module_check_peptides (only for QC_1000014,QC_1001844 and QC_1010086)

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_check_peptides.knwf" \
-workflow.variable=input_csv_file,/users/pr/rolivella/mydata/csv/knime_peptides_final.csv,String \
-workflow.variable=input_string_qccv,QC_1010086,String \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_json_folder,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
-workflow.variable=input_json_filename,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
-workflow.variable=output_json_folder,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
-workflow.variable=output_json_filename,/users/pr/qcloud/outgoing/JSON/1809/70fa8350-1b1b-467e-a714-2b293adef295_QC01_b5132b11365e8c26842c09afee2d1631_QC_1010086.json,String \
```

module_api_conn 

input_mass_spec_run_date =
```
xmllint --xpath 'string(/indexedmzML/mzML/run/@startTimeStamp)' /users/pr/rolivella/mydata/mzML/nf/9d9d9d1b-9d9d-4f1a-9d27-9d2f7635059d_QC03_54c6681460c136b37fce4caadda655ed.mzML

```

input_original_name = 

```
xmllint --xpath 'string(/indexedmzML/mzML/fileDescription/sourceFileList/sourceFile/@name)' /users/pr/rolivella/mydata/mzML/nf/181004_Q_QC1F_01_04.mzML
```

```
knime --launcher.suppressErrors -nosplash -application org.knime.product.KNIME_BATCH_APPLICATION -reset -nosave \
-workflowFile="/users/pr/rolivella/mydata/knwf/module_api_conn.knwf" \
-workflow.variable=input_string_checksum,b5132b11365e8c26842c09afee2d1631,String \
-workflow.variable=input_string_labsystem,70fa8350-1b1b-467e-a714-2b293adef295,String \
-workflow.variable=input_sample_type,QC01,String \
-workflow.variable=input_url_token,http://192.168.101.37:8080/api/auth,String \
-workflow.variable=input_url_insert_file,http://192.168.101.37:8080/api/file/QC:0000005,String \
-workflow.variable=input_url_insert_data,http://192.168.101.37:8080/api/data/pipeline,String \
-workflow.variable=input_json_folder,/users/pr/qcloud/outgoing/JSON/1809,String \ 
-workflow.variable=input_mass_spec_run_date,$$$input_mass_spec_run_date$$$,String \
-workflow.variable=input_original_filename,$$$input_mass_spec_run_date$$$,String

```
