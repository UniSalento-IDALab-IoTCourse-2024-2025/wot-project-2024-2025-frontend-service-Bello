# Usa un'immagine di base per Node.js
FROM node:16

# Imposta la cartella di lavoro all'interno del container
WORKDIR /app

# Copia il package.json e package-lock.json (se presente)
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutti i file del progetto nella cartella di lavoro del container
COPY . .

# Espone la porta su cui il server di sviluppo React (Vite) ascolta (di solito 5173 per Vite)
EXPOSE 5173

# Comando per avviare il server di sviluppo Vite
CMD ["npm", "run", "dev"]
