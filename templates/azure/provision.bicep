@secure()
param provisionParameters object
// Resources for identity
module userAssignedIdentityProvision './provision/identity.bicep' = {
  name: 'userAssignedIdentityProvision'
  params: {
    provisionParameters: provisionParameters
  }
}
module frontendHostingProvision './provision/frontendHosting.bicep' = {
  name: 'frontendHostingProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output frontendHostingOutput object = {
  teamsFxPluginId: 'fx-resource-frontend-hosting'
  domain: frontendHostingProvision.outputs.domain
  endpoint: frontendHostingProvision.outputs.endpoint
  indexPath: frontendHostingProvision.outputs.indexPath
  storageResourceId: frontendHostingProvision.outputs.resourceId
}

output identityOutput object = {
  teamsFxPluginId: 'fx-resource-identity'
  identityName: userAssignedIdentityProvision.outputs.identityName
  identityResourceId: userAssignedIdentityProvision.outputs.identityResourceId
  identityClientId: userAssignedIdentityProvision.outputs.identityClientId
}
// Resources for bot
module webAppProvision './provision/webapp.bicep' = {
  name: 'webAppProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output webAppOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: webAppProvision.outputs.webAppSKU
  siteName: webAppProvision.outputs.webAppName
  validDomain: webAppProvision.outputs.webAppDomain
  appServicePlanName: webAppProvision.outputs.appServicePlanName
  resourceId: webAppProvision.outputs.webAppResourceId
  siteEndpoint: webAppProvision.outputs.webAppEndpoint
}
// Resources for bot
module botProvision './provision/botservice.bicep' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: webAppProvision.outputs.webAppEndpoint
  }
}
