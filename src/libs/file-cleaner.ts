import tconsole from '@trx/trx-log';
import fs from 'node:fs/promises';
import { isImportantFile } from './utils.js';

/**
 * https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
 * @param dir
 * @returns
 */
// async function getFiles(dir = 'uploads') {
//   const dirs = await fs.readdir(dir, { withFileTypes: true });
//   const files: any = await Promise.all(
//     dirs.map(dirent => {
//       const res = resolve(dir, dirent.name);
//       return dirent.isDirectory() ? getFiles(res) : res;
//     }),
//   );
//   return Array.prototype.concat(...files);
// }

const run = async (dirName = 'uploads') => {
  console.log('[filter-cleaner] run at dir:', dirName);

  const files = await fs.readdir(dirName);
  const now = new Date();
  for (let f of files) {
    const fileWithDir = `${dirName}/${f}`;
    const stat = await fs.stat(fileWithDir).catch(console.error);

    if (!stat) {
      continue;
    }

    /**
     * skip directory, script-*.js and *.apk
     */
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.isDirectory() ||
      isImportantFile(f)
    ) {
      console.log(
        '[filter-cleaner] skip file',
        f,
        stat.isFile(),
        stat.isSymbolicLink(),
        stat.isDirectory(),
      );
      continue;
    }

    const diff = +now - +stat.atime;
    // TTL: 1 hour
    if (diff >= 1000 * 60 * 60) {
      console.log('[filter-cleaner] delete file', f);
      await fs.unlink(fileWithDir).catch(console.error);
    }
  }
  console.log('[filter-cleaner] done', dirName);
};

const startAsService = async () => {
  try {
    await run();
  } catch (e: any) {
    tconsole.error(e).send({
      component: 'trx-file',
      subComponent: 'file-cleaner',
      error: e,
    });
  }
  setInterval(run, 1000 * 60 * 60); // 15m
};

export default {
  run,
  startAsService,
};
