'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const Mustache = require('mustache');
const { formatRefreshDate, generateReadme } = require('../index');

const TEMPLATE_PATH = path.join(__dirname, '..', 'main.mustache');
const README_PATH = path.join(__dirname, '..', 'README.md');

test('generates README from the template with a localized refresh date', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aavdberg-readme-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const templatePath = path.join(directory, 'main.mustache');
  const outputPath = path.join(directory, 'README.md');
  const refreshedAt = new Date('2026-10-02T05:41:00.000Z');
  await fs.writeFile(templatePath, '<p>Last refreshed: {{refresh_date}}</p>', 'utf8');

  const output = await generateReadme({ templatePath, outputPath, refreshedAt });

  assert.equal(
    output,
    `<p>Last refreshed: ${formatRefreshDate(refreshedAt)}</p>`
  );
  assert.equal(await fs.readFile(outputPath, 'utf8'), output);
});

test('reports template read failures to the caller', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aavdberg-readme-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  await assert.rejects(
    generateReadme({
      templatePath: path.join(directory, 'missing.mustache'),
      outputPath: path.join(directory, 'README.md'),
    }),
    { code: 'ENOENT' }
  );
});

test('reports output write failures to the caller', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aavdberg-readme-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  await fs.writeFile(path.join(directory, 'main.mustache'), 'Profile', 'utf8');
  await assert.rejects(
    generateReadme({
      templatePath: path.join(directory, 'main.mustache'),
      outputPath: path.join(directory, 'missing', 'README.md'),
    }),
    { code: 'ENOENT' }
  );
});

test('checked-in README matches the template and its refresh timestamp', async () => {
  const [template, readme] = await Promise.all([
    fs.readFile(TEMPLATE_PATH, 'utf8'),
    fs.readFile(README_PATH, 'utf8'),
  ]);
  const match = readme.match(/Last refreshed: (.*?) · Generated from/);

  assert.ok(match, 'README should include its generated refresh timestamp');
  assert.equal(
    readme,
    Mustache.render(template, { refresh_date: match[1] }),
    'README should be the rendered template'
  );
});

test('profile README uses the local Ermelo logo asset', async () => {
  const [readme, template] = await Promise.all([
    fs.readFile(README_PATH, 'utf8'),
    fs.readFile(TEMPLATE_PATH, 'utf8'),
  ]);
  const logoPath = path.join(__dirname, '..', 'images', 'ermelo-logo.svg');

  await fs.access(logoPath);
  assert.match(template, /src="\.\/*images\/ermelo-logo\.svg"/);
  assert.match(readme, /src="\.\/*images\/ermelo-logo\.svg"/);
});
