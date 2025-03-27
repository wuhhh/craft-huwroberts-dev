#!/bin/bash
set -e

# Base deployment script for Craft CMS
# This script handles common deployment tasks across environments

ENVIRONMENT=${ENVIRONMENT:-staging}
echo "Starting deployment process for Craft CMS in $ENVIRONMENT environment..."

# Install Composer dependencies (if not already in the image)
if [ -f "composer.json" ]; then
  echo "Installing Composer dependencies..."
  composer install --optimize-autoloader --no-dev
fi

# Install NPM dependencies (if using frontend build)
if [ -f "package.json" ]; then
  echo "Installing NPM dependencies..."
  npm install

  # Run build if needed
  if grep -q "\"build\"" package.json; then
    echo "Running frontend build..."
    npm run build
  fi
fi

# Wait for database to be ready
echo "Waiting for database connection..."
php -r "set_time_limit(60); \$tries = 0; while (\$tries < 30) { try { new PDO('mysql:host=\$_ENV[DB_SERVER];dbname=\$_ENV[DB_DATABASE]', \$_ENV[DB_USER], \$_ENV[DB_PASSWORD]); break; } catch (Exception \$e) { echo '.'; sleep(1); \$tries++; } }"
echo "Database is ready."

# Setup environment
if [ ! -f ./.env ]; then
  echo "Creating .env file..."
  # Only copy environment variables that start with specific prefixes
  env | grep -E '^(DB_|SECURITY_KEY|PRIMARY_SITE_URL|CP_TRIGGER|REDIS_|ENVIRONMENT|DEV_MODE|ALLOW_|DISALLOW_)' >./.env
fi

# Check if security key is set
if ! grep -q "SECURITY_KEY=" ./.env; then
  echo "Generating security key..."
  php craft setup/security-key
fi

# Run database migrations
echo "Running database migrations..."
php craft migrate/all --interactive=0

# Apply project config changes
echo "Applying project config changes..."
php craft project-config/apply --interactive=0

# Clear caches
echo "Clearing caches..."
php craft clear-caches/all

# Set proper permissions
echo "Setting file permissions..."
chmod -R 777 ./storage
chmod -R 777 ./web/cpresources

echo "Base deployment steps completed!"

# Check for environment-specific deploy script and run it if exists
if [ -f "./docker/scripts/${ENVIRONMENT}-deploy.sh" ]; then
  echo "Running ${ENVIRONMENT}-specific deployment steps..."
  source "./docker/scripts/${ENVIRONMENT}-deploy.sh"
fi

echo "Deployment complete!"
