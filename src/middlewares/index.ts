import db from '../libs/db.js';
import express from 'express';
import formidable, { File } from 'formidable';
import fs from 'fs';
import multer from 'multer';
import trxConsole from '@trx/trx-log';
import { cp as gcsCp } from '../libs/gcs.js';
import { destination } from '../constants.js';
import { FileConfig } from '../types.js';
import { isImportantFile } from '../libs/utils.js';
import { metric as ioMetric } from '../libs/pm2-io.js';
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
    destination,
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
    uploadDir: destination,
    keepExtensions: true,
  });

  /* this is where the renaming happens */
  form.on('fileBegin', function (name, file) {
    //rename the incoming file to the file's name
    file.path = `${destination}/${getFilename(req, file.name!)}`;
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
    const file = files.file as File;
    file.name = getFilename(req, file.name!);
    Object.assign(req, { fileFormidable: file });
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
  ioMetric.uploadFiles.set(db.data!.uploadFiles);

  const { query, body, file, fileFormidable } = req;
  const filename = file?.filename ?? fileFormidable?.name;
  const fileConfig: FileConfig = {
    createdAt: new Date().toISOString(),
    body,
    query,
    file: file ?? fileFormidable,
    url: {
      file: 'http://' + req.headers.host + `/files/${filename}`,
      config: 'http://' + req.headers.host + `/files/${filename}.json`,
    },
  };
  const { captcha } = body ?? {};

  const fileConfigPath = `${destination}/${filename}.json`;
  fs.writeFileSync(fileConfigPath, JSON.stringify(fileConfig, null, 2));
  Object.assign(req, { fileConfig, fileConfigPath });

  const from = fileFormidable?.path ?? `${destination}/${filename}`;

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
