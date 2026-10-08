# Security policy

This is a personal starter template, maintained on a best-effort basis with no support commitment.
See [ADR 0002](docs/adr/0002-auth-refresh-rotation.md) and the [deployment guide](docs/guides/deployment.md)
for the known trade-offs and limitations before you report them as issues.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private reporting: **Security** tab, then **Report a
vulnerability**. Include the affected file or route, steps to reproduce and the impact.

Reports are read when time allows; there is no response-time guarantee. Fixes land on `main`, and only the
latest commit on `main` is supported.

## Scope

In scope: the code in this repository. Out of scope: vulnerabilities in third-party dependencies (report
them upstream), and the documented trade-offs, such as access tokens staying valid until they expire.
