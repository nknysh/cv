#!/usr/bin/env node
// Generates the HTML pages in docs/portfolio/ from the resume repo's portfolio.md.
// Usage: node scripts/build-portfolio.mjs [path/to/portfolio.md]
// Only the *.html files are generated; portfolio.css and menu.js are edited by hand.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(process.argv[2] ?? resolve(root, '../resume/data/portfolio.md'));
const outDir = resolve(root, 'docs/portfolio');
const siteUrl = 'https://nknysh.github.io/cv/portfolio/';
const fontsUrl =
  'https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400..800;1,400..600&family=Geist:wght@300..600&family=JetBrains+Mono:wght@400;500&display=swap';

// One entry per portfolio item, in portfolio.md order. Slugs are public URLs: do not change them.
// Labels and stats are not in portfolio.md, so keep the stats in line with its text by hand.
// The first stat of each item also appears in the overview's track record.
const pages = [
  {
    slug: 'first-qa-function',
    label: 'Introducing the QA Function',
    stats: [
      ['~2,000', 'automated tests in CI/CD'],
      ['1 hour', 'full test run'],
      ['Up to 10', 'people in the QA team'],
    ],
  },
  {
    slug: 'test-strategy-from-scratch',
    label: 'Test Strategy from Scratch',
    stats: [
      ['3,600+', 'UI and API tests'],
      ['6', 'people in the team'],
      ['Risk-based', 'automation roadmap'],
    ],
  },
  {
    slug: 'unified-qa-practices',
    label: 'Unifying QA Across Teams',
    stats: [
      ['70-85%', 'fewer escaped defects'],
      ['4', 'Scrum teams, one process'],
      ['10', 'testers led'],
    ],
  },
  {
    slug: 'automation-50-to-2200',
    label: 'Modernizing Test Automation',
    stats: [
      ['2,200', 'automated tests, up from 50'],
      ['Cypress', 'updated framework'],
      ['Test team', 'owns the automation'],
    ],
  },
  {
    slug: 'ui-library-testing',
    label: 'UI Library Visual Testing',
    stats: [
      ['900+', 'visual tests'],
      ['2', 'test layers: functional and visual'],
      ['Every change', 'checked in CI'],
    ],
  },
];

const icon = (body) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = {
  github: icon(
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2.5"/>',
  ),
  linkedin: icon(
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  ),
  file: icon(
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  ),
  sun: icon(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  ),
  menu: icon('<path d="M4 6h16M4 12h16M4 18h16"/>'),
};

