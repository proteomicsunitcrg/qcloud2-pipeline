## QCloud2 Quality Control Pipeline

**Warning: for local installation of QCloud (pipeline+website) please see "local" branch of this repo.**

QCloud has been reshaped from scratch to support dozens of instruments and sites. For this we used some new technologies:

1.1. **Nextflow**: is a software for developing data-driven computational pipelines. Unlike the manual pipeline that was developed in QCloud old version, Nextflow allows to automatize many of the usual pipeline development requirements, as for example parallel computing, easy HPC Cluster deploy and CPU and memory management. In this way we improved a lot our scalability, that is, our ability to process many data coming from multiple instruments and labs.

1.2. **Singularity containers**: are used to package proteomics analysis software like OpenMS (see 1.3) and other tools like ThermoFileRawParser (see 1.4). It works like Docker but it’s adapted to HPC. By using containers we are able to freeze the scripts and libraries of this analysis software so in this way we ensure a high reproducibility of our QC analysis.

1.3. **Knime and OpenMS**: in this new QCloud version we still use the proteomics analysis modules developed by OpenMS upgraded to 2.3 version. What’s new is that instead of using TOPP, we moved to Knime which has been used in the OpenMS community to ease workflows development. DockerHub link: https://hub.docker.com/r/biocorecrg/qcloud

1.4. **ThermoRawFileParser**: we removed our dependency on msconvert from Proteowizard by using this software which is a wrapper around the .net (C#) Thermo Fisher ThermoRawFileReader library for running on Linux with mono. We also containerized it using Singularity so when the pipeline is run it’s image is downloaded and installed automatically. Docker Hub link: https://hub.docker.com/r/biocorecrg/thermorawparser. Original tool source code: https://github.com/compomics/ThermoRawFileParser

1.5. **rawDiag**: we added this tool in order to improve our sensibility to identify all the isotopologues of the 6x5 LC-MS/MS Peptide Reference Mix. rawDiag is an R package supporting LC-MS method optimization for bottom-up proteomics on multiple OS platform. Source code: https://github.com/fgcz/rawDiag

### Credits (specifically for the bioinformatics part of QCloud):

- QCloud Website: Marc Serret, Dani Mancera and Roger Olivella.
- QCloud Pipeline: Luca Cozzuto and Roger Olivella.
- ThermoFileRawParser: Niels Hulstaert (https://github.com/compomics/ThermoRawFileParser#thermorawfileparser).
- rawDiag: Christian Panse (https://github.com/fgcz/rawDiag).

### Credits (for the entire QCloud project):

Cristina Chiva, Eva Borràs, Guadalupe Espadas, Olga Pastor, Amanda Solé, Eduard Sabidó.
