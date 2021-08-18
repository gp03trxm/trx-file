import { ErrorCode, TrxError } from '@trx/trx-types';
import { spawnSync } from 'child_process';
import { COMPONENT, SITE_NAME } from '../constants';
import io from '@pm2/io';

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

    io.init({
      tracing: {
        enabled: true,
        // will add the actual queries made to database, false by default
        detailedDatabasesCalls: true,
        // if you want you can ignore some endpoint based on their path
        ignoreIncomingPaths: [],
        // same as above but used to match entire URLs
        ignoreOutgoingUrls: [],
        /**
         * Determines the probability of a request to be traced. Ranges from 0.0 to 1.0
         * default is 0.5
         */
        samplingRate: 0.5,
      },
    });
  }
};
