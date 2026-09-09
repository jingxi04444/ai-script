// Pure file validation only: never connects to or modifies a database.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const frontText = read('web/front-web/public/creative-library/catalog.json');
const catalog = JSON.parse(frontText);
const mainSeed = read('doc/global-database/mysql/ai_script_mysql_seed.sql');
const incrementalSeed = read('doc/global-database/mysql/migrations/20260905121000_creative_resources_seed.sql');
const migration = read('doc/global-database/mysql/migrations/20260906120000_character_reference_sets.sql');
// Add a role only after its generated nine-expression image has passed visual QA.
const qaApprovedExpressionCodes = new Set(['character-lin', 'character-chen']);
const columns = ['id', 'code', 'type', 'name', 'category', 'description', 'coverUrl', 'previewVideoUrl', 'gallery', 'tags', 'prompt', 'negativePrompt', 'config', 'status', 'sortOrder', 'licenseNote', 'author'];
const decodeSql = value => value.replaceAll("''", "'");
const seedRows = text => text.split('\n').filter(line => /^SELECT '91026090500000010[1-6]',/.test(line)).map(line => {
  const values = [...line.matchAll(/'((?:''|[^'])*)'/g)].map(match => decodeSql(match[1]));
  assert.equal(values.length, columns.length);
  return Object.fromEntries(columns.map((column, index) => [column, ['gallery', 'tags', 'config'].includes(column) ? JSON.parse(values[index]) : column === 'sortOrder' ? Number(values[index]) : values[index]]));
});

test('both static catalogs and all six installation rows are equivalent', () => {
  assert.equal(read('web/admin-web/public/creative-library/catalog.json'), frontText);
  assert.deepEqual(seedRows(mainSeed), catalog);
  assert.deepEqual(seedRows(incrementalSeed), catalog);
  assert.equal(catalog.length, 6);
});

test('every declared media asset exists and matches between both applications', () => {
  const urls = new Set(catalog.flatMap(item => [item.coverUrl, item.previewVideoUrl, ...item.gallery.map(image => image.url)]).filter(Boolean));
  assert.equal(urls.size, 12 + qaApprovedExpressionCodes.size);
  for (const url of urls) {
    assert.ok(url.startsWith('/creative-library/'));
    const frontPath = new URL(`web/front-web/public${url}`, root);
    const adminPath = new URL(`web/admin-web/public${url}`, root);
    assert.ok(existsSync(frontPath), url);
    assert.ok(existsSync(adminPath), url);
    assert.ok(readFileSync(frontPath).equals(readFileSync(adminPath)), `${url}: app copies match`);
  }
});

test('character samples only declare visually approved nine-expression images', () => {
  for (const item of catalog.filter(resource => resource.type === 'character')) {
    const approved = qaApprovedExpressionCodes.has(item.code);
    const expectedLabels = ['全身图', '面部特写', ...(approved ? ['表情九宫格'] : []), '多角度设定图', '旧综合设定板（正侧背与六种表情）'];
    assert.deepEqual(item.gallery.map(image => image.label), expectedLabels);
    assert.deepEqual(item.config.referenceViews, item.gallery.map(image => image.label));
    assert.equal(new Set(item.gallery.map(image => image.url)).size, expectedLabels.length);
    const expressionUrl = `/creative-library/${item.code}-expressions.png`;
    if (approved) {
      assert.equal(item.gallery[2].url, expressionUrl, 'expression image occupies the third standard slot');
      assert.equal(item.config.pendingReferenceViews, undefined);
      assert.doesNotMatch(item.description, /待补/);
      assert.match(item.description, /表情九宫格/);
      const image = readFileSync(new URL(`web/front-web/public${expressionUrl}`, root));
      assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(image.readUInt32BE(16), image.readUInt32BE(20), 'approved expression image is square');
      assert.ok(image.readUInt32BE(16) >= 1000);
    } else {
      assert.deepEqual(item.config.pendingReferenceViews, ['表情九宫格']);
      assert.match(item.description, /表情九宫格待补/);
      for (const text of [frontText, mainSeed, incrementalSeed, migration]) assert.ok(!text.includes(expressionUrl), 'unapproved image must not be referenced');
    }
  }
});

test('safe migration sets catalog values but guards all original editable fields and audits', () => {
  const changes = [...migration.matchAll(/UPDATE sys_creative_resource\nSET description = '((?:''|[^'])*)',\n    gallery_json = CAST\('((?:''|[^'])*)' AS JSON\),\n    config_json = CAST\('((?:''|[^'])*)' AS JSON\)\nWHERE id = '(\d+)'([\s\S]*?);/g)];
  assert.equal(changes.length, 2);
  for (const change of changes) {
    const item = catalog.find(resource => resource.id === change[4]);
    assert.equal(item?.type, 'character');
    assert.equal(decodeSql(change[1]), item.description);
    assert.deepEqual(JSON.parse(decodeSql(change[2])), item.gallery);
    assert.deepEqual(JSON.parse(decodeSql(change[3])), item.config);
    const predicate = change[5];
    for (const guard of ['deleted = 0', 'create_by IS NULL AND update_by IS NULL', 'create_time = update_time']) assert.ok(predicate.includes(guard), guard);
    for (const column of ['code', 'type', 'name', 'category', 'description', 'cover_url', 'preview_video_url', 'prompt', 'negative_prompt', 'status', 'license_note', 'author']) assert.ok(predicate.includes(`AND BINARY ${column} = BINARY '`), column);
    for (const column of ['gallery_json', 'tags_json', 'config_json']) assert.ok(predicate.includes(`AND ${column} = CAST('`), column);
    assert.match(predicate, /AND sort_order = (10|20)\n/);
    const priorGallery = JSON.parse(decodeSql(/AND gallery_json = CAST\('((?:''|[^'])*)' AS JSON\)/.exec(predicate)[1]));
    assert.equal(priorGallery.length, 2);
    assert.notDeepEqual(priorGallery, item.gallery, 'second execution cannot satisfy the old-gallery predicate');
  }
  assert.equal((migration.match(/AS eligible_count/g) || []).length, 2);
  assert.equal((migration.match(/ROW_COUNT\(\) AS upgraded_rows/g) || []).length, 2);
  assert.match(migration, /START TRANSACTION;/);
  assert.match(migration, /COMMIT;/);
  assert.doesNotMatch(migration, /^(?:DELETE|INSERT|REPLACE|DROP|TRUNCATE|USE)\b/m);
});
