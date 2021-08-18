# Usage

## Default

```bash
curl --location --request POST 'http://localhost:3005/files' \
--header 'Content-Type: multipart/form-data' \
--form "file=@`pwd`/testdata/screenshot.png" \
--form 'workerId=b092bd4d' | jq
```

## With parameters

```bash
curl --location --request POST 'http://localhost:3005/files?origin=1&preifx=screenshot-' \
--header 'Content-Type: multipart/form-data' \
--form "file=@`pwd`/testdata/screenshot.png" \
--form 'workerId=b092bd4d' | jq
```

## Upload captcha file

```bash
curl --location --request POST 'http://localhost:3005/files' \
--header 'Content-Type: multipart/form-data' \
--form "file=@`pwd`/testdata/screenshot.png" \
--form 'answer=yd51' \
--form 'captcha=1' | jq
```

## Use OCR (deprecated)

```bash
curl --location --request POST 'http://localhost:3005/ocr' \
--header 'Content-Type: multipart/form-data' \
--form "file=@`pwd`/testdata/screenshot.png" \
--form 'workerId=b092bd4d' | jq
```

```bash
curl --location --request POST 'http://localhost:3005/ocr' \
--header 'Content-Type: multipart/form-data' \
--form "file=@`pwd`/testdata/screenshot.png" \
--form 'algorithm=basic' \
--form 'width=1080' \
--form 'height=250' \
--form 'left=0' \
--form 'top=1110' | jq
```

## Use captcha-crop

```bash
c=`cat testdata/data-vcb-1.json`
curl --location --request POST "http://localhost:3005/captcha-crop" \
--header "Content-Type: multipart/form-data" \
--form "file=@`pwd`/testdata/data-vcb-raw-1.png" \
--form "bodyString=$c" | jq
```

## Use captcha

```bash
curl --location --request POST "http://localhost:3005/captcha" \
--header "Content-Type: multipart/form-data" \
--form "algorithm=basic" \
--form "file=@`pwd`/testdata/croppedImage.jpg" | jq
```

```JSON
{
  "createdAt": "2021-06-25T10:40:51.211Z",
  "body": {},
  "query": {},
  "file": {
    "fieldname": "file",
    "originalname": "croppedImage.jpg",
    "encoding": "7bit",
    "mimetype": "image/jpeg",
    "destination": "uploads",
    "filename": "1208a6dd-e03e-493c-8ef6-5c4c29e58ec2.jpg",
    "path": "uploads/1208a6dd-e03e-493c-8ef6-5c4c29e58ec2.jpg",
    "size": 14904
  },
  "url": {
    "file": "http://localhost:3005/files/1208a6dd-e03e-493c-8ef6-5c4c29e58ec2.jpg",
    "config": "http://localhost:3005/files/1208a6dd-e03e-493c-8ef6-5c4c29e58ec2.jpg.json"
  },
  "captcha": {
    "text": "3594187206",
    "timeSpent": 1444,
    "agent": "captchaGuru",
    "agentResult": {
      "status": 1,
      "request": "3594187206"
    }
  }
}
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

## Pure ESM package

<https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c>
