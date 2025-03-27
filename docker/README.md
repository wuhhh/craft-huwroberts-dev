# Docker Configuration for Craft CMS on Coolify

This directory contains Docker configuration files for deploying your Craft CMS project across different environments using Coolify.

## Structure

```
docker/
├── staging/                # Staging environment configuration
│   ├── docker-compose.yml  # Complete staging Docker Compose file
│   └── deploy.sh           # Staging deployment script
├── production/             # Production environment configuration
│   ├── docker-compose.yml  # Complete production Docker Compose file
│   └── deploy.sh           # Production deployment script
└── scripts/                # Shared utility scripts
    └── common-deploy.sh    # Common deployment functions
```

## Using with Coolify

### Staging Environment

1. In Coolify, create a new application
2. Select Docker Compose as the build pack
3. Set the base directory to `./` (project root)
4. Set the Docker Compose file path to `./docker/staging/docker-compose.yml`
5. Set the service to deploy to `web`
6. Configure the following environment variables:
   - `DB_PASSWORD`
   - `MYSQL_ROOT_PASSWORD`
   - `SECURITY_KEY`
   - `PRIMARY_SITE_URL`
7. Set the post-deployment command to `bash ./docker/staging/deploy.sh`

### Production Environment

1. Follow the same steps as staging, but:
2. Set the Docker Compose file path to `./docker/production/docker-compose.yml`
3. Set the post-deployment command to `bash ./docker/production/deploy.sh`
4. Adjust other environment variables as needed for production

## Notes

- This setup is designed to work alongside DDEV for local development without conflicts
- Each environment has its own complete configuration
- Sensitive information is never stored in the repository
- Volume names are prefixed with environment names to avoid conflicts if multiple environments are deployed to the same server
