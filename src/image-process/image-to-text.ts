import {
  AntiCaptcha,
  TaskTypes,
  IImageToTextTask,
  IImageToTextTaskResult,
  IGetTaskResultResponse,
} from 'anticaptcha';
import { ANTI_CAPTCHA_KEY } from '../constants';

const anticaptcha = new AntiCaptcha(ANTI_CAPTCHA_KEY);

async function getTextCore(
  dataBase64: string,
): Promise<IGetTaskResultResponse<IImageToTextTaskResult>> {
  const balance = await anticaptcha.getBalance();

  if (balance <= 0) {
    throw new Error(`balance: ${balance}`);
  }

  console.log(`[getTextCore] balance = ${balance}`);

  const task: IImageToTextTask = {
    body: dataBase64,
    type: TaskTypes.IMAGE_TO_TEXT,
    maxLength: 10,
    minLength: 10,
    numeric: 1,
  };

  const taskId = await anticaptcha.createTask<IImageToTextTask>(task);

  const result = await anticaptcha.getTaskResult<IImageToTextTaskResult>(
    taskId,
  );
  // captcha params can be set here
  // anticaptcha.setMinLength(10);
  // anticaptcha.setMaxLength(10);
  // anticaptcha.setNumeric(1);
  console.log('[getTextCore] result:', result);
  return result;
}

export async function getTextFromBase64(
  dataBase64: string,
): Promise<IGetTaskResultResponse<IImageToTextTaskResult>> {
  return getTextCore(dataBase64);
}
