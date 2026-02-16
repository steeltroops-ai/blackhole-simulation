import fs from "fs";

const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
  console.error("ERROR: No commit message file provided.");
  process.exit(1);
}

try {
  const msg = fs.readFileSync(commitMsgFile, "utf8").trim();
  const regex =
    /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\(.*\))?(!)?: .+/;

  if (!regex.test(msg)) {
    console.error("\n" + "=".repeat(60));
    console.error("INVALID COMMIT MESSAGE FORMAT");
    console.error("=".repeat(60));
    console.error(`Message: "${msg}"`);
    console.error("\nExpected format: <type>(<scope>): <subject>");
    console.error(
      "Types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test",
    );
    console.error("\nExample: feat(ui): add new black hole shader");
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }

  console.log("✔️ Commit message format is valid.");
} catch (err: any) {
  console.error(`ERROR: Could not read commit message file: ${err.message}`);
  process.exit(1);
}
