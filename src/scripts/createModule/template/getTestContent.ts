export const getTestContent = (CapName: string, moduleName: string) => `
import request from "supertest";
import app from "@/server";

describe("${CapName} module", () => {
  it("should create a new ${moduleName}", async () => {
    // TODO: Add test implementation
  });
});
`;
