export function isImportantFile(filename: string) {
  return (
    filename.indexOf('script-') !== -1 ||
    filename.indexOf('apk') !== -1 ||
    filename.indexOf('anr') !== -1
  );
}
