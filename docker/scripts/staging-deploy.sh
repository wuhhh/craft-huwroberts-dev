#!/bin/bash
# Staging-specific deployment steps

echo "Running staging environment setup..."

# Enable development mode for easier debugging in staging
php craft utils/project-config --interactive=0 db

# Refresh the CP resources
php craft clear-caches/compiled-templates
php craft clear-caches/cp-resources

# Set up a standardized admin account if needed
if [ "$RESET_ADMIN" = "true" ]; then
  echo "Resetting admin account..."
  php craft users/set-password admin@example.com StrongStagingPassword123
fi

# Run any staging-specific data setup
echo "Staging deployment steps completed!"
