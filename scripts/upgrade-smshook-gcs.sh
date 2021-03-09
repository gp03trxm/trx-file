: ${VERSION="111"}
: ${HOSTS="file.vnpay.io file.trxm.cc file.defigo.vc file.saokim.io file1.wbcn.one"}

# convert string to array by space
HOSTS=($HOSTS)

GCS_VN_APK="tl-trx/vn/smshook-${VERSION}-vn-release.apk"
LOCAL_VN_APK="`pwd`/tmp-smshook-${VERSION}-vn-release.apk"

GCS_DFG_APK="tl-dfg/apks/smshook-${VERSION}-dfg-release.apk"
LOCAL_DFG_APK="`pwd`/tmp-smshook-${VERSION}-dfg-release.apk"

GCS_CN_APK="tl-trx/cn/smshook-${VERSION}-cn-release.apk"
LOCAL_CN_APK="`pwd`/tmp-smshook-${VERSION}-cn-release.apk"

gsutil -h "Cache-Control:no-cache,max-age=0" cp gs://$GCS_VN_APK $LOCAL_VN_APK
gsutil -h "Cache-Control:no-cache,max-age=0" cp gs://$GCS_DFG_APK $LOCAL_DFG_APK
gsutil -h "Cache-Control:no-cache,max-age=0" cp gs://$GCS_CN_APK $LOCAL_CN_APK

for host in "${HOSTS[@]}":
  do
    # legacy
    curl --location --request POST "https://${host}/app-upgrade" \
    --header 'Content-Type: multipart/form-data' \
    --form "file=@$LOCAL_VN_APK" \
    --form 'appId=trx.utils.smshook' \
    --form "version=${VERSION}" | jq ".apps.\"trx.utils.smshook\".versions.\"${VERSION}\""

    # for vn
    curl --location --request POST "https://${host}/app-upgrade" \
    --header 'Content-Type: multipart/form-data' \
    --form "file=@$LOCAL_VN_APK" \
    --form 'appId=trx.utils.smshook#vn#release' \
    --form "version=${VERSION}" | jq ".apps.\"trx.utils.smshook#vn#release\".versions.\"${VERSION}\""

    # for dfg
    curl --location --request POST "https://${host}/app-upgrade" \
    --header 'Content-Type: multipart/form-data' \
    --form "file=@$LOCAL_DFG_APK" \
    --form 'appId=trx.utils.smshook#dfg#release' \
    --form "version=${VERSION}" | jq ".apps.\"trx.utils.smshook#dfg#release\".versions.\"${VERSION}\""

    # for cn
    curl --location --request POST "https://${host}/app-upgrade" \
    --header 'Content-Type: multipart/form-data' \
    --form "file=@$LOCAL_CN_APK" \
    --form 'appId=trx.utils.smshook#cn#release' \
    --form "version=${VERSION}" | jq ".apps.\"trx.utils.smshook#cn#release\".versions.\"${VERSION}\""
  done
