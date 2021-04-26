# specify the node base image with your desired version node:<version>
FROM node:12

WORKDIR /home/node/app

# make node_modules cached.
# Src: https://nodesource.com/blog/8-protips-to-start-killing-it-when-dockerizing-node-js/
#
COPY package.json package-lock.json .npmrc ./

# When running with --production --pure-lockfile,
# There will always be some missing modules. Dunno why...
#
RUN npm install
# Other files, so that other files do not interfere with node_modules cache
#
COPY . .

# Fix sharp environment requirement
# https://github.com/lovell/sharp/blob/master/docs/install.md
RUN rm -rf node_modules/sharp
RUN npm install --arch=x64 --platform=linux sharp

RUN rm -f .env
RUN npm run build

ENV NODE_ENV=dev
ENV COMPONENT=file
ENV SITE_NAME=trxm
ENV HTTP_PORT=3005

EXPOSE ${HTTP_PORT}

ENTRYPOINT ["npm"]
CMD ["run", "start:pm2:no-daemon"]