// Main Bicep template for Contoso Civil App
// Deploys: Azure Container Registry, Azure Container Apps, Azure SQL Database

@description('Environment name')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('SQL Server administrator login')
param sqlAdminLogin string = 'sqladmin'

@description('SQL Server administrator password')
@secure()
param sqlAdminPassword string

@description('JWT Secret for authentication')
@secure()
param jwtSecret string

// Variables
var prefix = 'civil'  // Shortened to fit 32-char limit for container apps
var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = replace('contosocivilacr${uniqueSuffix}', '-', '')
var sqlServerName = 'contoso-civil-sql-${environment}-${uniqueSuffix}'
var sqlDatabaseName = 'ContosoCivilApp'
var containerAppsEnvName = 'contoso-civil-env-${environment}'
var logAnalyticsName = 'contoso-civil-logs-${environment}'
var storageAccountName = take(replace('civilstr${uniqueSuffix}', '-', ''), 24)

// Use placeholder image for initial deployment (before CI/CD pushes real images)
var placeholderImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

// Log Analytics Workspace for Container Apps
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Azure Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Azure SQL Server
resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

// Azure SQL Database
resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: {
    name: 'Basic'
    tier: 'Basic'
    capacity: 5
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 2147483648
  }
}

// Allow Azure services to access SQL Server
resource sqlFirewallRule 'Microsoft.Sql/servers/firewallRules@2022-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Azure Storage Account for Resume files
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

// Blob Service
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

// Resume Container
resource resumeContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'resumes'
  properties: {
    publicAccess: 'None'
  }
}

// Container Apps Environment
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// SQL Connection String for services
var sqlConnectionString = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${sqlDatabaseName};User Id=${sqlAdminLogin};Password=${sqlAdminPassword};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;'

// Blob Storage Connection String
var blobStorageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'

// User Service Container App
resource userService 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-user-service'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 3001
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'sql-connection'
          value: sqlConnectionString
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'blob-storage-connection'
          value: blobStorageConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'user-service'
          image: placeholderImage  // Update via CI/CD after build
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'PORT', value: '3001' }
            { name: 'DB_CONNECTION_STRING', secretRef: 'sql-connection' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'AZURE_STORAGE_CONNECTION_STRING', secretRef: 'blob-storage-connection' }
            { name: 'AZURE_STORAGE_CONTAINER_NAME', value: 'resumes' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// Job Service Container App
resource jobService 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-job-service'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 3002
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'sql-connection'
          value: sqlConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'job-service'
          image: placeholderImage  // Update via CI/CD after build
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'PORT', value: '3002' }
            { name: 'DB_CONNECTION_STRING', secretRef: 'sql-connection' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// Interview Service Container App
resource interviewService 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-interview-service'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 3003
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'sql-connection'
          value: sqlConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'interview-service'
          image: placeholderImage  // Update via CI/CD after build
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'PORT', value: '3003' }
            { name: 'DB_CONNECTION_STRING', secretRef: 'sql-connection' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// Application Service Container App
resource applicationService 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-app-svc'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 3004
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'sql-connection'
          value: sqlConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'app-service'
          image: placeholderImage  // Update via CI/CD after build
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'PORT', value: '3004' }
            { name: 'DB_CONNECTION_STRING', secretRef: 'sql-connection' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// API Gateway Container App (External facing)
resource apiGateway 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-api-gateway'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api-gateway'
          image: placeholderImage  // Update via CI/CD after build
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PORT', value: '3000' }
            { name: 'USER_SERVICE_URL', value: 'http://${prefix}-user-service' }
            { name: 'JOB_SERVICE_URL', value: 'http://${prefix}-job-service' }
            { name: 'INTERVIEW_SERVICE_URL', value: 'http://${prefix}-interview-service' }
            { name: 'APPLICATION_SERVICE_URL', value: 'http://${prefix}-app-svc' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
  dependsOn: [
    userService
    jobService
    interviewService
    applicationService
  ]
}

// Frontend Container App
resource frontend 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-frontend'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: placeholderImage  // Update via CI/CD after build
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'REACT_APP_API_URL', value: 'https://${apiGateway.properties.configuration.ingress.fqdn}' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
  dependsOn: [
    apiGateway
  ]
}

// Outputs
output acrLoginServer string = containerRegistry.properties.loginServer
output acrName string = containerRegistry.name
output apiGatewayUrl string = 'https://${apiGateway.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}'
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output containerAppsEnvironmentName string = containerAppsEnvironment.name
output storageAccountName string = storageAccount.name
output blobContainerName string = resumeContainer.name
