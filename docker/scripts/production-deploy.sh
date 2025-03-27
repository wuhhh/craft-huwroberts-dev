#!/bin/bash
# Production-specific deployment steps

echo "Running production environment setup..."

# Ensure project config is in sync
php craft project-config/sync --interactive=0

# Warm up caches
echo "Warming up caches..."
php craft utilities/warm-cache

# Clear any pending queue jobs if needed
if [ "$CLEAR_QUEUE" = "true" ]; then
  echo "Clearing pending queue jobs..."
  php craft queue/release-all
  php craft queue/retry-all
fi

# Run any production-specific maintenance tasks
echo "Production deployment steps completed!"
