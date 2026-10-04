import { describe, expect, it } from "vitest";

import { buildPath, extensionFor, isPathInFolder } from "@/lib/uploads/paths";

const FOLDER = "3f1c2a8e-1111-4c2b-9a2e-0a1b2c3d4e5f";

describe("upload paths", () => {
  it("builds a random path inside the folder", () => {
    const path = buildPath(FOLDER, "image/jpeg", "id_card");
    expect(path).toMatch(new RegExp(`^${FOLDER}/id_card-[0-9a-f-]{36}\\.jpg$`));
    expect(buildPath(FOLDER, "image/jpeg")).not.toBe(
      buildPath(FOLDER, "image/jpeg"),
    );
  });

  it("maps allowed types to extensions and rejects others", () => {
    expect(extensionFor("application/pdf")).toBe("pdf");
    expect(() => extensionFor("image/gif")).toThrow();
  });

  it("accepts only simple file names inside the expected folder", () => {
    expect(isPathInFolder(`${FOLDER}/abc-123.jpg`, FOLDER)).toBe(true);
    expect(isPathInFolder(`otra-carpeta/abc.jpg`, FOLDER)).toBe(false);
    expect(isPathInFolder(`${FOLDER}/../${FOLDER}/abc.jpg`, FOLDER)).toBe(
      false,
    );
    expect(isPathInFolder(`${FOLDER}/sub/abc.jpg`, FOLDER)).toBe(false);
    expect(isPathInFolder(`${FOLDER}/abc.exe`, FOLDER)).toBe(false);
    expect(isPathInFolder(`${FOLDER}x/abc.jpg`, FOLDER)).toBe(false);
  });
});
