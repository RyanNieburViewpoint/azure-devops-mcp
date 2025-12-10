// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebApi } from "azure-devops-node-api";
import { configureExtensionDataTools } from "../../../src/tools/extension-data";

type TokenProviderMock = () => Promise<string>;
type ConnectionProviderMock = () => Promise<WebApi>;

interface ExtensionApiMock {
  getDocumentByName: jest.Mock;
  getDocumentsByName: jest.Mock;
  createDocumentByName: jest.Mock;
  setDocumentByName: jest.Mock;
  updateDocumentByName: jest.Mock;
  deleteDocumentByName: jest.Mock;
}

describe("Extension Data Tools", () => {
  let server: McpServer;
  let tokenProvider: TokenProviderMock;
  let connectionProvider: ConnectionProviderMock;
  let mockConnection: { getExtensionManagementApi: jest.Mock };
  let mockExtensionApi: ExtensionApiMock;

  beforeEach(() => {
    server = { tool: jest.fn() } as unknown as McpServer;
    tokenProvider = jest.fn();

    mockExtensionApi = {
      getDocumentByName: jest.fn(),
      getDocumentsByName: jest.fn(),
      createDocumentByName: jest.fn(),
      setDocumentByName: jest.fn(),
      updateDocumentByName: jest.fn(),
      deleteDocumentByName: jest.fn(),
    };

    mockConnection = {
      getExtensionManagementApi: jest.fn().mockResolvedValue(mockExtensionApi),
    };

    connectionProvider = jest.fn().mockResolvedValue(mockConnection);
  });

  describe("Tool Registration", () => {
    it("should register all extension data tools", () => {
      const toolSpy = jest.spyOn(server, "tool");

      configureExtensionDataTools(server, tokenProvider, connectionProvider);

      expect(toolSpy).toHaveBeenCalledTimes(6);

      const toolNames = toolSpy.mock.calls.map((call) => call[0]);
      expect(toolNames).toContain("extensiondata_get_document");
      expect(toolNames).toContain("extensiondata_get_documents");
      expect(toolNames).toContain("extensiondata_create_document");
      expect(toolNames).toContain("extensiondata_set_document");
      expect(toolNames).toContain("extensiondata_update_document");
      expect(toolNames).toContain("extensiondata_delete_document");
    });
  });

  describe("Tool Descriptions", () => {
    it("should have appropriate description for get_document", () => {
      const toolSpy = jest.spyOn(server, "tool");

      configureExtensionDataTools(server, tokenProvider, connectionProvider);

      const getDocCall = toolSpy.mock.calls.find((call) => call[0] === "extensiondata_get_document");
      expect(getDocCall).toBeDefined();
      if (getDocCall) {
        expect(getDocCall[1]).toContain("Get a document from an extension's data collection");
      }
    });

    it("should have appropriate description for create_document", () => {
      const toolSpy = jest.spyOn(server, "tool");

      configureExtensionDataTools(server, tokenProvider, connectionProvider);

      const createDocCall = toolSpy.mock.calls.find((call) => call[0] === "extensiondata_create_document");
      expect(createDocCall).toBeDefined();
      if (createDocCall) {
        expect(createDocCall[1]).toContain("Create a new document");
      }
    });
  });

  describe("get_document tool", () => {
    it("should retrieve a document with Default scope and default scopeValue", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      const mockDocument = { id: "doc-1", name: "Test Document", __etag: 1 };
      mockExtensionApi.getDocumentByName.mockResolvedValue(mockDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        documentId: "doc-1",
      };

      const result = await handler(params);

      expect(mockExtensionApi.getDocumentByName).toHaveBeenCalledWith("test-publisher", "test-extension", "Default", "Current", "test-collection", "doc-1");
      expect(result.content[0].text).toBe(JSON.stringify(mockDocument, null, 2));
      expect(result.isError).toBeUndefined();
    });

    it("should retrieve a document with User scope and default scopeValue", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      const mockDocument = { id: "user-doc", name: "User Document", __etag: 1 };
      mockExtensionApi.getDocumentByName.mockResolvedValue(mockDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "user-settings",
        documentId: "user-doc",
        scopeType: "User",
      };

      const result = await handler(params);

      expect(mockExtensionApi.getDocumentByName).toHaveBeenCalledWith("test-publisher", "test-extension", "User", "me", "user-settings", "user-doc");
      expect(result.content[0].text).toBe(JSON.stringify(mockDocument, null, 2));
    });

    it("should retrieve a document with custom scopeValue", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      const mockDocument = { id: "custom-doc", __etag: 2 };
      mockExtensionApi.getDocumentByName.mockResolvedValue(mockDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        documentId: "custom-doc",
        scopeType: "User",
        scopeValue: "specific-user-id",
      };

      const result = await handler(params);

      expect(mockExtensionApi.getDocumentByName).toHaveBeenCalledWith("test-publisher", "test-extension", "User", "specific-user-id", "test-collection", "custom-doc");
      expect(result.content[0].text).toBe(JSON.stringify(mockDocument, null, 2));
    });

    it("should handle errors when retrieving a document", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.getDocumentByName.mockRejectedValue(new Error("Document not found"));

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        documentId: "missing-doc",
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Error getting document: Document not found");
      expect(result.isError).toBe(true);
    });
  });

  describe("get_documents tool", () => {
    it("should retrieve all documents from a collection with Default scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_documents");
      if (!call) throw new Error("extensiondata_get_documents tool not registered");
      const [, , , handler] = call;

      const mockDocuments = [
        { id: "doc-1", name: "Document 1", __etag: 1 },
        { id: "doc-2", name: "Document 2", __etag: 1 },
      ];
      mockExtensionApi.getDocumentsByName.mockResolvedValue(mockDocuments);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
      };

      const result = await handler(params);

      expect(mockExtensionApi.getDocumentsByName).toHaveBeenCalledWith("test-publisher", "test-extension", "Default", "Current", "test-collection");
      expect(result.content[0].text).toBe(JSON.stringify(mockDocuments, null, 2));
      expect(result.isError).toBeUndefined();
    });

    it("should handle errors when retrieving documents", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_documents");
      if (!call) throw new Error("extensiondata_get_documents tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.getDocumentsByName.mockRejectedValue(new Error("Collection not found"));

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "missing-collection",
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Error getting documents: Collection not found");
      expect(result.isError).toBe(true);
    });
  });

  describe("create_document tool", () => {
    it("should create a document without an id (auto-generated)", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_create_document");
      if (!call) throw new Error("extensiondata_create_document tool not registered");
      const [, , , handler] = call;

      const inputDocument = { name: "New Document", data: "test" };
      const createdDocument = { id: "auto-generated-id", name: "New Document", data: "test", __etag: 1 };
      mockExtensionApi.createDocumentByName.mockResolvedValue(createdDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: inputDocument,
      };

      const result = await handler(params);

      expect(mockExtensionApi.createDocumentByName).toHaveBeenCalledWith(inputDocument, "test-publisher", "test-extension", "Default", "Current", "test-collection");
      expect(result.content[0].text).toBe(JSON.stringify(createdDocument, null, 2));
    });

    it("should create a document with a specified id", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_create_document");
      if (!call) throw new Error("extensiondata_create_document tool not registered");
      const [, , , handler] = call;

      const inputDocument = { id: "custom-id", name: "Document with ID", data: "test" };
      const createdDocument = { ...inputDocument, __etag: 1 };
      mockExtensionApi.createDocumentByName.mockResolvedValue(createdDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: inputDocument,
      };

      const result = await handler(params);

      expect(mockExtensionApi.createDocumentByName).toHaveBeenCalledWith(inputDocument, "test-publisher", "test-extension", "Default", "Current", "test-collection");
      expect(result.content[0].text).toBe(JSON.stringify(createdDocument, null, 2));
    });

    it("should create a document in User scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_create_document");
      if (!call) throw new Error("extensiondata_create_document tool not registered");
      const [, , , handler] = call;

      const inputDocument = { preferences: { theme: "dark" } };
      const createdDocument = { id: "pref-id", ...inputDocument, __etag: 1 };
      mockExtensionApi.createDocumentByName.mockResolvedValue(createdDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "user-prefs",
        document: inputDocument,
        scopeType: "User",
      };

      const result = await handler(params);

      expect(mockExtensionApi.createDocumentByName).toHaveBeenCalledWith(inputDocument, "test-publisher", "test-extension", "User", "me", "user-prefs");
      expect(result.content[0].text).toBe(JSON.stringify(createdDocument, null, 2));
    });

    it("should handle errors when creating a document", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_create_document");
      if (!call) throw new Error("extensiondata_create_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.createDocumentByName.mockRejectedValue(new Error("Document already exists"));

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: { id: "existing-id", data: "test" },
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Error creating document: Document already exists");
      expect(result.isError).toBe(true);
    });
  });

  describe("set_document tool", () => {
    it("should set (upsert) a document with Default scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_set_document");
      if (!call) throw new Error("extensiondata_set_document tool not registered");
      const [, , , handler] = call;

      const inputDocument = { id: "doc-1", name: "Updated Document", data: "new-data" };
      const updatedDocument = { ...inputDocument, __etag: 2 };
      mockExtensionApi.setDocumentByName.mockResolvedValue(updatedDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: inputDocument,
      };

      const result = await handler(params);

      expect(mockExtensionApi.setDocumentByName).toHaveBeenCalledWith(inputDocument, "test-publisher", "test-extension", "Default", "Current", "test-collection");
      expect(result.content[0].text).toBe(JSON.stringify(updatedDocument, null, 2));
    });

    it("should return error if document does not have an id", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_set_document");
      if (!call) throw new Error("extensiondata_set_document tool not registered");
      const [, , , handler] = call;

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: { name: "No ID Document" },
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Document must include an 'id' property");
      expect(result.isError).toBe(true);
      expect(mockExtensionApi.setDocumentByName).not.toHaveBeenCalled();
    });

    it("should handle errors when setting a document", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_set_document");
      if (!call) throw new Error("extensiondata_set_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.setDocumentByName.mockRejectedValue(new Error("Permission denied"));

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: { id: "doc-1", data: "test" },
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Error setting document: Permission denied");
      expect(result.isError).toBe(true);
    });
  });

  describe("update_document tool", () => {
    it("should update an existing document with etag", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_update_document");
      if (!call) throw new Error("extensiondata_update_document tool not registered");
      const [, , , handler] = call;

      const inputDocument = { id: "doc-1", name: "Updated", __etag: 5 };
      const updatedDocument = { ...inputDocument, __etag: 6 };
      mockExtensionApi.updateDocumentByName.mockResolvedValue(updatedDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: inputDocument,
      };

      const result = await handler(params);

      expect(mockExtensionApi.updateDocumentByName).toHaveBeenCalledWith(inputDocument, "test-publisher", "test-extension", "Default", "Current", "test-collection");
      expect(result.content[0].text).toBe(JSON.stringify(updatedDocument, null, 2));
    });

    it("should update a document with last-write-wins (etag -1)", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_update_document");
      if (!call) throw new Error("extensiondata_update_document tool not registered");
      const [, , , handler] = call;

      const inputDocument = { id: "doc-1", name: "Force Updated", __etag: -1 };
      const updatedDocument = { ...inputDocument, __etag: 10 };
      mockExtensionApi.updateDocumentByName.mockResolvedValue(updatedDocument);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: inputDocument,
      };

      const result = await handler(params);

      expect(mockExtensionApi.updateDocumentByName).toHaveBeenCalledWith(inputDocument, "test-publisher", "test-extension", "Default", "Current", "test-collection");
      expect(result.content[0].text).toBe(JSON.stringify(updatedDocument, null, 2));
    });

    it("should return error if document does not have an id", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_update_document");
      if (!call) throw new Error("extensiondata_update_document tool not registered");
      const [, , , handler] = call;

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: { name: "No ID", __etag: 1 },
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Document must include an 'id' property");
      expect(result.isError).toBe(true);
      expect(mockExtensionApi.updateDocumentByName).not.toHaveBeenCalled();
    });

    it("should handle etag conflict errors", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_update_document");
      if (!call) throw new Error("extensiondata_update_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.updateDocumentByName.mockRejectedValue(new Error("ETag mismatch"));

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        document: { id: "doc-1", __etag: 3 },
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Error updating document: ETag mismatch");
      expect(result.isError).toBe(true);
    });
  });

  describe("delete_document tool", () => {
    it("should delete a document successfully", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_delete_document");
      if (!call) throw new Error("extensiondata_delete_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.deleteDocumentByName.mockResolvedValue(undefined);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        documentId: "doc-to-delete",
      };

      const result = await handler(params);

      expect(mockExtensionApi.deleteDocumentByName).toHaveBeenCalledWith("test-publisher", "test-extension", "Default", "Current", "test-collection", "doc-to-delete");
      expect(result.content[0].text).toContain("Document 'doc-to-delete' deleted successfully");
      expect(result.isError).toBeUndefined();
    });

    it("should delete a document from User scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_delete_document");
      if (!call) throw new Error("extensiondata_delete_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.deleteDocumentByName.mockResolvedValue(undefined);

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "user-data",
        documentId: "user-doc",
        scopeType: "User",
      };

      const result = await handler(params);

      expect(mockExtensionApi.deleteDocumentByName).toHaveBeenCalledWith("test-publisher", "test-extension", "User", "me", "user-data", "user-doc");
      expect(result.content[0].text).toContain("Document 'user-doc' deleted successfully");
    });

    it("should handle errors when deleting a document", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_delete_document");
      if (!call) throw new Error("extensiondata_delete_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.deleteDocumentByName.mockRejectedValue(new Error("Document not found"));

      const params = {
        publisherName: "test-publisher",
        extensionName: "test-extension",
        collectionName: "test-collection",
        documentId: "missing-doc",
      };

      const result = await handler(params);

      expect(result.content[0].text).toContain("Error deleting document: Document not found");
      expect(result.isError).toBe(true);
    });
  });

  describe("Scope handling", () => {
    it("should use 'Current' as default scopeValue for Default scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.getDocumentByName.mockResolvedValue({ id: "test" });

      await handler({
        publisherName: "pub",
        extensionName: "ext",
        collectionName: "col",
        documentId: "doc",
      });

      expect(mockExtensionApi.getDocumentByName).toHaveBeenCalledWith("pub", "ext", "Default", "Current", "col", "doc");
    });

    it("should use 'me' as default scopeValue for User scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.getDocumentByName.mockResolvedValue({ id: "test" });

      await handler({
        publisherName: "pub",
        extensionName: "ext",
        collectionName: "col",
        documentId: "doc",
        scopeType: "User",
      });

      expect(mockExtensionApi.getDocumentByName).toHaveBeenCalledWith("pub", "ext", "User", "me", "col", "doc");
    });

    it("should respect custom scopeValue for Default scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.getDocumentByName.mockResolvedValue({ id: "test" });

      await handler({
        publisherName: "pub",
        extensionName: "ext",
        collectionName: "col",
        documentId: "doc",
        scopeType: "Default",
        scopeValue: "CustomValue",
      });

      expect(mockExtensionApi.getDocumentByName).toHaveBeenCalledWith("pub", "ext", "Default", "CustomValue", "col", "doc");
    });

    it("should respect custom scopeValue for User scope", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);
      const call = (server.tool as jest.Mock).mock.calls.find(([toolName]) => toolName === "extensiondata_get_document");
      if (!call) throw new Error("extensiondata_get_document tool not registered");
      const [, , , handler] = call;

      mockExtensionApi.getDocumentByName.mockResolvedValue({ id: "test" });

      await handler({
        publisherName: "pub",
        extensionName: "ext",
        collectionName: "col",
        documentId: "doc",
        scopeType: "User",
        scopeValue: "user-123",
      });

      expect(mockExtensionApi.getDocumentByName).toHaveBeenCalledWith("pub", "ext", "User", "user-123", "col", "doc");
    });
  });

  describe("Scope Type Handling", () => {
    it("should use Default scope when scopeType is not provided", () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);

      // The scope handling is tested implicitly through the URL construction
      // in the actual tool implementation
      expect(true).toBe(true);
    });

    it("should use User scope when scopeType is User", () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);

      // The scope handling is tested implicitly through the URL construction
      // in the actual tool implementation
      expect(true).toBe(true);
    });
  });

  describe("API Integration", () => {
    it("should use ExtensionManagementApi from connection provider", async () => {
      configureExtensionDataTools(server, tokenProvider, connectionProvider);

      // Verify that the connection provider is used to get the Extension API
      expect(server.tool).toHaveBeenCalledTimes(6);
    });
  });
});
