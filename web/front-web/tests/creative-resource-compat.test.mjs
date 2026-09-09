import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../src/types/creativeResource.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { isLegacyUploadedCharacterResource } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);

test('legacy uploaded characters can run without a catalog ID, while unconfigured resources still require selection', () => {
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'character', assetUrl: '/uploads/original-character.png' }), true);
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'character', assetUrl: 'https://assets.example.test/character.png' }), true);
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'character' }), false);
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'character', assetUrl: 'blob:temporary-upload' }), false);
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'character', assetUrl: 'https://user:password@example.test/image.png' }), false);
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'character', assetUrl: '/uploads/image.png', resourcePrompt: 'New catalog template' }), false);
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'style', assetUrl: '/uploads/style.png' }), false);
  assert.equal(isLegacyUploadedCharacterResource({ kind: 'effect', assetUrl: '/uploads/effect.png' }), false);
});
