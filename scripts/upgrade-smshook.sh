: ${VERSION="44"}
: ${HOSTS="file.vnpay.io"}

# convert string to array by space
HOSTS=($HOSTS)

RELEASE_APK="/Users/ggm/Developer/tokamaklabs/trx-app-agent/app/common/release/smshook-${VERSION}-vn-release.apk"
DEBUG_APK="/Users/ggm/Developer/tokamaklabs/trx-app-agent/app/build/outputs/apk/common/debug/smshook-${VERSION}-vn-debug.apk"

gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read $RELEASE_APK gs://tl-trx/vn
gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read $DEBUG_APK gs://tl-trx/vn

npx qrcode -s 10 -o "smshook-${VERSION}-release-qrcode.png" "https://storage.googleapis.com/tl-trx/vn/smshook-${VERSION}-vn-release.apk"
gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read "smshook-${VERSION}-release-qrcode.png" gs://tl-trx/vn

npx qrcode -s 10 -o "smshook-${VERSION}-debug-qrcode.png" "https://storage.googleapis.com/tl-trx/vn/smshook-${VERSION}-vn-debug.apk"
gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read "smshook-${VERSION}-debug-qrcode.png" gs://tl-trx/vn

for host in "${HOSTS[@]}":
  do
    curl --location --request POST "https://${host}/app-upgrade" \
    --header 'Content-Type: multipart/form-data' \
    --form "file=@$RELEASE_APK" \
    --form 'appId=trx.utils.smshook' \
    --form "version=${VERSION}" | jq ".apps.\"trx.utils.smshook\".versions.\"${VERSION}\""

    curl --location --request POST "https://${host}/app-upgrade" \
    --header 'Content-Type: multipart/form-data' \
    --form "file=@$DEBUG_APK" \
    --form 'appId=trx.utils.smshook#debug' \
    --form "version=${VERSION}" | jq ".apps.\"trx.utils.smshook#debug\".versions.\"${VERSION}\""
  done
