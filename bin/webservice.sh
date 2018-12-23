#!/bin/bash

set -euo pipefail

## Example
## bash webservice.sh -l b2a401cd-ee09-4a2d-8799-765a237beffa -q QCS1 -c 3d0c7b4ef362c15f878afef700a9afed -r myrawfile.zip -i 127.0.0.1 -p mypasswd -o outcome.zip -t "--mzML"

alt=""
ext="zip"
outext="mzML.zip"
out=""
opts=""
optsarg=""
orifile=""
# Webmode could be dev - for allowing 2 interfaces
webmode="index.php"

while getopts "ac:f:i:l:p:q:r:t:o:w:" opt; do
  case $opt in
    a) alt="&alt"
    ;;
    c) checksum="$OPTARG"
    ;;
    f) orifile="$OPTARG"
    ;;
    i) webdavip="$OPTARG"
    ;;
    l) labsys="$OPTARG"
    ;;
    o) out="$OPTARG"
    ;;
    p) webdavpass="$OPTARG"
    ;;
    q) qcode="$OPTARG"
    ;;
    r) rawfile="$OPTARG"
    ;;
    t) opts="$OPTARG"
    ;;
    w) webmode="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    ;;
  esac
done

output=${labsys}_${qcode}_${checksum}

if [ ! -z "${out}" ]; then
    output=${out}
fi

if [ ! -z "${opts}" ]; then
    optsarg="&opts="${opts}
fi


curl --user "webdav:${webdavpass}" -T "${rawfile}" "http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}"
echo "STEP 1"
curl -X GET "http://${webdavip}/${webmode}?input=${labsys}_${qcode}_${checksum}.${ext}${alt}${optsarg}&output=${out}&orifile=${orifile}"
echo "STEP 2"
curl --user "webdav:${webdavpass}" -X GET http://${webdavip}/output/${output}.${outext} > ${output}.${outext}
echo "STEP 3"
curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/output/${output}.${outext}
echo "STEP 4" 
curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}   
