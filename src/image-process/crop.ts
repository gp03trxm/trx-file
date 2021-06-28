import sharp, { OutputInfo } from 'sharp';
import { CropResult } from '../types';

export default async function crop(
  destination: string,
  filename: string,
  region: sharp.Region,
): Promise<CropResult> {
  const ocrStartTime = +new Date();
  const croppedFilename =
    filename.substr(0, filename.lastIndexOf('.')) + '_cropped.jpg';
  const filePath = `${destination}/${filename}`;
  const croppedFilePath = `${destination}/${croppedFilename}`;

  const promises: Promise<OutputInfo | string | void>[] = [
    sharp(filePath).extract(region).toFile(croppedFilePath),
    sharp(filePath)
      .extract(region)
      .toBuffer()
      .then(async data => {
        return data.toString('base64');
      }),
  ];

  const res = await Promise.all(promises);

  const croppedFileInfo = res[0] as OutputInfo;
  const base64 = res[1] as string;

  return {
    croppedFileInfo,
    croppedFilename,
    base64,
    spentTime: +new Date() - ocrStartTime,
  };
}
