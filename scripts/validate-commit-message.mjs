import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const policy = JSON.parse(fs.readFileSync(new URL('../design-system/commit-contract.json', import.meta.url), 'utf8'));
if (policy.version !== 1) throw new Error('Unsupported commit contract version; use an explicit policy migration');
const gitmojiTypes = new Map(Object.entries(policy.gitmojiTypes));
const conventionalSubject = new RegExp(`^([a-z]+)\\((${policy.scopePattern})\\): (${policy.summaryPattern})$`);
const mergeSubject = /^Merge (?:branch(?:es)?|remote-tracking branch(?:es)?|tag(?:s)?) '[^'\r\n]+'(?: .+)?$/;

export function validateCommitMessage(message, {mergeInProgress = false} = {}) {
  if (typeof message !== 'string') return {valid: false, error: 'a commit message is required'};
  const subject = message.split(/\r?\n/, 1)[0].trimEnd();
  if (mergeInProgress && mergeSubject.test(subject)) return {valid: true, reason: 'Git-style subject during an actual merge'};

  const emoji = [...gitmojiTypes.keys()].find(prefix => subject.startsWith(`${prefix} `));
  if (!emoji) return {valid: false, error: 'subject must start with a recognized Gitmoji and a space'};

  const remainder = subject.slice(emoji.length + 1);
  const match = remainder.match(conventionalSubject);
  if (!match) return {valid: false, error: 'use <gitmoji> <type>(<lowercase-kebab-scope>): <lowercase English summary>; scope is required'};
  if (match[1] !== gitmojiTypes.get(emoji)) {
    return {valid: false, error: `${emoji} must use the type "${gitmojiTypes.get(emoji)}"`};
  }

  return {valid: true};
}

export function isMergeInProgress(cwd = process.cwd()) {
  const result = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'MERGE_HEAD'], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0 && fs.existsSync(result.stdout.trim());
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const messagePath = process.argv[2];
  if (!messagePath) {
    console.error('Usage: node scripts/validate-commit-message.mjs <commit-message-file>');
    process.exitCode = 2;
  } else {
    try {
      const result = validateCommitMessage(fs.readFileSync(messagePath, 'utf8'), {mergeInProgress: isMergeInProgress()});
      if (!result.valid) {
        console.error(`Invalid commit message: ${result.error}.`);
        console.error('Examples: ✨ feat(homepage): improve recommendations; ⬆️ dep(deps): update dependencies; 🚀 release(site): publish v1.');
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(`Cannot validate commit message: ${error.message}`);
      process.exitCode = 2;
    }
  }
}
