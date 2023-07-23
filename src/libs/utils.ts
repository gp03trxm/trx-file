import { ErrorCode, TrxError } from '@trx/trx-types';
import { spawnSync } from 'child_process';
import {
  COMPONENT,
  ENABLE_PM2_PLUS,
  PM2_PUBLIC_KEY,
  PM2_SECRET_KEY,
  SITE_NAME,
  USE_PM2,
} from '../constants.js';
import { init as ioInit } from './pm2-io.js';
import events from 'events';

export function isImportantFile(filename: string) {
  return filename.indexOf('script-') !== -1 || filename.indexOf('apk') !== -1;
}

/**
 * https://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
 * @param error
 */
export function errorToJson(
  error: Error,
): { name?: ErrorCode; message: string; stack?: string } {
  const result = JSON.parse(
    JSON.stringify(error, Object.getOwnPropertyNames(error)),
  );
  return result;
}

export const createTrxError = (
  name: ErrorCode,
  message = '',
  stack?: string,
): TrxError => {
  return { name, message, stack: stack ?? new Error().stack };
};

export const getLastPathSegment = (filename: string) => {
  if (filename.lastIndexOf('/') == -1) return null;
  return filename.substring(filename.lastIndexOf('/') + 1);
};

/**
 *
 * legacy: anr-stack-trace-14b68277e63b2496-1656536383046.txt
 * new: skpay/456c899a-c6d3-4da3-be21-82cc09696e9f/screenrecord-ba82528ae1744327-62c74ad11da423003a1856be.mp4
 */
export const isLegacyPath = (filename: string) => {
  return !filename.match(/.*\/.*\/.*/);
};

/**
 * pm2 link 80msvetu4zbynqc 6sfoet4o7sdc7ot MACHINE_NAME
 */
export const setupPm2 = () => {
  if (USE_PM2) {
    /** Disable pm2 tracing */
    // ioInit();

    console.log(`[setupPm2] ENABLE_PM2_PLUS: ${ENABLE_PM2_PLUS}`);
    if (ENABLE_PM2_PLUS) {
      try {
        const hostname = `${COMPONENT}-${SITE_NAME}`;
        const result = spawnSync('npx', [
          'pm2',
          'link',
          PM2_SECRET_KEY,
          PM2_PUBLIC_KEY,
          hostname,
        ]);
        if (result.stdout) {
          console.log('[setupPm2]', result.stdout.toString());
        }
        if (result.stderr) {
          console.log('[setupPm2]', result.stderr.toString());
        }
        if (result.error) {
          console.error('[setupPm2]', result.error);
        }
      } catch (e) {
        console.error('[setupPm2]', e);
      }
    }

    try {
      const result = spawnSync('npx', ['pm2', 'install', 'pm2-logrotate']);
      if (result.stdout) {
        console.log('[setupPm2]', result.stdout.toString());
      }
      if (result.stderr) {
        console.log('[setupPm2]', result.stderr.toString());
      }
      if (result.error) {
        console.error('[setupPm2]', result.error);
      }
    } catch (e) {
      console.error('[setupPm2]', e);
    }
  }
};

export const setupEventListener = () => {
  (events.EventEmitter.prototype as any)._maxListeners = 70;
  events.EventEmitter.defaultMaxListeners = 70;
};
