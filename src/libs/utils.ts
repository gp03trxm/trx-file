import { ErrorCode, TrxError } from '@trx/trx-types';

export function isImportantFile(filename: string) {
  return (
    filename.indexOf('script-') !== -1 ||
    filename.indexOf('apk') !== -1 ||
    filename.indexOf('anr') !== -1
  );
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
