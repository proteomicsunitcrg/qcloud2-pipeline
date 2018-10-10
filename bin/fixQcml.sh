#!/bin/bash
sed s@'xmlns=\"http://psi.hupo.org/ms/mzml\"'@@g *.qcml | sed s@'qcML xmlns=\"https://github.com/qcML/qcml\"'@qcML@g > temp.qcml2
mv temp.qcml2 *.qcml 
