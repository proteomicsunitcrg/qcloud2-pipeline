# QCloud pipeline
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Nextflow version](https://img.shields.io/badge/nextflow-%E2%89%A50.31.0-brightgreen.svg)](https://www.nextflow.io/)
[![Docker Build Status](https://img.shields.io/docker/automated/biocorecrg/qcloud.svg)](https://cloud.docker.com/u/biocorecrg/repository/docker/biocorecrg/qcloud/builds)

* Install  mysql server.
* Install java.
* Install singularity-container.
* Install Nextflow.
* Git clone pipeline: free space 1 GB. 
* Configure Nextflow: params.config and nextflow.config.
* Run pipeline: nextflow run qcloud.nf -bg. This will pull all the Singularity images (around 2GB). Also chmod -R 770 and change max. mem.
* Put file in incoming folder with the correct notation (labsysid from QCloud server).
