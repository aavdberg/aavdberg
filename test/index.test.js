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

test('profile README displays the local Ermelo logo and Netherlands flag inline', async () => {
  const [readme, template] = await Promise.all([
    fs.readFile(README_PATH, 'utf8'),
    fs.readFile(TEMPLATE_PATH, 'utf8'),
  ]);
  const logoPath = path.join(__dirname, '..', 'images', 'ermelo-logo.svg');
  const flagPath = path.join(__dirname, '..', 'images', 'flag-netherlands.svg');

  await fs.access(logoPath);
  await fs.access(flagPath);
  const locationLine =
    /Based in Ermelo <a href="https:\/\/www\.ermelo\.nl\/"><img src="\.\/images\/ermelo-logo\.svg" width="64" alt="Gemeente Ermelo" \/><\/a>, Netherlands <img src="\.\/images\/flag-netherlands\.svg" width="20" alt="Netherlands flag" \/>/;

  assert.match(template, locationLine);
  assert.match(readme, locationLine);
});

test('profile README includes the user-provided bio and local Home Assistant logo', async () => {
  const [readme, template] = await Promise.all([
    fs.readFile(README_PATH, 'utf8'),
    fs.readFile(TEMPLATE_PATH, 'utf8'),
  ]);
  const logoPath = path.join(__dirname, '..', 'images', 'home-assistant-logo.png');

  await fs.access(logoPath);
  for (const content of [template, readme]) {
    assert.match(content, /over 20 years of IT experience/);
    assert.match(content, /multiple Microsoft certifications/);
    assert.match(content, /scalable, flexible, and secure cloud-native solutions/);
    assert.match(content, /reusable Bicep blueprints/);
    assert.match(content, /Microsoft MVP for Windows and Devices for IT/);
    assert.match(
      content,
      /src="\.\/images\/home-assistant-logo\.png" width="80" alt="Home Assistant"/
    );
  }
});
