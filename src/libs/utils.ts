import { ErrorCode, TrxError } from '@trx/trx-types';
import { spawnSync } from 'child_process';
import { COMPONENT, SITE_NAME } from '../constants.js';
import { init as ioInit } from './pm2-io.js';

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

/**
 * pm2 link 80msvetu4zbynqc 6sfoet4o7sdc7ot MACHINE_NAME
 */
export const setupPm2 = () => {
  if (process.env.USE_PM2) {
    ioInit();

    const hostname = `${COMPONENT}-${SITE_NAME}`;
    try {
      const result = spawnSync('npx', [
        'pm2',
        'link',
        '80msvetu4zbynqc',
        '6sfoet4o7sdc7ot',
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
