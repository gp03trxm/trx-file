require('dotenv').config()

const SITE_NAME = process.env.SITE_NAME || 'devpay';

module.exports = {
  apps: [
    {
      name: `file-${SITE_NAME}`,
      script: './dist/index.js',
      node_args: '-r source-map-support/register',
      cmd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        USE_PM2: true,
      },
      env_production: {
        NODE_ENV: 'production',
        USE_PM2: true,
      },
    },
  ],
};
