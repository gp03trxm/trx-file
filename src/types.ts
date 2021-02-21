import { OutputInfo } from 'sharp';
import { Request } from 'express';
import { IImageToTextTaskResult, IGetTaskResultResponse } from 'anticaptcha';

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
  file: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
  };
  url: {
    file: string;
    config: string;
  };
};

export type OcrResult = {
  croppedFileInfo: OutputInfo;
  croppedFilename: string;
  text: string;
  spentTime: number;
  anticaptchaResult: IGetTaskResultResponse<IImageToTextTaskResult>;
  method: 'get-number'; // and other future methods
};

export declare namespace Response {
  type PostFile = FileConfig;
  type Ocr = FileConfig & { ocrResult?: OcrResult };
}

export type TrxFileRequest = Request & {
  fileConfig?: FileConfig;
  fileConfigPath?: string;
};
