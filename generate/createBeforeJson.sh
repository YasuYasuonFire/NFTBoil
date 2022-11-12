SOURCE_DIR="./json/"
OUTPUT_DIR="./jsonBefore/"

for i in {1..10000}
do
    cat ${SOURCE_DIR}${i}.json | jq 'del(.attributes)' > ${OUTPUT_DIR}${i}.json
done
