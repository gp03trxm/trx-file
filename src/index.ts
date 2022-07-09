import _ from 'lodash';
import cors from 'cors';
import crop from './image-process/crop.js';
import db from './libs/db.js';
import express from 'express';
import fetch from 'node-fetch';
import fileCleaner from './libs/file-cleaner.js';
import fs from 'fs';
import sharp from 'sharp';
import trxCaptcha, { TrxCaptchaConfig } from '@trx/trx-captcha';
import trxConsole from '@trx/trx-log';
import { DESTINATION, HTTP_PORT, SCHEDULER_API } from './constants.js';
import { download, fileExists, init as gcsInit } from './libs/gcs.js';
import { errorToJson, setupEventListener, setupPm2 } from './libs/utils.js';
import { serializeError } from 'serialize-error';
import { TrxFileRequest } from './types.js';
import './libs/console-override.js';
import {
  uploadFileFormidable,
  fileConfigMiddleware,
  uploadMiddleware,
} from './middlewares/index.js';
import { LogType } from '@trx/trx-types';

gcsInit().catch(console.error);
fileCleaner.startAsService().catch(console.error);

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.json({
    info: 'trx file server',
    headers: req.headers,
    url: req.url,
    version: process.env.npm_package_version,
  });
});

app.get('/db', (req, res) => {
  res.json(db.data);
});

app.get('/db/:key', (req, res) => {
  const { key } = req.params;
  if (key !== 'retrievedFiles' && key !== 'uploadFiles') {
    return res.json({ error: { message: `key is invalid` } });
  }
  res.json(db.data?.[key]);
});

app.use('/files', express.static(DESTINATION), async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  console.log(`[GET /files${req.path}] file not found`);
  try {
    const gcsFilename = destination + req.path;
    if (await fileExists(gcsFilename)) {
      console.log(`[GET /files${req.path}] download file from gcs`);
      const [fileMeta, headers] = await download(gcsFilename);

      db.data?.retrievedFiles.push(_.pick(fileMeta, 'name', 'size', 'updated'));
      db.write();

      res.redirect(req.originalUrl);
    } else {
      res.status(404);
      res.json({ message: 'file not found' });
    }
  } catch (e) {
    res.status(500);
    res.json({ message: e.message });
  }
});

app.post(
  '/files',
  uploadFileFormidable,
  fileConfigMiddleware,
  function (req: TrxFileRequest, res) {
    console.log('[POST /files]', req.params, req.body);
    res.json(req.fileConfig);
  },
);

app.post(
  '/captcha',
  uploadMiddleware,
  fileConfigMiddleware,
  async function (req: TrxFileRequest, res) {
    console.log('[POST /captcha]', req.body);
    try {
      const result = await trxCaptcha(req.fileConfig?.url.file!, {
        dataType: 'url',
        algorithm: req.body.algorithm ?? 'basic',
      });
      res.json({ ...req.fileConfig, captcha: result });
    } catch (error) {
      console.error(error);
      res.json({ error: errorToJson(error) });
    }
  },
);

app.post(
  ['/captcha-crop', '/ocr'],
  uploadMiddleware,
  fileConfigMiddleware,
  async function (req: TrxFileRequest, res) {
    const baseLog: Partial<LogType> = {
      func: 'postCaptchaCrop',
    };

    trxConsole.log('[POST /captcha-crop]', req.body).scalyr(baseLog);
    const body = JSON.parse(req.body.bodyString ?? '{}');
    const { width, height, left, top } = body;
    const captchaConfig = body.captchaConfig as TrxCaptchaConfig;

    const {
      file: { filename },
      fileConfig,
      fileConfigPath,
    } = req;
    let region: sharp.Region = { width: 1080, height: 165, left: 0, top: 1110 };

    if (!isNaN(width) && !isNaN(height) && !isNaN(left) && !isNaN(top)) {
      region = {
        width: parseInt(width),
        height: parseInt(height),
        left: parseInt(left),
        top: parseInt(top),
      };
    }

    trxConsole.log('[POST /captcha-crop] region: ', region).scalyr(baseLog);

    if (fileConfig && fileConfigPath) {
      try {
        const { base64, ...cropMetadata } = await crop(
          DESTINATION,
          filename,
          region,
        );
        const captcha = await trxCaptcha(base64, {
          ...captchaConfig,
          dataType: 'base64',
        });
        const result = { ...cropMetadata, captcha };

        // overwrite the file config
        fs.writeFileSync(fileConfigPath, JSON.stringify(result, null, 2));

        trxConsole.log('[POST /captcha-crop] result = ', captcha).scalyr({
          ...baseLog,
          data: captcha,
        });
        res.json(result);
      } catch (error: any) {
        trxConsole
          .error('[POST /captcha-crop] error = ', error)
          .scalyr({ ...baseLog, error });
        res.status(500).json({
          error: serializeError(error),
        });
      }
    } else {
      res.status(500).json({
        error: {
          message: `wrong fileConfig (${fileConfig}) or fileConfigPath (${fileConfigPath})`,
        },
      });
    }
  },
);

app.post(
  '/app-upgrade',
  uploadMiddleware,
  fileConfigMiddleware,
  async function (req: TrxFileRequest, res) {
    console.log('[POST /app-upgrade]', req.body);
    const { appId, version } = req.body;
    const { fileConfig } = req;

    const api = SCHEDULER_API;
    const upgradeApi = `${api}/configs/app-version/upgrade`;
    const json = await fetch(upgradeApi, {
      method: 'POST',
      body: JSON.stringify({ appId, version, url: fileConfig?.url.file }),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json());

    res.json({ ...json, upgradeApi });
  },
);

app.listen(HTTP_PORT, () =>
  trxConsole
    .log(`App listening on port ${+HTTP_PORT}`)
    .scalyr({ func: 'index' }),
);

try {
  setupPm2();
  setupEventListener();
} catch (error: any) {
  trxConsole.error('[setup] error = ', error).scalyr({ func: 'setup', error });
}
