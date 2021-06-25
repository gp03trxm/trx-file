import _ from 'lodash';
import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';
import FileSync from 'lowdb/adapters/FileSync';
import fs from 'fs';
import low from 'lowdb';
import sharp from 'sharp';
import { destination, HTTP_PORT, SCHEDULER_API } from './constants';
import { download, fileExists, init as gcsInit } from './libs/gcs';
import { fileConfigMiddleware, uploadMiddleware } from './middlewares';
import { getNumber } from './image-process/ocr';
import { OcrResult, Response, TrxFileRequest } from './types';
import { serializeError } from 'serialize-error';
import fileCleaner from './libs/file-cleaner';
import trxCaptcha from '@trx/trx-captcha';

const pkg = require('../package.json');

require('./libs/console-override');

const db = low(new FileSync('db.json'));
db.defaults({ retrievedFiles: [] }).write();

gcsInit().catch(console.error);
fileCleaner.startAsService().catch(console.error);

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.json({
    info: 'trx file server',
    headers: req.headers,
    url: req.url,
    version: pkg.version,
  });
});

app.get('/db', (req, res) => {
  res.json(db.getState());
});

app.get('/db/:key', (req, res) => {
  res.json(db.get(req.params.key).value());
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

      (db.get('retrievedFiles') as any)
        .push(_.pick(fileMeta, 'name', 'size', 'updated'))
        .write();

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
  uploadMiddleware,
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
    const result = await trxCaptcha(req.fileConfig?.url.file!);
    res.json({ ...req.fileConfig, captcha: result });
  },
);

app.post(
  '/ocr',
  uploadMiddleware,
  fileConfigMiddleware,
  async function (req: TrxFileRequest, res) {
    console.log('[POST /ocr]', req.body);
    const { method = 'get-number', width, height, left, top } = req.body;

    const {
      file: { filename },
      fileConfig,
      fileConfigPath,
    } = req;
    let ocrResult: OcrResult | undefined = undefined;
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

    if (method === 'get-number' && fileConfig && fileConfigPath) {
      try {
        ocrResult = await getNumber(destination, filename, region);
        const data: Response.Ocr = { ...fileConfig, ocrResult };

        // overwrite the file config
        fs.writeFileSync(fileConfigPath, JSON.stringify(data, null, 2));

        console.log('[POST /ocr] result = ', data);
        res.json(data);
      } catch (error) {
        console.error('[POST /ocr] error = ', error);
        res.status(500).json({
          error: serializeError(error),
        });
      }
    } else {
      res.status(500).json({
        error: { message: `wrong OCR method: ${method}` },
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
