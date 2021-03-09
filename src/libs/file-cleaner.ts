import fs from 'fs';

const run = async (dirName = 'uploads') => {
  console.log('[filter-cleaner] run at dir:', dirName);
  const files = fs.readdirSync(dirName);
  const now = new Date();
  for (let f of files) {
    const fileWithDir = `${dirName}/${f}`;
    const stat = fs.statSync(fileWithDir);
    const diff = +now - +stat.atime;
    if (diff >= 1000 * 60 * 60 * 24) {
      console.warn('[filter-cleaner] delete file', f);
      fs.unlinkSync(fileWithDir);
    }
  }
  console.log('[filter-cleaner] done', dirName);
};

const startAsService = async () => {
  await run();
  setInterval(run, 1000 * 60 * 60);
};

export default {
  run,
  startAsService,
};
