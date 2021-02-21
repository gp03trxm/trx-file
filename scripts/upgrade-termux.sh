: ${VERSION="102"}
: ${HOSTS="file.vnpay.io file.trxm.cc"}

# convert string to array by space
HOSTS=($HOSTS)

gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read "/Users/ggm/Developer/tokamaklabs/termux-app/app/release/termux-${VERSION}-release.apk" gs://tl-trx/vn
gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read "/Users/ggm/Developer/tokamaklabs/termux-app/app/build/outputs/apk/debug/termux-${VERSION}-debug.apk" gs://tl-trx/vn

npx qrcode -s 10 -o "termux-${VERSION}-release-qrcode.png" "https://storage.googleapis.com/tl-trx/vn/termux-${VERSION}-release.apk"
gsutil -h "Cache-Control:no-cache,max-age=0" cp -a public-read "termux-${VERSION}-release-qrcode.png" gs://tl-trx/vn

for host in "${HOSTS[@]}":
do
  curl --location --request POST "https://${host}/app-upgrade" \
  --header 'Content-Type: multipart/form-data' \
  --form "file=@/Users/ggm/Developer/tokamaklabs/termux-app/app/release/termux-${VERSION}-release.apk" \
  --form 'appId=com.termux' \
  --form "version=${VERSION}" | jq ".apps.\"com.termux\".versions.\"${VERSION}\""

  curl --location --request POST "https://${host}/app-upgrade" \
  --header 'Content-Type: multipart/form-data' \
  --form "file=@/Users/ggm/Developer/tokamaklabs/termux-app/app/build/outputs/apk/debug/termux-${VERSION}-debug.apk" \
  --form 'appId=com.termux#debug' \
  --form "version=${VERSION}" | jq ".apps.\"com.termux#debug\".versions.\"${VERSION}\""
done
