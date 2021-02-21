# Usage

## Default

```bash
curl --location --request POST 'http://localhost:3005/files' \
--header 'Content-Type: multipart/form-data' \
--form 'file=@/Users/ggm/Developer/tokamak-labs/trx-file/testdata/screenshot.png' \
--form 'userId=b092bd4d' | jq
```

## With parameters

```bash
curl --location --request POST 'http://localhost:3005/files?origin=1&preifx=screenshot-' \
--header 'Content-Type: multipart/form-data' \
--form 'file=@/Users/ggm/Developer/tokamaklabs/trx-file/testdata/screenshot.png' \
--form 'userId=b092bd4d' | jq
```

## Use OCR

```bash
curl --location --request POST 'http://localhost:3005/ocr' \
--header 'Content-Type: multipart/form-data' \
--form 'file=@/Users/ggm/Developer/tokamaklabs/trx-file/testdata/screenshot.png' \
--form 'userId=b092bd4d' | jq
```

```bash
curl --location --request POST 'http://localhost:3005/ocr' \
--header 'Content-Type: multipart/form-data' \
--form 'file=@/Users/ggm/Developer/tokamaklabs/trx-file/testdata/screenshot.png' \
--form 'width=1080' \
--form 'height=250' \
--form 'left=0' \
--form 'top=1110' | jq
```

## Upgrade apk

```bash
curl --location --request POST 'http://localhost:3005/app-upgrade' \
--header 'Content-Type: multipart/form-data' \
--form 'file=@/Users/ggm/Developer/tokamak-labs/trx-smshook/app/release/app-release.apk' \
--form 'appId=trx.utils.smshook' \
--form "version=25" | jq
```

To see [upgrade-smshook.sh](./scripts/upgrade-smshook.sh)

## Use update-smshook.sh

```bash
VERSION=45 ./scripts/upgrade-smshook.sh
```
