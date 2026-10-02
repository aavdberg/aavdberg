'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const Mustache = require('mustache');

const TEMPLATE_PATH = path.join(__dirname, 'main.mustache');
const README_PATH = path.join(__dirname, 'README.md');

function formatRefreshDate(date) {
  return date.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
    timeZone: 'Europe/Amsterdam',
  });
}

function renderReadme(template, refreshDate) {
  return Mustache.render(template, { refresh_date: refreshDate });
}

async function generateReadme({
  templatePath = TEMPLATE_PATH,
  outputPath = README_PATH,
  refreshedAt = new Date(),
} = {}) {
  const template = await fs.readFile(templatePath, 'utf8');
  const output = renderReadme(template, formatRefreshDate(refreshedAt));
  await fs.writeFile(outputPath, output, 'utf8');
  return output;
}

if (require.main === module) {
  generateReadme().catch(error => {
    console.error('README generation failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { formatRefreshDate, generateReadme, renderReadme };