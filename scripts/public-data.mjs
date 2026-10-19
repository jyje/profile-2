import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

// Public builds compile only explicitly authored top-level site data, never
// the retired career catalog or any sibling/private repository.
export function syncPublicData(root) {
  const data = path.join(root, 'data');
  const output = path.join(root, 'src/generated');
  fs.mkdirSync(output, {recursive: true});
  for (const name of ['resume.ko.json', 'resume.en.json', 'career-layout.json']) {
    fs.rmSync(path.join(output, name), {force: true});
  }
  if (!fs.existsSync(data)) return;
  for (const file of ['tags.yml', 'home-curation.yml'].filter(file => fs.existsSync(path.join(data, file)))) {
    const value = yaml.load(fs.readFileSync(path.join(data, file), 'utf8'));
    fs.writeFileSync(path.join(output, file.replace(/\.yml$/, '.json')), JSON.stringify(value));
  }
}
