// Exercise a real Git pre-commit in a disposable repository without staging or
// committing the user's checkout. Inputs are current non-ignored source files.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';

const source=path.resolve(import.meta.dirname,'../..');
const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'profile-hook-integration-'));
const git=(args)=>execFileSync('git',args,{cwd:fixture,encoding:'utf8',env:{...process.env,GIT_CONFIG_GLOBAL:os.devNull,GIT_CONFIG_SYSTEM:os.devNull}});
try {
  const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:source,encoding:'utf8'}).split('\0').filter(Boolean);
  for(const file of new Set(files)) {
    let stat;try {stat=await fs.lstat(path.join(source,file));}catch(e){if(e.code==='ENOENT')continue;throw e;}
    await fs.mkdir(path.dirname(path.join(fixture,file)),{recursive:true});
    if(stat.isSymbolicLink())await fs.symlink(await fs.readlink(path.join(source,file)),path.join(fixture,file));
    else if(stat.isFile()){await fs.copyFile(path.join(source,file),path.join(fixture,file));await fs.chmod(path.join(fixture,file),stat.mode & 0o777);}
  }
  await fs.chmod(path.join(fixture,'.githooks/pre-commit'),0o755);
  git(['init','-q']);git(['config','core.hooksPath','.githooks']);git(['add','.']);
  await fs.symlink(path.join(source,'node_modules'),path.join(fixture,'node_modules'),'dir');
  const result=spawnSync('git',['-c','user.name=Design integration fixture','-c','user.email=fixture@example.invalid','commit','-q','-m','test: validate the staged design-system fixture'],{cwd:fixture,env:process.env,stdio:'inherit'});
  if(result.status!==0)throw new Error('Disposable native pre-commit failed');
  console.log(`Disposable commit passed. Tree: ${git(['rev-parse','HEAD^{tree}']).trim()}`);
} finally {
  try {await fs.cp(path.join(fixture,'.playwright-mcp'),path.join(source,'.playwright-mcp/hook-integration'),{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.rm(fixture,{recursive:true,force:true});
}
