import { describe, expect, it } from "vitest";

import { scanForProvenance } from "../seo-provenance";

describe("seo-provenance scanner", () => {
  it("passes when every JSON-LD object literal has a // SOURCE: comment above", () => {
    const source = `
// SOURCE: package.json#version
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
};

// SOURCE: github.com/steeltroops-ai
const sourceSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
};
`;
    const result = scanForProvenance(source);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("fails when a JSON-LD object literal lacks a // SOURCE: comment", () => {
    const source = `
const fabricatedSchema = {
  "@context": "https://schema.org",
  "@type": "Review",
  reviewBody: "fake",
};
`;
    const result = scanForProvenance(source);
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].variable).toBe("fabricatedSchema");
  });

  it("treats comments other than // SOURCE: as missing provenance", () => {
    const source = `
// just a regular comment
const otherSchema = {
  "@context": "https://schema.org",
};
`;
    const result = scanForProvenance(source);
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it("reports line numbers", () => {
    const source = `line 1
line 2
const noProvenance = {
  "@context": "https://schema.org",
};
`;
    const result = scanForProvenance(source);
    expect(result.violations[0].line).toBe(3);
  });

  it("ignores object literals without @context", () => {
    const source = `
const notSchema = {
  foo: "bar",
};
`;
    const result = scanForProvenance(source);
    expect(result.ok).toBe(true);
  });
});
