FROM node:18-alpine

WORKDIR /app

# Copy the original EvilWorker files
COPY EvilWorker/ .

# Install dependencies (EvilWorker uses only standard Node.js libraries)
# No external dependencies needed

# Expose port 3000
EXPOSE 3000

# Start the proxy server
CMD ["node", "proxy_server.js"]