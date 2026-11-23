const scriptName = process.argv[2] ?? "this script";

console.error(
  `[stub] "${scriptName}" is not implemented yet. It is scheduled for a later task and must not be treated as passing.`,
);
process.exitCode = 1;
