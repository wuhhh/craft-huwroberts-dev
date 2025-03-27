#!/bin/bash
# Common deployment functions shared between environments

# Function to install composer dependencies
install_composer_deps() {
  if [ -f "composer.json" ]; then
    echo "Installing Composer dependencies..."
    composer install --optimize-autoloader --no-dev
  else
    echo "No composer.json found, skipping composer install"
  fi
}

# Function to install and build frontend assets
install_npm_deps() {
  if [ -f "package.json" ]; then
    echo "Installing NPM dependencies..."
    npm install

    if grep -q "\"build\"" package.json; then
      echo "Running frontend build..."
      npm run build
    fi
  else
    echo "No package.json found, skipping npm install"
  fi
}

# Function to ensure database connection
wait_for_db() {
  echo "Waiting for database connection..."
  php -r "set_time_limit(60); \$tries = 0; while (\$tries < 30) { try { new PDO('mysql:host=\$_ENV[DB_SERVER];dbname=\$_ENV[DB_DATABASE]', \$_ENV[DB_USER], \$_ENV[DB_PASSWORD]); break; } catch (Exception \$e) { echo '.'; sleep(1); \$tries++; } }"
  echo "Database is ready."
}

# Function to set up environment file
setup_env_file() {
  echo "Creating/updating .env file..."
  env | grep -E '^(DB_|SECURITY_KEY|PRIMARY_SITE_URL|CP_TRIGGER|REDIS_|ENVIRONMENT|DEV_MODE|ALLOW_|DISALLOW_)' > ./.env

  if ! grep -q "SECURITY_KEY=" ./.env; then
    echo "Generating security key..."
    php craft setup/security-key
  fi
}

# Call these functions from your environment-specific deployment scripts
# For example:
# install_composer_deps
# install_npm_deps
# wait_for_db
# setup_env_file
