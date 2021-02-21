const ENABLE_CONSOLE_LOG = true; // && process.env.NODE_ENV !== 'test';
const ENABLE_CONSOLE_ERR = true; // && process.env.NODE_ENV !== 'test';

const extend = () => {
  const oldLog = console.log;
  // tslint:disable-next-line: no-any
  console.log = function (...msg: any[]) {
    const current = new Date().toISOString();
    if (ENABLE_CONSOLE_LOG) {
      oldLog(`[${current}]`, ...msg);
    }
  };

  const oldError = console.error;
  // tslint:disable-next-line: no-any
  console.error = function (...msg: any[]) {
    const current = new Date().toISOString();
    if (ENABLE_CONSOLE_ERR) {
      oldError(`[${current}]`, ...msg);
    }
  };
};

extend();
