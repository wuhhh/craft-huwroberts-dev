# Docker Configuration for Craft CMS

This directory contains Docker configuration files for deploying your Craft CMS project across different environments.

## Structure

- `docker-compose.yml` - Base configuration shared across all environments
- `docker-compose.staging.yml` - Staging-specific overrides
- `docker-compose.production.yml` - Production-specific overrides
- `scripts/` - Deployment and utility scripts
  - `deploy.sh` - Main deployment script
  - `staging-deploy.sh` - Staging-specific deployment steps
  - `production-deploy.sh` - Production-specific deployment steps

## Using with Coolify

### Staging Environment

1. In Coolify, create a new application
2. Select Docker Compose as the build pack
3. Set the Docker Compose file path to `./docker/docker-compose.yml`
4. In the "Advanced" section, set the Docker Compose override file to `./docker/docker-compose.staging.yml`
5. Set the service to deploy to `web`
6. Configure the following environment variables:
   - `DB_PASSWORD`
   - `MYSQL_ROOT_PASSWORD`
   - `SECURITY_KEY`
   - `PRIMARY_SITE_URL`
   - `ENVIRONMENT=staging`
7. Set the post-deployment command to `bash ./docker/scripts/deploy.sh`

### Production Environment

1. Follow the same steps as staging, but:
2. Set the Docker Compose override file to `./docker/docker-compose.production.yml`
3. Set `ENVIRONMENT=production`
4. Adjust other environment variables as needed for production

## Local Testing (Without DDEV)

If you want to test the Docker setup locally without affecting your DDEV environment:

1. Copy `docker-compose.override.yml.example` to `docker-compose.override.yml`
2. Adjust settings as needed for local testing
3. Run:
   ```bash
   cd docker
   docker-compose up -d
   ```

## Notes

- This setup is designed to be used alongside DDEV for local development without conflicts
- Environment-specific settings are separated to make updates easier
- Sensitive information is never stored in the repository
- Each environment can have its own specific adjustments
