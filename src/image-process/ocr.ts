import sharp, { OutputInfo } from 'sharp';
import { getTextFromBase64 } from './image-to-text';
import { OcrResult } from '../types';
import { IImageToTextTaskResult, IGetTaskResultResponse } from 'anticaptcha';

export const getNumber = async (
  destination: string,
  filename: string,
  region: sharp.Region,
): Promise<OcrResult> => {
  const ocrStartTime = +new Date();
  const croppedFilename =
    filename.substr(0, filename.lastIndexOf('.')) + '_cropped.jpg';
  const filePath = `${destination}/${filename}`;
  const croppedFilePath = `${destination}/${croppedFilename}`;

  const promises: Promise<
    OutputInfo | IGetTaskResultResponse<IImageToTextTaskResult> | void
  >[] = [
    sharp(filePath).extract(region).toFile(croppedFilePath),
    sharp(filePath)
      .extract(region)
      .toBuffer()
      .then(async data => {
        return getTextFromBase64(data.toString('base64'));
      }),
  ];

  const res = await Promise.all(promises);

  const croppedFileInfo = res[0] as OutputInfo;
  const anticaptchaResult = res[1] as IGetTaskResultResponse<IImageToTextTaskResult>;

  return {
    croppedFileInfo,
    croppedFilename,
    anticaptchaResult,
    text: anticaptchaResult?.solution?.text,
    spentTime: +new Date() - ocrStartTime,
    method: 'get-number',
  };
};