const esc = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parse(markdown) {
  const doc = { title: '', contacts: [], items: [] };
  let item = null;
  let section = null;

  markdown.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    const fail = () => {
      throw new Error(`portfolio.md:${index + 1}: unexpected line: ${line}`);
    };
    if (!line || line === '## Portfolio') return;

    let match;
    if ((match = line.match(/^# (.+)$/))) {
      doc.title = match[1];
    } else if ((match = line.match(/^### .+? — (.+)$/))) {
      // The role before the dash stays in portfolio.md but is not published here.
      item = { headline: match[1], challenge: '', solution: [], tech: [] };
      section = null;
      doc.items.push(item);
    } else if ((match = line.match(/^\*\*(Challenge|My Solution|Tech Stack)\*\*$/))) {
      if (!item) fail();
      section = match[1];
    } else if ((match = line.match(/^- (.+)$/))) {
      if (!item) {
        const contact = match[1].match(/^(.+?): (.+)$/);
        if (!contact) fail();
        doc.contacts.push({ label: contact[1], value: contact[2] });
      } else if (section === 'My Solution') {
        item.solution.push(match[1]);
      } else {
        fail();
      }
    } else if (section === 'Challenge' && !item.challenge) {
      item.challenge = line;
    } else if (section === 'Tech Stack' && !item.tech.length) {
      item.tech = line.split(', ');
    } else {
      fail();
    }
  });

  if (doc.items.length !== pages.length) {
    throw new Error(`Found ${doc.items.length} items but ${pages.length} pages are configured; update pages[].`);
  }
  doc.items.forEach((entry, index) => {
    if (!entry.challenge || !entry.solution.length || !entry.tech.length) {
      throw new Error(`Item ${index + 1} (${entry.headline}) is missing a section.`);
    }
    Object.assign(entry, pages[index], { caseNo: index + 1 });
  });
  return doc;
}

function contactHref(value) {
  if (value.includes('@')) return `mailto:${value}`;
  return value.startsWith('http') ? value : `https://${value}`;
}

function siteHeader(items, current) {
  const links = items
    .map(
      (entry) =>
        `<li><a href="${entry.slug}.html"${current === entry.slug ? ' aria-current="page"' : ''}>${esc(entry.label)}</a></li>`,
    )
    .join('\n          ');
  return `<header class="site-header">
  <div class="bar">
    <a class="brand" href="./" aria-label="Mykyta Knysh, portfolio overview"><img src="../images/avatar.jpg" alt="" width="40" height="40"></a>
    <div class="actions">
      <a class="button" href="../Mykyta_Knysh_Portfolio.pdf" download>PDF</a>
      <a class="icon-link wide-only" href="https://github.com/nknysh/cmc-tests" rel="noopener" aria-label="Demo project on GitHub" title="Demo project">${icons.github}</a>
      <a class="icon-link wide-only" href="https://www.linkedin.com/in/mykytaknysh/" rel="me noopener" aria-label="LinkedIn profile" title="LinkedIn">${icons.linkedin}</a>
      <a class="icon-link wide-only" href="../" aria-label="Resume" title="Resume">${icons.file}</a>
      <button class="icon-link framed theme-toggle" type="button" aria-label="Switch color theme" title="Switch color theme">${icons.sun}</button>
      <button class="icon-link menu-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu">${icons.menu}</button>
    </div>
    <nav id="menu" class="menu" aria-label="Portfolio">
      <ul>
        <li><a href="./"${current === null ? ' aria-current="page"' : ''}>Overview</a></li>
          ${links}
      </ul>
      <ul class="menu-extra">
        <li><a href="https://github.com/nknysh/cmc-tests" rel="noopener">Demo project</a></li>
        <li><a href="https://www.linkedin.com/in/mykytaknysh/" rel="me noopener">LinkedIn</a></li>
        <li><a href="../">Resume</a></li>
      </ul>
    </nav>
  </div>
</header>`;
}

function layout({ title, description, path, current, items, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Mykyta Knysh">
<link rel="canonical" href="${siteUrl}${path}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${siteUrl}${path}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="../images/favicon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontsUrl}">
<link rel="stylesheet" href="portfolio.css">
<script src="menu.js"></script>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
${siteHeader(items, current)}
<main id="content">
${body}
</main>
</body>
</html>
`;
}

function overviewPage(doc) {
  const [name, subject] = doc.title.split(' — ');
  const contacts = doc.contacts
    .map(
      ({ label, value }) =>
        `<li><span class="kicker">${esc(label)}</span><a href="${esc(contactHref(value))}">${esc(value)}</a></li>`,
    )
    .join('\n        ');
  const stats = doc.items
    .map(
      (entry) =>
        `<li data-case="${entry.caseNo}"><span class="stat-value">${esc(entry.stats[0][0])}</span><span class="stat-label">${esc(entry.stats[0][1])}</span></li>`,
    )
    .join('\n        ');
  const cards = doc.items
    .map(
      (entry) => `      <li><a class="card" href="${entry.slug}.html">
        <span class="card-title">${esc(entry.headline)}</span>
        <span class="tags">${entry.tech
          .slice(0, 4)
          .map((tool) => `<span>${esc(tool)}</span>`)
          .join('')}</span>
        <span class="read-more">Read case study <span aria-hidden="true">→</span></span>
      </a></li>`,
    )
    .join('\n');
  return layout({
    title: doc.title,
    description: 'Case studies from Mykyta Knysh: building QA functions, test strategies and test automation at scale.',
    path: '',
    current: null,
    items: doc.items,
    body: `  <section class="hero">
    <div class="wrap">
      <h1>${esc(name)} <span class="sep">—</span> <em>${esc(subject)}</em></h1>
      <p class="lead">Lead Test Automation Engineer, AI-first, ISTQB Certified Test Manager</p>
      <p class="kicker track"><span class="pip"></span>Track record</p>
      <ul class="stats-row">
        ${stats}
      </ul>
      <ul class="contacts">
        ${contacts}
      </ul>
    </div>
  </section>
  <section class="work" aria-labelledby="cases">
    <div class="wrap">
      <h2 id="cases">Selected <em>case studies</em></h2>
      <ol class="cards">
${cards}
      </ol>
    </div>
  </section>`,
  });
}

function casePage(doc, index) {
  const entry = doc.items[index];
  const steps = [...entry.solution];
  const result = steps.at(-1).startsWith('Result: ') ? steps.pop().slice('Result: '.length) : null;
  const sections = [
    { id: 'challenge', title: 'Challenge', body: `<p>${esc(entry.challenge)}</p>` },
    {
      id: 'solution',
      title: 'My Solution',
      body: `<ul class="steps">
            ${steps.map((step) => `<li>${esc(step)}</li>`).join('\n            ')}
          </ul>`,
    },
    ...(result ? [{ id: 'result', title: 'Result', body: `<p>${esc(result)}</p>` }] : []),
    {
      id: 'tech',
      title: 'Tech Stack',
      body: `<ul class="tags">
            ${entry.tech.map((tool) => `<li>${esc(tool)}</li>`).join('\n            ')}
          </ul>`,
    },
  ];
  const pagerLink = (target, rel, label) =>
    target
      ? `<a href="${target.slug}.html" rel="${rel}"><span class="kicker">${label}</span>${esc(target.label)}</a>`
      : '<span></span>';

  return layout({
    title: `${entry.label} | Mykyta Knysh`,
    description: `${entry.headline}.`,
    path: `${entry.slug}.html`,
    current: entry.slug,
    items: doc.items,
    body: `  <article class="wrap narrow">
    <a class="back" href="./"><span aria-hidden="true">←</span> Back to case studies</a>
    <header class="case-header">
      <h1>${esc(entry.headline)}</h1>
    </header>
    <ul class="stats-grid">
      ${entry.stats
        .map(([value, label]) => `<li><span class="stat-value">${esc(value)}</span><span class="stat-label">${esc(label)}</span></li>`)
        .join('\n      ')}
    </ul>
    <div class="case-body">
      <nav class="toc" aria-label="On this page">
        <p class="kicker">On this page</p>
        <ol>
          ${sections.map((section) => `<li><a href="#${section.id}">${esc(section.title)}</a></li>`).join('\n          ')}
        </ol>
      </nav>
      <div>
        ${sections
          .map(
            (section) => `<section class="block block-${section.id}" aria-labelledby="${section.id}">
          <h2 id="${section.id}">${esc(section.title)}</h2>
          ${section.body}
        </section>`,
          )
          .join('\n        ')}
      </div>
    </div>
    <nav class="pager" aria-label="Previous and next case">
      ${pagerLink(doc.items[index - 1], 'prev', 'Previous')}
      ${pagerLink(doc.items[index + 1], 'next', 'Next')}
    </nav>
  </article>`,
  });
}

const doc = parse(readFileSync(sourcePath, 'utf8'));
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'index.html'), overviewPage(doc));
doc.items.forEach((entry, index) => {
  writeFileSync(resolve(outDir, `${entry.slug}.html`), casePage(doc, index));
});
console.log(`Wrote ${doc.items.length + 1} pages to docs/portfolio/ from ${sourcePath}`);
