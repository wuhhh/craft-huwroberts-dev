#!/bin/bash
set -e

echo "Starting deployment process for Craft CMS in STAGING environment..."

# Source common functions if they exist
if [ -f "../scripts/common-deploy.sh" ]; then
  source "../scripts/common-deploy.sh"
else
  # Install Composer dependencies
  if [ -f "composer.json" ]; then
    echo "Installing Composer dependencies..."
    composer install --optimize-autoloader --no-dev
  fi

  # Install NPM dependencies
  if [ -f "package.json" ]; then
    echo "Installing NPM dependencies..."
    npm install

    if grep -q "\"build\"" package.json; then
      echo "Running frontend build..."
      npm run build
    fi
  fi
fi

# Wait for database to be ready
echo "Waiting for database connection..."
php -r "set_time_limit(60); \$tries = 0; while (\$tries < 30) { try { new PDO('mysql:host=\$_ENV[DB_SERVER];dbname=\$_ENV[DB_DATABASE]', \$_ENV[DB_USER], \$_ENV[DB_PASSWORD]); break; } catch (Exception \$e) { echo '.'; sleep(1); \$tries++; } }"
echo "Database is ready."

# Create/update .env file
echo "Creating/updating .env file..."
env | grep -E '^(DB_|SECURITY_KEY|PRIMARY_SITE_URL|CP_TRIGGER|REDIS_|ENVIRONMENT|DEV_MODE|ALLOW_|DISALLOW_)' > ./.env

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

# STAGING SPECIFIC: Enable project config DB mode for easier debugging
php craft utils/project-config --interactive=0 db

# Clear caches
echo "Clearing caches..."
php craft clear-caches/all
php craft clear-caches/compiled-templates
php craft clear-caches/cp-resources

# Set proper permissions
echo "Setting file permissions..."
chmod -R 777 ./storage
chmod -R 777 ./web/cpresources

# STAGING SPECIFIC: Reset admin account if needed
if [ "$RESET_ADMIN" = "true" ]; then
  echo "Resetting admin account..."
  php craft users/set-password admin@example.com StrongStagingPassword123
fi

echo "Staging deployment complete!"
