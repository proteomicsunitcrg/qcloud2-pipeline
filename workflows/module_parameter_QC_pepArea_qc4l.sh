#!/bin/bash

# Created by Roger Olivella

DATE_LOG=`date '+%Y-%m-%d %H:%M:%S'`
echo "[INFO] -----------------START---[${DATE_LOG}]"

# INPUT:

#Production: 
RAW_FILE=${1}
INPUT_CHECKSUM="${2}"
MASS_FILE=${3}
INPUT_MASS=${4}
OUTPUT_TEMPLATE_JSON=${5}
CURRENT_OUTPUT_FILE="${6}"
HEAVY_CONCENTRATION=${7}
TOLPPM=${8}
RT_WINDOW=${9}
OUTPUT_TMP_JSON="tmp_${RANDOM}.json"

#Test:
#RAW_FILE=/home/rolivella/mydata/toy_dataset/190215_Q_QC01_01_32_6583a564-93dd-4500-a101-b2fe56496b25_QC01_93d2a97b9d0b35c9668663223bdef998.raw
#INPUT_CHECKSUM=2bf4293c4d1c8c891fab774cf973f7e9
#MASS_FILE=/home/rolivella/mydata/txt/masses.txt
#INPUT_MASS=/home/rolivella/mydata/json/xic/mass_isotopologues.json
#OUTPUT_TEMPLATE_JSON=/home/rolivella/mydata/json/xic/template_qcloud_output.json
#QCCODE=QC_1001844
#HEAVY_CONCENTRATION=100
#TOLPPM=10
#RT_WINDOW=2
#OUTPUT_TMP_JSON=/home/rolivella/mydata/json/xic/output_tmp_xic.json
#OUTPUT_FILENAME=6583a564-93dd-4500-a101-b2fe56496b25_QC03_2bf4293c4d1c8c891fab774cf973f7e9
#OUTPUT_FOLDER=/home/rolivella/mygit/qcloud2-bash
#OUTPUT_EXTENSION="json"

echo "[INFO] Running XIC.........."

echo "Raw file: "${RAW_FILE}
echo "Mass file: "${MASS_FILE}
echo "Tolerance in ppm: "${TOLPPM}
echo "Output filename: "${OUTPUT_TMP_JSON}

mono fgcz-xic.exe ${RAW_FILE} xic ${MASS_FILE} ${TOLPPM} ${OUTPUT_TMP_JSON}

if [ ! -e "${OUTPUT_TMP_JSON}" ]; then
    echo "[ERROR] fgcz-xic.exe execution failed! Please check."
    exit
fi 

#Output of fgcz-xic.exe is the input for searching isotopologues algorithm
INPUT_XIC=${OUTPUT_TMP_JSON}

#Run isotopologues search:
echo "[INFO] Running isotopologues search.........."  
 

$(cp $OUTPUT_TEMPLATE_JSON $CURRENT_OUTPUT_FILE)

function join { local IFS="$1"; shift; echo "$*"; } #array to comma-separated string

# Replace checksum: 
sed -i 's/"checksum" : "checksum"/"checksum" : "'$INPUT_CHECKSUM'"/g' $CURRENT_OUTPUT_FILE

# Get heavy isotopologues: 
HEAVY_MASS_LIST=( $(jq -r '.[] | select ( .concentration == '$HEAVY_CONCENTRATION') | .mass' $INPUT_MASS) )

for heavy in "${HEAVY_MASS_LIST[@]}" 
do    
    HEAVY_SEQUENCE=$(jq -r '.[] | select ( .mass == '$heavy') | .shortname' $INPUT_MASS)
    HEAVY_COMPLETE_SEQUENCE=$(jq -r '.[] | select ( .mass == '$heavy' ) | .sequence' $INPUT_MASS)

    #Check if there're intensities: 
    INTENSITIES_CHECK=$(jq -r '.[] | select ( .mass == '$heavy') | .intensities' $INPUT_XIC)
    #if [ ${#INTENSITIES_CHECK[@]} -eq 0 ]; then
    if [ "${INTENSITIES_CHECK}" = "[]" ]; then
        echo "[WARNING] No intensities for the isotopologue: "${HEAVY_COMPLETE_SEQUENCE}
    else
        # RT_MAX and INTENSITY_MAX for heavy isotopologues:  
        INTENSITY_MAX=$(jq -r '.[] | select ( .mass == '$heavy') | .intensities | max' $INPUT_XIC)
        INTENSITY_MAX_INDEX=$(jq -r '.[] | select ( .mass == '$heavy') | .intensities | map(. == '$INTENSITY_MAX') | index(true)' $INPUT_XIC)
        RT_MAX=$(jq -r '.[] | select ( .mass == '$heavy') | .rt['$INTENSITY_MAX_INDEX']' $INPUT_XIC)
        sed -i 's/"value" : "'$HEAVY_COMPLETE_SEQUENCE'ZERO"/"value" : "'$INTENSITY_MAX'"/g' $CURRENT_OUTPUT_FILE #output file

        # INTENSITY_LIGHT_MAX and RT_LIGHT_MAX for light isotopologues according to heavy RT_MAX and INTENSITY_MAX: 
        LIGHT_MASS_LIST=( $(jq -r '.[] | select ( .shortname == "'$HEAVY_SEQUENCE'" and .concentration != '$HEAVY_CONCENTRATION') | .mass' $INPUT_MASS) )    
        for light in "${LIGHT_MASS_LIST[@]}"
        do
            LIGHT_COMPLETE_SEQUENCE=$(jq -r '.[] | select ( .mass == '$light' ) | .sequence' $INPUT_MASS)
            RT_UPPPER=`echo $RT_MAX + $RT_WINDOW | bc`
            RT_LOWER=`echo $RT_MAX - $RT_WINDOW | bc`
            RT_LIGHT_INDICES=( $(jq -r '.[] | select ( .mass == '$light') | .rt | map((. >= '$RT_LOWER') and  (. <= '$RT_UPPPER')) | indices(true) | .[]' $INPUT_XIC))
            RT_LIGHT_INDICES_TO_STRING=$(join , ${RT_LIGHT_INDICES[@]})
            INTENSITY_LIGHT_MAX=( $(jq -r '.[] | select ( .mass == '$light') | [.intensities['${RT_LIGHT_INDICES_TO_STRING}']] | max' $INPUT_XIC) )
            INTENSITY_LIGHT_MAX_INDEX=$(jq -r '.[] | select ( .mass == '$light') | .intensities | map(. == '$INTENSITY_LIGHT_MAX') | index(true)' $INPUT_XIC)
            RT_LIGHT_MAX=$(jq -r '.[] | select ( .mass == '$heavy') | .rt['$INTENSITY_LIGHT_MAX_INDEX']' $INPUT_XIC)
            sed -i 's/"value" : "'$LIGHT_COMPLETE_SEQUENCE'ZERO"/"value" : "'$INTENSITY_LIGHT_MAX'"/g' $CURRENT_OUTPUT_FILE #output file
        done
    fi
done

# Undetected isotopologues to value=0: 
sed -i 's/"value" : "[^ ]*ZERO"/"value" : "0"/g' $CURRENT_OUTPUT_FILE #output file

echo "[INFO] -----------------END---"
