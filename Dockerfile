# Use a Node.js 22 base image based on Debian slim.
# This provides a lightweight environment with 'apt-get' for system packages.
FROM node:22-slim

# Set the working directory inside the container.
# All subsequent commands will be run relative to this directory.
WORKDIR /app

# Copy package.json and package-lock.json first.
# This allows Docker to cache the npm install step, speeding up builds
# if only code changes, but dependencies don't.
COPY package*.json ./

# Install Node.js dependencies.
# 'npm ci' is used for clean installations in CI/CD environments.
# '--omit=dev' ensures development dependencies are not installed in production.
RUN npm ci --omit=dev

# Install system dependencies required for PDF generation using PDFKit.
# 'apt-get update' refreshes the package list.
# 'apt-get install -y --no-install-recommends' installs packages non-interactively
# and avoids recommending unnecessary packages.
# 'build-essential' is for compiling native modules.
# 'libcairo2-dev', 'libpango1.0-dev', 'libjpeg-dev', 'libgif-dev',
# 'fontconfig', 'libfreetype6-dev' are common rendering libraries and font tools
# that PDFKit (or its underlying dependencies) often require.
# 'rm -rf /var/lib/apt/lists/*' cleans up the apt cache to keep the image size small.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    fontconfig \
    libfreetype6-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy the rest of your application code into the working directory.
# This assumes your backend's root (where package.json and src/ are) is the build context.
# So, 'src/server.js' will be at '/app/src/server.js' inside the container.
COPY . .

# Expose the port your Node.js application listens on.
# Set to 8080 as per your confirmation.
EXPOSE 8080

# Define the command to run your application when the container starts.
# This assumes your main entry point is 'src/server.js'.
CMD ["node", "src/server.js"]