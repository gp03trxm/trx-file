: ${VERSION="108"}
: ${HOSTS="file.vnpay.io file.trxm.cc"}

# convert string to array by space
HOSTS=($HOSTS)

PACKAGE_NAME="com.google.zxing.client.android"
APK_PATH="/Users/ggm/Downloads/com.google.zxing.client.android_2019-02-25.apk"

gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read "$APK_PATH" gs://tl-trx/apks

for host in "${HOSTS[@]}":
do
  curl --location --request POST "https://${host}/app-upgrade" \
  --header 'Content-Type: multipart/form-data' \
  --form "file=@$APK_PATH" \
  --form "appId=$PACKAGE_NAME" \
  --form "version=${VERSION}" | jq

done
