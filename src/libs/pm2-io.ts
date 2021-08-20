import io from '@pm2/io';

export const metric = {
  uploadFiles: io.metric({ name: 'uploadFiles' }),
};

export const init = () => {
  io.init({
    tracing: {
      enabled: true,
      // will add the actual queries made to database, false by default
      detailedDatabasesCalls: true,
      // if you want you can ignore some endpoint based on their path
      ignoreIncomingPaths: [],
      // same as above but used to match entire URLs
      ignoreOutgoingUrls: [],
      /**
       * Determines the probability of a request to be traced. Ranges from 0.0 to 1.0
       * default is 0.5
       */
      samplingRate: 0.5,
    },
    metrics: {
      eventLoop: true,
      network: true,
      http: true,
      v8: true,
      runtime: true,
    },
  });
};
