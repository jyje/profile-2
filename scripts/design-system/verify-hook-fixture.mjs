// Exercise the real Git hooks in a disposable repository without staging or
// committing the user's checkout. Inputs are current non-ignored source files.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';

const source=path.resolve(import.meta.dirname,'../..');
const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'profile-hook-integration-'));
const env={...process.env,GIT_CONFIG_GLOBAL:os.devNull,GIT_CONFIG_SYSTEM:os.devNull};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR'])delete env[key];
const git=(args)=>execFileSync('git',args,{cwd:fixture,encoding:'utf8',env});
try {
  const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:source,encoding:'utf8'}).split('\0').filter(Boolean);
  for(const file of new Set(files)) {
    let stat;try {stat=await fs.lstat(path.join(source,file));}catch(e){if(e.code==='ENOENT')continue;throw e;}
    await fs.mkdir(path.dirname(path.join(fixture,file)),{recursive:true});
    if(stat.isSymbolicLink())await fs.symlink(await fs.readlink(path.join(source,file)),path.join(fixture,file));
    else if(stat.isFile()){await fs.copyFile(path.join(source,file),path.join(fixture,file));await fs.chmod(path.join(fixture,file),stat.mode & 0o777);}
  }
  await fs.chmod(path.join(fixture,'.githooks/pre-commit'),0o755);
  await fs.chmod(path.join(fixture,'.githooks/commit-msg'),0o755);
  git(['init','-q']);git(['config','core.hooksPath','.githooks']);git(['add','.']);
  await fs.symlink(path.join(source,'node_modules'),path.join(fixture,'node_modules'),'dir');
  const gitCommit=(args,{capture=true}={})=>spawnSync('git',['-c','user.name=Design integration fixture','-c','user.email=fixture@example.invalid','commit','-q',...args],{cwd:fixture,env,encoding:'utf8',stdio:capture?'pipe':'inherit'});
  const result=gitCommit(['-m','✅ test(design): validate the staged design-system fixture'],{capture:false});
  if(result.status!==0)throw new Error('Disposable native Git hooks failed');
  // The full staged gate runs once above. An empty attempted commit still runs
  // both real hooks but has no rendering inputs to rebuild for each bad subject.
  const before=git(['rev-parse','HEAD']).trim();
  const rejected=gitCommit(['--allow-empty','-m','test: this should be rejected']);
  if(rejected.status===0||!rejected.stderr.includes('Invalid commit message'))throw new Error('Commit-msg hook did not reject a non-Gitmoji subject');
  if(git(['rev-parse','HEAD']).trim()!==before)throw new Error('Rejected message changed fixture HEAD');
  console.log(`Disposable commit passed. Tree: ${git(['rev-parse','HEAD^{tree}']).trim()}`);
} finally {
  try {await fs.cp(path.join(fixture,'.playwright-mcp'),path.join(source,'.playwright-mcp/hook-integration'),{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.rm(fixture,{recursive:true,force:true});
}
