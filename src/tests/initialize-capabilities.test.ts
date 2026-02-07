import { describe, expect, it } from "vitest";
import type {
  AgentSideConnection,
  InitializeRequest,
  ReadTextFileRequest,
  ReadTextFileResponse,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
  WriteTextFileRequest,
  WriteTextFileResponse,
} from "@agentclientprotocol/sdk";
import { ClaudeAcpAgent } from "../acp-agent.js";

function createMockClient(): AgentSideConnection {
  return {
    sessionUpdate: async (_notification: SessionNotification) => {},
    requestPermission: async (
      _params: RequestPermissionRequest,
    ): Promise<RequestPermissionResponse> => ({ outcome: { outcome: "cancelled" } }),
    readTextFile: async (_params: ReadTextFileRequest): Promise<ReadTextFileResponse> => ({
      content: "",
    }),
    writeTextFile: async (_params: WriteTextFileRequest): Promise<WriteTextFileResponse> => ({}),
  } as unknown as AgentSideConnection;
}

describe("initialize capabilities", () => {
  it("advertises load and session lifecycle capabilities expected by Zed external agents", async () => {
    const agent = new ClaudeAcpAgent(createMockClient());

    const response = await agent.initialize({
      protocolVersion: 1,
      clientCapabilities: {},
    } as InitializeRequest);

    expect(response.agentCapabilities).toBeDefined();
    expect(response.agentCapabilities?.loadSession).toBe(true);
    expect(response.agentCapabilities?.sessionCapabilities).toMatchObject({
      fork: {},
      list: {},
      resume: {},
    });
  });
});
