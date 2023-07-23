import { Storage } from '@google-cloud/storage';
import { DESTINATION, SITE_NAME } from '../constants.js';
import { GCSFileDescriptor } from '../types.js';
import { getLastPathSegment } from './utils.js';

const keyFilename = process.cwd() + '/gcp-service-key.json';
const storage = new Storage({
  projectId: 'trxvn888',
  keyFilename,
});

const LEGACY_SITE_BUCKETS: string[] = [];
const BUCKET_PREFIXES: string[] = [];

const SHORT_LIVED_BUCKET = 'trx-file-short-lived';
const SHORT_LIVED_BUCKET_LEGACY =
  'trx-file-anonymous-' + (SITE_NAME || 'vnpay');
const CAPTCHA_BUCKET = 'trx-file-captcha';

export async function init() {
  const initBuckets = [
    SHORT_LIVED_BUCKET,
    SHORT_LIVED_BUCKET_LEGACY,
    CAPTCHA_BUCKET,
  ];
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

  LEGACY_SITE_BUCKETS.push(
    ...existedBuckets.filter(b => b.indexOf('trx-file-anonymous-') !== -1),
  );

  const prefixes = (
    await storage
      .bucket(SHORT_LIVED_BUCKET)
      .getFiles({ maxResults: 100, delimiter: '/' })
  )[2].prefixes;

  BUCKET_PREFIXES.push(...prefixes);

  console.log('[gcs-init]', LEGACY_SITE_BUCKETS);
  console.log('[gcs-init]', BUCKET_PREFIXES);
}

export async function cp(
  localFilename: string,
  destination: string,
  option: { captcha?: boolean } = {},
) {
  const { captcha } = option;

  return storage
    .bucket(captcha ? CAPTCHA_BUCKET : SHORT_LIVED_BUCKET_LEGACY)
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
  const legacyPath = DESTINATION + '/' + filename;
  const taskId: string | undefined = (filename.match(/[a-f\d]{24}/i) || [])[0];

  console.log('[fileExists]', filename);

  /**
   * Try bucket for current SITE_NAME
   */
  const currentSites: GCSFileDescriptor[] = [
    {
      bucket: SHORT_LIVED_BUCKET_LEGACY,
      path: legacyPath,
    },
    {
      bucket: SHORT_LIVED_BUCKET,
      path: `${SITE_NAME}/none/${filename}`,
    },
    {
      bucket: SHORT_LIVED_BUCKET,
      path: `${SITE_NAME}/${taskId}/${filename}`,
    },
  ];

  const existed = await batchExisted(currentSites);
  if (existed) {
    console.log('[fileExists] current site found:', existed);
    return existed;
  }

  console.log(`[fileExists] File not found in the current site: ${SITE_NAME}`);

  /**
   * Try brute force all buckets
   */

  const allBuckets: GCSFileDescriptor[] = [];
  for (let bucket of LEGACY_SITE_BUCKETS) {
    allBuckets.push({
      path: legacyPath,
      bucket,
    });
  }
  for (let prefix of BUCKET_PREFIXES) {
    allBuckets.push(
      {
        bucket: SHORT_LIVED_BUCKET,
        path: `${prefix}none/${filename}`,
      },
      {
        bucket: SHORT_LIVED_BUCKET,
        path: `${prefix}${taskId}/${filename}`,
      },
    );
  }

  const existed2 = await batchExisted(allBuckets);
  if (existed2) {
    console.log('[fileExists] brute force found:', existed2);
    return existed2;
  }

  console.log('[fileExists] File not found in the all possible buckets');
  return null;
}

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
