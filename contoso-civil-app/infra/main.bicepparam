using './main.bicep'

// Parameters for deployment
// Update these values for your environment

param environment = 'dev'
param location = 'eastus'
param sqlAdminLogin = 'sqladmin'
// These secure parameters should be provided at deployment time via Azure DevOps variables
param sqlAdminPassword = readEnvironmentVariable('SQL_ADMIN_PASSWORD', '')
param jwtSecret = readEnvironmentVariable('JWT_SECRET', '')
