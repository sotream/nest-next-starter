// PostToolUse hook: format the file Claude just edited. Reads the hook payload from stdin.
// Never fails the tool call; formatting is a convenience, lint-staged is the real gate.
import { execFileSync } from 'node:child_process';

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const file = JSON.parse(input).tool_input?.file_path;
    if (file) {
      execFileSync('pnpm', ['exec', 'prettier', '--write', '--ignore-unknown', file], {
        stdio: 'ignore',
      });
    }
  } catch {
    // Unsupported file or prettier unavailable: skip silently.
  }
});
