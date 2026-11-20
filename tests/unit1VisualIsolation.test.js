import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import postcss from "postcss";
import { navigationSection } from "../src/portal/navigationSection.js";

test("Unit 1 profile selects its own navigation section without changing production aliases", () => {
  assert.equal(navigationSection("unit1", "/profile"), "/profile");
  assert.equal(navigationSection("unit1", "/profile/"), "/profile");
  assert.equal(navigationSection("unit1", "/coils"), "/production");
  assert.equal(navigationSection("unit2", "/profile"), "/profile");
});
test("shared-reference and workflow overrides are scoped to Unit 1", () => {
  for (const file of ["Unit2Visual.css", "Unit2Workflow.css"]) {
    const root = postcss.parse(
      fs.readFileSync(new URL("../src/unit1/" + file, import.meta.url), "utf8")
    );
    root.walkRules((rule) => {
      if (rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name))
        return;
      for (const selector of rule.selectors)
        assert.ok(
          selector.startsWith(".unit1-workspace"),
          `${file}: unscoped ${selector}`
        );
    });
  }
});
test("Unit 1 uses the installed Inter Variable font rather than a missing standalone font URL", () => {
  const main = fs.readFileSync(
      new URL("../src/main.jsx", import.meta.url),
      "utf8"
    ),
    css = fs.readFileSync(
      new URL("../src/unit1/index.css", import.meta.url),
      "utf8"
    );
  assert.match(main, /@fontsource-variable\/inter\/wght.css/);
  assert.doesNotMatch(css, /url\(['"]?\/fonts\//);
});
