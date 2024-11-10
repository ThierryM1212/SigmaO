FROM keymetrics/pm2:16-alpine

# Bundle APP files
COPY src src/
COPY package.json .
COPY pm2.json .
COPY sigmao-bot.js .

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --production

# Show current folder structure in logs
RUN ls -al -R

CMD [ "pm2-runtime", "start", "pm2.json" ]
#CMD [ "pm2", "start", "sigmao-bot.js", "--max_memory_restart", "300M" ]