# Dependency audit reporting

Run `npm run audit:summary` after a clean installation. The reporter invokes
lockfile-only npm audit and emits a versioned allowlisted JSON summary. CI
uploads only `audit-summary.json`, never the scanner's raw stdout/stderr.

The report contains public package names, resolved versions, scanner severities,
canonical GitHub advisory URLs, root propagation and tracking issue links. It
does not copy titles, paths, registry locations, suggested fix commands, logs,
stack traces, environment data or arbitrary scanner metadata. Invalid input or
uncovered propagation fails with a generic diagnostic that contains no input.
Traversal tolerates cycles but rejects components without an advisory root.

Every new root requires explicit triage: add its issue mapping after reviewing
the public advisory and compatibility requirements. Unknown roots produce a
report and a failing exit code. The reporter does not apply changes, dismiss
alerts, follow suggested major-version jumps or count propagated packages as
independent advisories. Known findings remain `tracked-unresolved` even when a
separate local mitigation exists. An empty audit is not proof of safe runtime
inputs or provider availability.

The security suite tests synthetic sensitive markers, malformed diagnostics,
private URL rejection, versions, cyclic coverage and severity handling. Extend
those fixtures when changing the schema or policy. Keep raw diagnostics private
when investigating reporting failures; do not attach them to public issues.
