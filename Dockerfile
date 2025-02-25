# 1️⃣ Costruzione dell'app Vue.js
FROM node:18 AS builder

# Imposta la working directory
WORKDIR /app

# Copia i file del progetto
COPY package.json package-lock.json ./

# Installa le dipendenze
RUN npm install --frozen-lockfile

# Copia il resto dei file
COPY . .

# Costruisce l'applicazione Vue.js
RUN npm run build

# 2️⃣ Servizio con Nginx
FROM nginx:alpine

# Copia i file generati nel server Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia il file di configurazione di Nginx personalizzato
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Espone la porta 80
EXPOSE 8080  

# Avvia il server Nginx
CMD ["nginx", "-g", "daemon off;"]
