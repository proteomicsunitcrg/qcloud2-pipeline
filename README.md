# QCloud Local Version (QLV)

QCloud is a cloud-based system to support proteomics laboratories in daily quality assessment using a user-friendly interface, easy setup, automated data processing and archiving, and unbiased instrument evaluation. https://qcloud.crg.eu

With this tutorial you'll we able to install all the QCloud system in your local server and HPC Cluster. It has two main parts: 

1) QCloud Server: installation of the QCloud website as it is in https://qcloud.crg.eu but with administrative permissions and in your local servers. 
2) QCloud Pipeline: installation of the QCloud pipeline to be run in your preferred HPC system.  

## Steps to install QCloud Server: 

Software requirements: 

* Java, OpenJDK Runtime Environment (build 1.8.0_91-b14) or later.  
* mysql-server, 14.14 or later.  

Installation: 

1. Create a QCloud user, for instance: 
```mysql 
CREATE USER 'qcloud_user'@'%' IDENTIFIED BY 'password_here';
GRANT ALL PRIVILEGES ON * . * TO 'qcloud_user'@'%';
FLUSH PRIVILEGES;
```
3. Download JAR file: https://www.dropbox.com/s/sf259uwyypjyzwb/QCloud2-1.0.19OUTSIDE.jar
4. Download and edit the sample.yml configuration file: https://www.dropbox.com/s/al25r8kojf7b10z/sample.yml
- 4.1. Update with your database information and credentials:   
```yml
datasource:
    ## MYSQL
    url: jdbc:mysql://localhost:3306/database_name?useSSL=false
    username: "qcloud_user"
    password: "password_here"
    driver-class-name: com.mysql.jdbc.Driver
```
- 4.2. Update with your preferred smtp server for email sending: 
```yml
  mail:
    default-encoding: UTF-8
    host: smtp_mail_host
    username: user_smtp
    password: password_smtp
```
- 4.3. Update with your email:
```yml
  email:
    address: your@mail.com
```
Note: at this present version the port 8089 is not yet configurable so don't change it. 

5. Run JAR file: 

```java
java -jar /path/to/QCloud2-1.0.19OUTSIDE.jar --spring.config.location=file:///path/to/sample.yml
``` 

6. Now [Flyway](https://flywaydb.org/) should automatically migrate and set up the database.
7. Once the server is up, open http://localhost:8089 in your browser and log in with zeus@admin.eu | dumbpass.
8. Now you should create a new labsystem (LC + mass spec). For this, go to Management > Instruments > Lab systems and create a new System Name, add a Mass spectrometer and Liquid chromatographer. If you don't find you specific LC or MS model, you can add it clicking on Administration > Instruments > Manage controlled vocabulary. Just search it by name and enable. 
9. Once you added a new lab system, you'll be able to see its name at the top-right corner of the QCloud website. If you click it, you'll see something like: 

`http://localhost:8089/application/view/instrument/d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e`

For the moment, just copy this code "d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e" becasue we'll use it later at the pipeline installation section. 

## Steps to install QCloud pipeline: 

Software requirements: 

* Singularity container, 2.6.1-dist or later. 
* Nextflow, 20.01.0.5264 or later. 

System requirements: 

This pipeline has been tested in the following environment: 

* HPC Cluster running Scientific Linux 7.2. Do not install it in a desktop PC.
* At least 3GB free disk space.  

Installation: 

- `git clone https://github.com/proteomicsunitcrg/qcloud2-pipeline.git` and `chmod -R 770` the created folder. 
- Set up Nextflow params.config file: 
```
params {
    qconfig          = "$baseDir/qcloud.config"
    zipfiles         = "/path/to/pipeline/incoming/*.zip"
    fasta_tab        = "$baseDir/fasta.tsv"
    db_host          = "localhost:8089"
    watch            = "YES"
    api_user         = "zeus@admin.eu"
    api_pass         = "dumbpassword"
}
```
Where: 
- zipfiles: incoming folder where the RAW files (zipped) will be put to be processed by the pipeline. 
- db_host: QCloud server URL and port. See previous QCloud Server installation section.
- watch: "YES" if you want the pipeline to be automatically started if a file is moved to `zipfiles` folder. 
- api_user, api_password: credentals to grant access to the pipeline for accessing the QCloud server database. The passowrd must be the same as the one configured in the Pofile management of the QCloud website. 

- Set up nextflow.config file: modify this file according to your HPC Cluster queues name/s and the memory and CPUs available. 

Usage: 

- To run the pipeline in background mode: `nextflow run -bg qcloud.nf > qcloud.log`. The first time your run this commnad Nextflow will automatically pull the last QCloud container version labeled as `biocorecrg/qcloud:2.1` (1.5GB aprox.). 
- Once the pipeline is started and the QCloud container pulled, you can copy any RAW file coming from any supported mass spectrometer (see Administration > Instruments > Manage controlled vocabulary section in the QCloud local website installed in the previous section). 
- All RAW files must be in a specific format to be successfully processed by the QCloud pipeline: 
    - All files must be zipped with the same name as the RAW file. 
    - Its name must follow the following convention: `filename_labsysid_QC0X_checksum.zip`, where: 
        - filename: any filename, for instance "20200514_LUMOS1".
        - labsysid: is the internal code of the labsystem where the RAW file is coming from (see QCloud Server installation section). 
        - QC0X: either if it's QC01 (BSA) or QC02 (HeLa). 
        - checksum: the md5sum of the RAW file (not the zipped one). 
        - For instance: 20200514_LUMOS1_d2fc2cbf-e632-4f39-ba5a-6f59de0b7c4e_QC01_c010cb81200806e9113919213772aaa9.zip

- Credits: 
     - QCloud Server was mainly developed by Marc Serret and Roger Olivella. 
     - QCloud Pipeline was mainly developed by Luca Cozzuto, Roger Olivella and Toni Hermoso. 
     - ThermoFileRawParser was mainly developed by Niels Hulstaert (https://github.com/compomics/ThermoRawFileParser#thermorawfileparser). 
     - rawDiag was mainly developed by Christian Panse (https://github.com/fgcz/rawDiag). 

- License: QCloud is under Creative Commons License ‎Attribution-ShareAlike 4.0.

Paper: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0189209


Updated by @rolivella on 15/05/2020
