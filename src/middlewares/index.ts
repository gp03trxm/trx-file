import db from '../libs/db.js';
import express from 'express';
import formidable, { File } from 'formidable';
import fs from 'fs';
import multer from 'multer';
import trxConsole from '@trx/trx-log';
import { cp as gcsCp } from '../libs/gcs.js';
import { DESTINATION } from '../constants.js';
import { FileConfig } from '../types.js';
import { isImportantFile } from '../libs/utils.js';
import { meter as ioMeter, metric as ioMetric } from '../libs/pm2-io.js';
import { v4 as uuid } from 'uuid';

const splitExtension = (name: String) => {
  const index = name.lastIndexOf('.');
  if (index === -1) {
    return { filename: name, extension: '' };
  }
  const extension = name.substr(index);
  const filename = name.substr(0, index);
  return { filename, extension };
};

const getFilename = (req: express.Request, originalname: string) => {
  const { prefix = '', origin = false } = req.query;
  if (origin) {
    return `${prefix}${originalname}`;
  } else {
    const { extension } = splitExtension(originalname);
    const filename = `${prefix}${uuid()}${extension}`;
    return filename;
  }
};

export const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: DESTINATION,
    filename: (req, file, cb) => {
      cb(null, getFilename(req, file.originalname));
    },
  }),
}).single('file');

export const uploadFileFormidable = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const form = formidable({
    multiples: true,
    uploadDir: DESTINATION,
    keepExtensions: true,
    maxFileSize: 600 * 1024 * 1024, // 600 mb
  });

  /* this is where the renaming happens */
  form.on('fileBegin', function (name, file) {
    //rename the incoming file to the file's name
    try {
      file.path = `${DESTINATION}/${getFilename(req, file.name!)}`;
    } catch (e: any) {
      trxConsole.error('[uploadFileFormidable][fileBegin]', e).scalyr({
        func: 'uploadFileFormidable',
        error: e,
      });
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      trxConsole.error(err).scalyr({
        func: 'uploadFileFormidable',
        error: err,
        message: err.message,
        data: {
          headers: req.headers,
        },
      });
      return next(err);
    }

    try {
      const file = files.file as File;
      file.name = getFilename(req, file.name!);
      Object.assign(req, { fileFormidable: file });
    } catch (e: any) {
      trxConsole.error('[uploadFileFormidable][parse]', e).scalyr({
        func: 'uploadFileFormidable',
        error: e,
      });
    }
    next();
  });
};

export const fileConfigMiddleware = (
  req: express.Request & { fileFormidable?: File },
  res: express.Response,
  next: express.NextFunction,
) => {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  console.log('[fileConfigMiddleware][req.file]');

  if (!req.file && !req.fileFormidable) {
    return res.json({ error: { message: 'req.file is null' } });
  }

  db.data!.uploadFiles++;
  db.write();

  ioMetric.uploadFiles().set(db.data!.uploadFiles);
  ioMeter.fileSec().mark();

  const { query, body, file, fileFormidable } = req;

  const protocol =
    req.headers.host?.indexOf('localhost') === -1 ? 'https' : 'http';

  const filename = file?.filename ?? fileFormidable?.name;
  const fileConfig: FileConfig = {
    createdAt: new Date().toISOString(),
    body,
    query,
    file: file ?? fileFormidable,
    url: {
      file: `${protocol}://${req.headers.host}/files/${filename}`,
      config: `${protocol}://${req.headers.host}/files/${filename}.json`,
    },
  };
  const { captcha } = body ?? {};

  const fileConfigPath = `${DESTINATION}/${filename}.json`;
  fs.writeFileSync(fileConfigPath, JSON.stringify(fileConfig, null, 2));
  Object.assign(req, { fileConfig, fileConfigPath });

  const from = fileFormidable?.path ?? `${DESTINATION}/${filename}`;

  gcsCp(from, `uploads/${filename}`, { captcha })
    .then(() => {
      console.log(`[fileConfigMiddleware] gcs uploaded ${from}`);
      if (!isImportantFile(filename)) {
        console.log(`[fileConfigMiddleware] deleted ${from}`);
        fs.unlinkSync(from);
      }
    })
    .catch(console.error);

  gcsCp(fileConfigPath, `uploads/${filename}.json`, { captcha })
    .then(() => {
      console.log(`[fileConfigMiddleware] gcs uploaded ${filename}.json`);
      if (!isImportantFile(filename)) {
        console.log(`[fileConfigMiddleware] deleted ${fileConfigPath}`);
        fs.unlinkSync(fileConfigPath);
      }
    })
    .catch(console.error);

  next();
};
