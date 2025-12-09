# Extension Data Tools - Examples

## Overview

The Extension Data tools provide access to Azure DevOps Extension Data Storage API, allowing you to store and retrieve data for installed extensions.

## Prerequisites

- Extension must be installed in your Azure DevOps organization
- You need the publisher name and extension name
- Appropriate permissions (vso.extension.data or vso.extension.data_write scope)

## Scope Types

- **Default** (Project Collection): Data shared by all users in the organization
- **User**: Data specific to individual users

## Examples

### Get a Document

Retrieve a specific document from an extension's collection:

```json
{
  "tool": "mcp_ado_extensiondata_get_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "settings",
    "documentId": "user-preferences",
    "scopeType": "User"
  }
}
```

### Get All Documents

Retrieve all documents from a collection (max 100,000):

```json
{
  "tool": "mcp_ado_extensiondata_get_documents",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "configurations"
  }
}
```

### Create a Document

Create a new document with an auto-generated ID:

```json
{
  "tool": "mcp_ado_extensiondata_create_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "data",
    "document": {
      "name": "My Configuration",
      "settings": {
        "theme": "dark",
        "notifications": true
      }
    }
  }
}
```

Create a document with a specific ID:

```json
{
  "tool": "mcp_ado_extensiondata_create_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "data",
    "document": {
      "id": "config-001",
      "name": "My Configuration",
      "settings": {
        "theme": "dark",
        "notifications": true
      }
    }
  }
}
```

### Set a Document (Upsert)

Create or update a document:

```json
{
  "tool": "mcp_ado_extensiondata_set_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "data",
    "document": {
      "id": "config-001",
      "name": "Updated Configuration",
      "settings": {
        "theme": "light",
        "notifications": false
      }
    }
  }
}
```

### Update a Document

Update an existing document with concurrency control:

```json
{
  "tool": "mcp_ado_extensiondata_update_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "data",
    "document": {
      "id": "config-001",
      "__etag": 5,
      "name": "Updated Configuration",
      "settings": {
        "theme": "auto",
        "notifications": true
      }
    }
  }
}
```

Update with last-write-wins (no concurrency check):

```json
{
  "tool": "mcp_ado_extensiondata_update_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "data",
    "document": {
      "id": "config-001",
      "__etag": -1,
      "name": "Force Updated Configuration",
      "settings": {
        "theme": "auto",
        "notifications": true
      }
    }
  }
}
```

### Delete a Document

Delete a document from a collection:

```json
{
  "tool": "mcp_ado_extensiondata_delete_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "data",
    "documentId": "config-001"
  }
}
```

## User-Scoped Data Example

Store user-specific preferences:

```json
{
  "tool": "mcp_ado_extensiondata_create_document",
  "arguments": {
    "publisherName": "my-publisher",
    "extensionName": "my-extension",
    "collectionName": "user-settings",
    "scopeType": "User",
    "scopeValue": "me",
    "document": {
      "id": "dashboard-layout",
      "widgets": ["tasks", "builds", "pull-requests"],
      "layout": "grid"
    }
  }
}
```

## Understanding \_\_etag

The `__etag` field is used for concurrency control:

- **Omit or use current value**: Ensures you're updating the latest version
- **Set to -1**: Last-write-wins (ignores version conflicts)
- **Server increments**: Each successful update increments the \_\_etag

If the `__etag` doesn't match the server's version, you'll get a conflict error, allowing you to:

1. Retrieve the latest version
2. Merge your changes
3. Retry the update

## Common Use Cases

### User Preferences

Store individual user settings using User scope:

- Theme preferences
- Layout configurations
- Notification settings

### Organization-Wide Data

Store shared data using Default scope:

- Team configurations
- Shared templates
- Organization policies

### Settings vs Documents

- **Settings**: Use for simple key-value pairs (internally stored as documents in $settings collection)
- **Documents**: Use for complex structured data with your own schema

## Best Practices

1. **Use meaningful collection names**: Organize related documents together
2. **Keep document IDs under 50 characters**: IDs have a length limit
3. **Use appropriate scope**: User scope for personal data, Default for shared data
4. **Handle \_\_etag properly**: Use -1 for settings-like data, proper versioning for collaborative data
5. **Limit collection size**: Maximum 100,000 documents per collection
6. **Design your schema**: Documents are free-form JSON, but maintain consistency

## Error Handling

Common errors you might encounter:

- **404**: Collection or document doesn't exist
- **409**: \_\_etag conflict (version mismatch)
- **400**: Invalid document structure or ID too long
- **401/403**: Authentication or permission issues

## Related Documentation

- [Azure DevOps Data Storage Documentation](https://learn.microsoft.com/en-us/azure/devops/extend/develop/data-storage)
- [Extension Scopes](https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest#scopes)
