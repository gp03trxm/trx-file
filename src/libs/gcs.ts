import { Storage } from '@google-cloud/storage';

const keyFilename = process.cwd() + '/gcp-service-key.json';
const storage = new Storage({
  projectId: 'trxvn888',
  keyFilename,
});

const shortLivedBucket =
  'trx-file-anonymous-' + (process.env.SITE_NAME || 'vnpay');
const captchaBucket = 'trx-file-captcha';

export async function init() {
  const initBuckets = [shortLivedBucket, captchaBucket];
  const existedBuckets = (await storage.getBuckets())[0].map(b => b.name);

  for (const b of initBuckets) {
    console.log('[gcs-init] init bucket', b);

    if (existedBuckets.indexOf(b) === -1) {
      console.log('[gcs-init] create a bucket');
      await storage.createBucket(b, {
        standard: true,
        location: 'asia-east1',
      });
      console.log('[gcs-init] done');
    } else {
      console.log('[gcs-init] bucket existed');
    }
  }
}

export async function cp(
  localFilename: string,
  destination: string,
  option: { captcha?: boolean } = {},
) {
  const { captcha } = option;

  return storage
    .bucket(captcha ? captchaBucket : shortLivedBucket)
    .upload(localFilename, {
      destination,
      metadata: {
        // Enable long-lived HTTP caching headers
        // Use only if the contents of the file will never change
        // (If the contents will change, use cacheControl: 'no-cache')
        cacheControl: 'public, max-age=31536000',
      },
    });
}

export async function fileExists(filename: string) {
  return (await storage.bucket(shortLivedBucket).file(filename).exists())[0];
}

/**
 * https://googleapis.dev/nodejs/storage/latest/File.html
 * @param filename
 * @returns
 */
export async function download(filename: string) {
  await storage
    .bucket(shortLivedBucket)
    .file(filename)
    .download({ destination: filename });
  return storage.bucket(shortLivedBucket).file(filename).getMetadata();
}
