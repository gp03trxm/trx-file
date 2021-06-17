import fs from 'fs';
import { isImportantFile } from './utils';

const run = async (dirName = 'uploads') => {
  console.log('[filter-cleaner] run at dir:', dirName);
  const files = fs.readdirSync(dirName);
  const now = new Date();
  for (let f of files) {
    const fileWithDir = `${dirName}/${f}`;
    const stat = fs.statSync(fileWithDir);

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
    // TTL: 8 hours
    if (diff >= 1000 * 60 * 60 * 8) {
      console.log('[filter-cleaner] delete file', f);
      fs.unlinkSync(fileWithDir);
    }
  }
  console.log('[filter-cleaner] done', dirName);
};

const startAsService = async () => {
  await run();
  setInterval(run, 1000 * 60 * 15); // 15m
};

export default {
  run,
  startAsService,
};
