import dotenv from 'dotenv';
dotenv.config();

/**
 * @workaround
 */
export const SITE_BUCKETS = [
  'vnpay',
  'skpay',
  'cnpay',
  'dnpay',
  'dnpay-file',
  'rppay',
  'vtpay',
  'nyypay',
  'nyypay-file',
  'vngoldpay',
  'vipay',
  '101pay',
  'tcgpay',
  'ttpay',
  'ydpay',
  'fayapay',
  'vi',
  '101',
  'tcg',
  'dn',
  'csm',
  'csmpay',
  'nissin',
  'nissinpay',
  'vt',
  'rmpay',
  'tnpay',
  'vng',
  'dh',
  'trxm',
  'cepay',
  'tgpay',
  'jspay',
  '365pay',
];

export const DESTINATION = 'uploads';

export const HTTP_PORT = process.env.HTTP_PORT ?? '3005';

export const SCHEDULER_API =
  process.env.SCHEDULER_API ?? 'http://localhost:3000';

// old 9adab5302326cf6f36244161b51b6887
export const ANTI_CAPTCHA_KEY =
  process.env.ANTI_CAPTCHA_KEY ?? '6bee4786e70fdeb2284c9ebef8220298';

export const SITE_NAME = process.env.SITE_NAME ?? 'devpay';

export const COMPONENT = process.env.COMPONENT ?? 'file';

export const PM2_SECRET_KEY = process.env.PM2_SECRET_KEY ?? '80msvetu4zbynqc';

export const PM2_PUBLIC_KEY = process.env.PM2_PUBLIC_KEY ?? '6sfoet4o7sdc7ot';
