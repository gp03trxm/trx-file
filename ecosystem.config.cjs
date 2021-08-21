require('dotenv').config()

const SITE_NAME = process.env.SITE_NAME || 'devpay';

module.exports = {
  apps: [
    {
      name: `${SITE_NAME}-trx-file`,
      script: 'npm -- start',

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
      args: 'one two',
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

  deploy: {
    production: {
      user: 'node',
      host: '212.83.163.1',
      ref: 'origin/master',
      repo: 'git@github.com:repo.git',
      path: '/var/www/production',
      'post-deploy':
        'npm install && pm2 reload ecosystem.config.js --env production',
    },
  },
};
