import { OutputInfo } from 'sharp';
import { Request } from 'express';
import { IImageToTextTaskResult, IGetTaskResultResponse } from 'anticaptcha';
import { File } from 'formidable';

export type FileConfig = {
  createdAt: string;
  query: {
    // tslint:disable-next-line: no-any
    [key in string]: any;
  };
  body: {
    // tslint:disable-next-line: no-any
    [key in string]: any;
  };
  file: Express.Multer.File | File;
  url: {
    file: string;
    config: string;
  };
};

/**
 * @deprecated
 */
export type OcrResult = {
  croppedFileInfo: OutputInfo;
  croppedFilename: string;
  text: string;
  spentTime: number;
  anticaptchaResult: IGetTaskResultResponse<IImageToTextTaskResult>;
  method: 'get-number'; // and other future methods
};

export type CropResult = {
  croppedFileInfo: OutputInfo;
  croppedFilename: string;
  base64: string;
  spentTime: number;
};

export declare namespace Response {
  type PostFile = FileConfig;
  type Ocr = FileConfig & { ocrResult?: OcrResult };
}

export type TrxFileRequest = Request & {
  fileConfig?: FileConfig;
  fileConfigPath?: string;
};

export type GCSFileDescriptor = {
  bucket: string;
  path: string;
};
