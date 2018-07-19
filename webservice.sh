#!/bin/bash

set -euo pipefail

## Example
## bash webservice.sh -l b2a401cd-ee09-4a2d-8799-765a237beffa -q QCS1 -c 3d0c7b4ef362c15f878afef700a9afed -r myrawfile.zip -i 127.0.0.1 -p mypasswd -o outcome.zip

alt=""
ext="zip"
out=""

while getopts "ac:i:l:p:q:r:o:" opt; do
  case $opt in
    a) alt="&alt"
    ;;
    c) checksum="$OPTARG"
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
    \?) echo "Invalid option -$OPTARG" >&2
    ;;
  esac
done

output=${labsys}_${qcode}_${checksum}.mzML.${ext}

if [ ! -z "${out}" ]; then
    output=${out}
fi


curl --user "webdav:${webdavpass}" -T "${rawfile}" "http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}"

curl -X GET http://${webdavip}/index.php?input=${labsys}_${qcode}_${checksum}.${ext}${alt}

curl --user "webdav:${webdavpass}" -X GET http://${webdavip}/output/${output} > ${output}

curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/output/${output}

curl --user "webdav:${webdavpass}" -X DELETE http://${webdavip}/input/${labsys}_${qcode}_${checksum}.${ext}    
