import { Storage } from '@google-cloud/storage';
import { DESTINATION, SITE_BUCKETS, SITE_NAME } from '../constants.js';
import { GCSFileDescriptor } from '../types.js';
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

export async function fileExists(
  filename: string,
): Promise<GCSFileDescriptor | null> {
  const legacy = !filename.match(/.*\/.*\/.*/);
  const legacyPath = DESTINATION + '/' + filename;

  console.log('[fileExists]', filename);

  let existed = (
    await storage.bucket(shortLivedBucketLegacy).file(legacyPath).exists()
  )[0];
  if (existed) {
    return { bucket: shortLivedBucketLegacy, path: legacyPath };
  }

  const taskId: string | undefined = (filename.match(/[a-f\d]{24}/i) || [])[0];
  const gcsPossibleFilename = [`none/${filename}`, `${taskId}/${filename}`];

  const bucketAndPaths = SITE_BUCKETS.map(site => {
    return gcsPossibleFilename.map(path => {
      return {
        bucket: shortLivedBucket,
        path: `${site}/${path}`,
      };
    });
  }).flat();

  const promises = bucketAndPaths.map(async ({ bucket, path }) => {
    let existed = (await storage.bucket(bucket).file(path).exists())[0];
    return existed ? { bucket: bucket, path: path } : null;
  });

  const result = (await Promise.all(promises)).filter(e => e);
  console.log('[fileExists]', result);

  return result[0];
export async function batchExisted(bucketWithPaths: GCSFileDescriptor[]) {
  const results = await Promise.all(
    bucketWithPaths.map(async ({ bucket, path }) => {
      if ((await storage.bucket(bucket).file(path).exists())[0]) {
        return { bucket, path };
      } else {
        return null;
      }
    }),
  );

  const found = results.filter(r => r !== null);

  if (found[0]) {
    return found[0];
  } else {
    return null;
  }
}

/**
 * https://googleapis.dev/nodejs/storage/latest/File.html
 * @param filename
 * @returns
 */
export async function download({ bucket, path }: GCSFileDescriptor) {
  await storage
    .bucket(bucket)
    .file(path)
    .download({
      destination: DESTINATION + '/' + getLastPathSegment(path),
    });

  return storage.bucket(bucket).file(path).getMetadata();
}
