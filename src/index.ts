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
import { destination, HTTP_PORT, SCHEDULER_API } from './constants.js';
import { download, fileExists, init as gcsInit } from './libs/gcs.js';
import { errorToJson, setupPm2 } from './libs/utils.js';
import { serializeError } from 'serialize-error';
import { TrxFileRequest } from './types.js';
import './libs/console-override.js';
import {
  uploadFileFormidable,
  fileConfigMiddleware,
  uploadMiddleware,
} from './middlewares/index.js';

gcsInit().catch(console.error);
fileCleaner.startAsService().catch(console.error);

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.json({
    info: 'trx file server',
    headers: req.headers,
    url: req.url,
    version: process.env.version,
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

app.use('/files', express.static(destination), async (req, res, next) => {
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
    console.log('[POST /files]', req.body);
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
    console.log('[POST /captcha-crop]', req.body);
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

    console.log('[POST /ocr] region: ', region);

    if (fileConfig && fileConfigPath) {
      try {
        const { base64, ...cropMetadata } = await crop(
          destination,
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

        console.log('[POST /ocr] result = ', captcha);
        res.json(result);
      } catch (error) {
        console.error('[POST /ocr] error = ', error);
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

app.listen(HTTP_PORT, () => console.log(`App listening on port ${+HTTP_PORT}`));

setupPm2();
