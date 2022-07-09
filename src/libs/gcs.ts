import { Storage } from '@google-cloud/storage';
import { DESTINATION, SITE_NAME } from '../constants.js';
import { getLastPathSegment } from './utils.js';

const keyFilename = process.cwd() + '/gcp-service-key.json';
const storage = new Storage({
  projectId: 'trxvn888',
  keyFilename,
});

const shortLivedBucket = 'trx-file-short-lived';
const shortLivedBucketLegacy = 'trx-file-anonymous-' + (SITE_NAME || 'vnpay');
const captchaBucket = 'trx-file-captcha';

export async function init() {
  const initBuckets = [shortLivedBucket, shortLivedBucketLegacy, captchaBucket];
  const existedBuckets = (await storage.getBuckets())[0].map(b => b.name);

  for (const b of initBuckets) {
    console.log('[gcs-init] init bucket', b);

    if (existedBuckets.indexOf(b) === -1) {
      console.log('[gcs-init] create a bucket');
      const [createdBucket] = await storage.createBucket(b, {
        standard: true,
        location: 'asia-east1',
      });

      createdBucket.addLifecycleRule({
        action: { type: 'Delete' },
        condition: { age: 10 },
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
    .bucket(captcha ? captchaBucket : shortLivedBucketLegacy)
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

/**
 * https://storage.cloud.google.com/trx-file-short-lived/skpay/456c899a-c6d3-4da3-be21-82cc09696e9f/screenrecord-ba82528ae1744327-62c74ad11da423003a1856be.mp4
 * https://storage.cloud.google.com/trx-file-anonymous-skpay/uploads/anr-stack-trace-14b68277e63b2496-1656536383046.txt
 *
 * legacy: anr-stack-trace-14b68277e63b2496-1656536383046.txt
 * new: skpay/456c899a-c6d3-4da3-be21-82cc09696e9f/screenrecord-ba82528ae1744327-62c74ad11da423003a1856be.mp4
 *
 */

export async function fileExists(filename: string) {
  const legacy = !filename.match(/.*\/.*\/.*/);
  const gcsFilename = legacy ? DESTINATION + filename : filename.substring(1);
  const bucket = legacy ? shortLivedBucketLegacy : shortLivedBucket;

  console.log('[fileExists]', legacy, gcsFilename);

  return (await storage.bucket(bucket).file(gcsFilename).exists())[0];
}

/**
 * https://googleapis.dev/nodejs/storage/latest/File.html
 * @param filename
 * @returns
 */
export async function download(filename: string) {
  const matches = filename.match(/.*\/.*\/.*/);
  const legacy = !matches;
  const gcsFilename = legacy ? DESTINATION + filename : filename.substring(1);
  const bucket = legacy ? shortLivedBucketLegacy : shortLivedBucket;

  await storage
    .bucket(bucket)
    .file(gcsFilename)
    .download({
      destination: DESTINATION + '/' + getLastPathSegment(filename),
    });

  return storage.bucket(bucket).file(gcsFilename).getMetadata();
}
