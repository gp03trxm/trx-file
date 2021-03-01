import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { FileConfig } from '../types';
import { destination } from '../constants';
import { cp as gcsCp } from '../libs/gcs';

const splitExtension = (name: String) => {
  const index = name.lastIndexOf('.');
  if (index === -1) {
    return { filename: name, extension: '' };
  }
  const extension = name.substr(index);
  const filename = name.substr(0, index);
  return { filename, extension };
};

export const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
      const { prefix = '', origin = false } = req.query;
      if (origin) {
        const { originalname } = file;
        cb(null, `${prefix}${originalname}`);
      } else {
        const { originalname } = file;
        const { extension } = splitExtension(originalname);
        const filename = `${prefix}${uuid()}${extension}`;
        cb(null, filename);
      }
    },
  }),
}).single('file');

export const fileConfigMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  console.log('[fileConfigMiddleware][req.file]', req.file);

  if (!req.file) {
    return res.json({ error: { message: 'req.file is null' } });
  }

  const { query, body, file } = req;
  const { filename } = file;
  const fileConfig: FileConfig = {
    createdAt: new Date().toISOString(),
    body,
    query,
    file,
    url: {
      file: 'http://' + req.headers.host + `/files/${filename}`,
      config: 'http://' + req.headers.host + `/files/${filename}.json`,
    },
  };

  const fileConfigPath = `${destination}/${filename}.json`;
  fs.writeFileSync(fileConfigPath, JSON.stringify(fileConfig, null, 2));
  Object.assign(req, { fileConfig, fileConfigPath });

  gcsCp(`${destination}/${filename}`, `uploads/${filename}`)
    .then(() => {
      console.log(`[fileConfigMiddleware] gcs uploaded ${filename}`);
    })
    .catch(console.error);

  gcsCp(fileConfigPath, `uploads/${filename}.json`)
    .then(() => {
      console.log(`[fileConfigMiddleware] gcs uploaded ${filename}.json`);
    })
    .catch(console.error);

  next();
};
