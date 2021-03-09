import { Storage } from '@google-cloud/storage';
import { destination } from '../constants';

const keyFilename = process.cwd() + '/gcp-service-key.json';
const storage = new Storage({
  projectId: 'ggm-project',
  keyFilename,
});

const bucketName = 'trx-file-' + (process.env.SITE_NAME || 'vnpay');

export async function init() {
  console.log('[gcs-init] getting bucket', bucketName);
  const existedBuckets = (await storage.getBuckets())[0].map(b => b.name);

  if (existedBuckets.indexOf(bucketName) === -1) {
    console.log('[gcs-init] create a bucket');
    await storage.createBucket(bucketName, {
      archive: true,
      location: 'asia-east1',
    });
    console.log('[gcs-init] done');
  } else {
    console.log('[gcs-init] bucket existed');
  }
}

export async function cp(localFilename: string, destination: string) {
  return storage.bucket(bucketName).upload(localFilename, {
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
  return (await storage.bucket(bucketName).file(filename).exists())[0];
}

/**
 * https://googleapis.dev/nodejs/storage/latest/File.html
 * @param filename
 * @returns
 */
export async function download(filename: string) {
  await storage
    .bucket(bucketName)
    .file(filename)
    .download({ destination: filename });
  return storage.bucket(bucketName).file(filename).getMetadata();
}
