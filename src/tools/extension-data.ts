// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const EXTENSION_DATA_TOOLS = {
  get_document: "extensiondata_get_document",
  get_documents: "extensiondata_get_documents",
  create_document: "extensiondata_create_document",
  set_document: "extensiondata_set_document",
  update_document: "extensiondata_update_document",
  delete_document: "extensiondata_delete_document",
};

const ScopeTypeSchema = z.enum(["Default", "User"]).describe("Scope type for the data. 'Default' is project collection scope, 'User' is user-specific scope.");

function configureExtensionDataTools(server: McpServer, tokenProvider: () => Promise<string>, userAgentProvider: () => string) {
  server.tool(
    EXTENSION_DATA_TOOLS.get_document,
    "Get a document from an extension's data collection by ID. Documents are JSON objects with special 'id' and '__etag' properties for versioning.",
    {
      publisherName: z.string().describe("The publisher name of the extension."),
      extensionName: z.string().describe("The extension name."),
      collectionName: z.string().describe("The name of the collection containing the document."),
      documentId: z.string().describe("The ID of the document to retrieve."),
      scopeType: ScopeTypeSchema.optional().describe("Optional scope type. Defaults to 'Default' (project collection scope)."),
      scopeValue: z.string().optional().describe("Optional scope value (e.g., 'me' for user scope). Only used with User scope."),
    },
    async ({ publisherName, extensionName, collectionName, documentId, scopeType, scopeValue }) => {
      try {
        const token = await tokenProvider();
        const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;

        if (!orgUrl) {
          return {
            content: [{ type: "text", text: "AZURE_DEVOPS_ORG_URL environment variable is not set" }],
            isError: true,
          };
        }

        const scope = scopeType === "User" ? `User/${scopeValue || "me"}` : "Default/Current";
        const url = `${orgUrl}/_apis/ExtensionManagement/InstalledExtensions/${publisherName}/${extensionName}/Data/Scopes/${scope}/Collections/${encodeURIComponent(collectionName)}/Documents/${encodeURIComponent(documentId)}?api-version=7.1-preview.1`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": userAgentProvider(),
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error getting document: ${response.status} ${response.statusText}\n${errorText}` }],
            isError: true,
          };
        }

        const document = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(document, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [{ type: "text", text: `Error getting document: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    EXTENSION_DATA_TOOLS.get_documents,
    "Get all documents from an extension's data collection. Returns up to 100,000 documents.",
    {
      publisherName: z.string().describe("The publisher name of the extension."),
      extensionName: z.string().describe("The extension name."),
      collectionName: z.string().describe("The name of the collection to retrieve documents from."),
      scopeType: ScopeTypeSchema.optional().describe("Optional scope type. Defaults to 'Default' (project collection scope)."),
      scopeValue: z.string().optional().describe("Optional scope value (e.g., 'me' for user scope). Only used with User scope."),
    },
    async ({ publisherName, extensionName, collectionName, scopeType, scopeValue }) => {
      try {
        const token = await tokenProvider();
        const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;

        if (!orgUrl) {
          return {
            content: [{ type: "text", text: "AZURE_DEVOPS_ORG_URL environment variable is not set" }],
            isError: true,
          };
        }

        const scope = scopeType === "User" ? `User/${scopeValue || "me"}` : "Default/Current";
        const url = `${orgUrl}/_apis/ExtensionManagement/InstalledExtensions/${publisherName}/${extensionName}/Data/Scopes/${scope}/Collections/${encodeURIComponent(collectionName)}/Documents?api-version=7.1-preview.1`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": userAgentProvider(),
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error getting documents: ${response.status} ${response.statusText}\n${errorText}` }],
            isError: true,
          };
        }

        const result = await response.json();
        const documents = result.value || result;
        return {
          content: [{ type: "text", text: JSON.stringify(documents, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [{ type: "text", text: `Error getting documents: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    EXTENSION_DATA_TOOLS.create_document,
    "Create a new document in an extension's data collection. If the document includes an 'id' property (max 50 chars), it will be used; otherwise a GUID is generated. Fails if a document with the same ID already exists.",
    {
      publisherName: z.string().describe("The publisher name of the extension."),
      extensionName: z.string().describe("The extension name."),
      collectionName: z.string().describe("The name of the collection to create the document in. Collection is created if it doesn't exist."),
      document: z.record(z.any()).describe("The document to create as a JSON object. Can optionally include an 'id' property."),
      scopeType: ScopeTypeSchema.optional().describe("Optional scope type. Defaults to 'Default' (project collection scope)."),
      scopeValue: z.string().optional().describe("Optional scope value (e.g., 'me' for user scope). Only used with User scope."),
    },
    async ({ publisherName, extensionName, collectionName, document, scopeType, scopeValue }) => {
      try {
        const token = await tokenProvider();
        const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;

        if (!orgUrl) {
          return {
            content: [{ type: "text", text: "AZURE_DEVOPS_ORG_URL environment variable is not set" }],
            isError: true,
          };
        }

        const scope = scopeType === "User" ? `User/${scopeValue || "me"}` : "Default/Current";
        const url = `${orgUrl}/_apis/ExtensionManagement/InstalledExtensions/${publisherName}/${extensionName}/Data/Scopes/${scope}/Collections/${encodeURIComponent(collectionName)}/Documents?api-version=7.1-preview.1`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": userAgentProvider(),
          },
          body: JSON.stringify(document),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error creating document: ${response.status} ${response.statusText}\n${errorText}` }],
            isError: true,
          };
        }

        const createdDocument = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(createdDocument, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [{ type: "text", text: `Error creating document: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    EXTENSION_DATA_TOOLS.set_document,
    "Set (upsert) a document in an extension's data collection. Creates a new document if the ID doesn't exist, or updates the existing document if it does.",
    {
      publisherName: z.string().describe("The publisher name of the extension."),
      extensionName: z.string().describe("The extension name."),
      collectionName: z.string().describe("The name of the collection to set the document in."),
      document: z.record(z.any()).describe("The document to set as a JSON object. Must include an 'id' property."),
      scopeType: ScopeTypeSchema.optional().describe("Optional scope type. Defaults to 'Default' (project collection scope)."),
      scopeValue: z.string().optional().describe("Optional scope value (e.g., 'me' for user scope). Only used with User scope."),
    },
    async ({ publisherName, extensionName, collectionName, document, scopeType, scopeValue }) => {
      try {
        const token = await tokenProvider();
        const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;

        if (!orgUrl) {
          return {
            content: [{ type: "text", text: "AZURE_DEVOPS_ORG_URL environment variable is not set" }],
            isError: true,
          };
        }

        if (!document.id) {
          return {
            content: [{ type: "text", text: "Document must include an 'id' property for set operation" }],
            isError: true,
          };
        }

        const scope = scopeType === "User" ? `User/${scopeValue || "me"}` : "Default/Current";
        const url = `${orgUrl}/_apis/ExtensionManagement/InstalledExtensions/${publisherName}/${extensionName}/Data/Scopes/${scope}/Collections/${encodeURIComponent(collectionName)}/Documents/${encodeURIComponent(document.id)}?api-version=7.1-preview.1`;

        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": userAgentProvider(),
          },
          body: JSON.stringify(document),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error setting document: ${response.status} ${response.statusText}\n${errorText}` }],
            isError: true,
          };
        }

        const updatedDocument = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(updatedDocument, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [{ type: "text", text: `Error setting document: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    EXTENSION_DATA_TOOLS.update_document,
    "Update an existing document in an extension's data collection. The document must already exist. Use '__etag' property for concurrency control (set to -1 for last-write-wins).",
    {
      publisherName: z.string().describe("The publisher name of the extension."),
      extensionName: z.string().describe("The extension name."),
      collectionName: z.string().describe("The name of the collection containing the document."),
      document: z.record(z.any()).describe("The document to update as a JSON object. Must include 'id' and '__etag' properties. Set '__etag' to -1 for last-write-wins behavior."),
      scopeType: ScopeTypeSchema.optional().describe("Optional scope type. Defaults to 'Default' (project collection scope)."),
      scopeValue: z.string().optional().describe("Optional scope value (e.g., 'me' for user scope). Only used with User scope."),
    },
    async ({ publisherName, extensionName, collectionName, document, scopeType, scopeValue }) => {
      try {
        const token = await tokenProvider();
        const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;

        if (!orgUrl) {
          return {
            content: [{ type: "text", text: "AZURE_DEVOPS_ORG_URL environment variable is not set" }],
            isError: true,
          };
        }

        if (!document.id) {
          return {
            content: [{ type: "text", text: "Document must include an 'id' property for update operation" }],
            isError: true,
          };
        }

        const scope = scopeType === "User" ? `User/${scopeValue || "me"}` : "Default/Current";
        const url = `${orgUrl}/_apis/ExtensionManagement/InstalledExtensions/${publisherName}/${extensionName}/Data/Scopes/${scope}/Collections/${encodeURIComponent(collectionName)}/Documents/${encodeURIComponent(document.id)}?api-version=7.1-preview.1`;

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": userAgentProvider(),
          },
          body: JSON.stringify(document),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error updating document: ${response.status} ${response.statusText}\n${errorText}` }],
            isError: true,
          };
        }

        const updatedDocument = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(updatedDocument, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [{ type: "text", text: `Error updating document: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    EXTENSION_DATA_TOOLS.delete_document,
    "Delete a document from an extension's data collection by ID.",
    {
      publisherName: z.string().describe("The publisher name of the extension."),
      extensionName: z.string().describe("The extension name."),
      collectionName: z.string().describe("The name of the collection containing the document."),
      documentId: z.string().describe("The ID of the document to delete."),
      scopeType: ScopeTypeSchema.optional().describe("Optional scope type. Defaults to 'Default' (project collection scope)."),
      scopeValue: z.string().optional().describe("Optional scope value (e.g., 'me' for user scope). Only used with User scope."),
    },
    async ({ publisherName, extensionName, collectionName, documentId, scopeType, scopeValue }) => {
      try {
        const token = await tokenProvider();
        const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;

        if (!orgUrl) {
          return {
            content: [{ type: "text", text: "AZURE_DEVOPS_ORG_URL environment variable is not set" }],
            isError: true,
          };
        }

        const scope = scopeType === "User" ? `User/${scopeValue || "me"}` : "Default/Current";
        const url = `${orgUrl}/_apis/ExtensionManagement/InstalledExtensions/${publisherName}/${extensionName}/Data/Scopes/${scope}/Collections/${encodeURIComponent(collectionName)}/Documents/${encodeURIComponent(documentId)}?api-version=7.1-preview.1`;

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": userAgentProvider(),
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Error deleting document: ${response.status} ${response.statusText}\n${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: `Document '${documentId}' deleted successfully from collection '${collectionName}'` }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [{ type: "text", text: `Error deleting document: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

export { configureExtensionDataTools };
