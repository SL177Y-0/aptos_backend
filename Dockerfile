FROM node:18

# Install Aptos CLI
RUN apt-get update && apt-get install -y wget unzip \
  && wget https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v2.0.0/aptos-cli-2.0.0-Ubuntu-x86_64.zip \
  && unzip aptos-cli-2.0.0-Ubuntu-x86_64.zip -d /usr/local/bin \
  && rm aptos-cli-2.0.0-Ubuntu-x86_64.zip

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV NODE_ENV=production

CMD ["node", "index.js"]
