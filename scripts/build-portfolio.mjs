#!/usr/bin/env node
// Generates the HTML pages in docs/portfolio/ from the resume repo's portfolio.md,
// docs/work-history/index.html from its resume-detailed.md, and the landing page docs/index.html.
// Usage: node scripts/build-portfolio.mjs [path/to/portfolio.md] [path/to/resume-detailed.md]
// Only the *.html files are generated; portfolio.css and menu.js are edited by hand.

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(process.argv[2] ?? resolve(root, '../resume/data/portfolio.md'));
const historyPath = resolve(process.argv[3] ?? resolve(root, '../resume/data/resume-detailed.md'));
const outDir = resolve(root, 'docs/portfolio');
const historyDir = resolve(root, 'docs/work-history');
const cvUrl = 'https://nknysh.github.io/cv/';
const siteUrl = `${cvUrl}portfolio/`;
const historyUrl = `${cvUrl}work-history/`;
const fontsUrl =
  'https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400..800;1,400..600&family=Geist:wght@300..600&family=JetBrains+Mono:wght@400;500&display=swap';

// One entry per portfolio item, in portfolio.md order. Slugs are public URLs: do not change them.
// Labels, card icons and stats are not in portfolio.md, so keep the stats in line with its text by hand.
// The first stat of each item also appears in the overview's track record.
// Items listed in trackRecordLead come first there; the rest follow in portfolio.md order.
const trackRecordLead = ['playwright-suite-stability', 'unified-qa-practices'];
const pages = [
  {
    slug: 'first-qa-function',
    icon: '<path class="f" d="M24 4l16 6v13c0 10-7 17-16 21C15 40 8 33 8 23V10z"/><path class="l" d="M16 24l6 6 11-12"/>',
    label: 'Introducing the QA Function',
    stats: [
      ['~2,000', 'automated tests in CI/CD, up from no QA'],
      ['1 hour', 'full test run'],
      ['Up to 10', 'people in the QA team'],
    ],
  },
  {
    slug: 'test-strategy-from-scratch',
    icon: '<path class="f" d="M24 5l19 36H5z"/><path class="l" d="M17.7 17h12.6M11.3 29h25.4"/>',
    label: 'Test Strategy from Scratch',
    stats: [
      ['3,600+', 'UI and API tests in CI, with a test strategy for a new team'],
      ['6', 'people in the team'],
      ['Risk-based', 'automation roadmap'],
    ],
  },
  {
    slug: 'playwright-suite-stability',
    icon: '<circle class="f" cx="24" cy="27" r="17"/><path class="l" d="M24 27l8-9M19 5h10M24 5v5"/>',
    label: 'Playwright Suite Stability',
    stats: [
      ['50%', 'less UI test execution time, and no flaky tests'],
      ['0', 'flaky tests remaining'],
      ['1,100', 'UI and API tests'],
    ],
  },
  {
    slug: 'unified-qa-practices',
    icon: '<circle class="f" cx="18" cy="18" r="13"/><circle class="f" cx="30" cy="18" r="13"/><circle class="f" cx="18" cy="30" r="13"/><circle class="f" cx="30" cy="30" r="13"/>',
    label: 'Unifying QA Across Teams',
    stats: [
      ['70-85%', 'fewer escaped defects, and a unified process for 4 teams'],
      ['4', 'Scrum teams, one process'],
      ['10', 'testers led'],
    ],
  },
  {
    slug: 'automation-50-to-2200',
    icon: '<rect class="f" x="7" y="33" width="8" height="9" rx="2"/><rect class="f" x="20" y="24" width="8" height="18" rx="2"/><rect class="f" x="33" y="14" width="8" height="28" rx="2"/><path class="l" d="M7 22L20 11l6 4L39 5M32 5h7v7"/>',
    label: 'Modernizing Test Automation',
    stats: [
      ['2,200', 'automated tests on an updated framework, up from 50'],
      ['Cypress', 'updated framework'],
      ['Test team', 'owns the automation'],
    ],
  },
  {
    slug: 'ui-library-testing',
    icon: '<rect class="f" x="6" y="6" width="16" height="16" rx="2"/><circle class="f" cx="34" cy="14" r="8.5"/><rect class="f" x="6" y="26" width="16" height="16" rx="2"/><path class="f" d="M34 24l10 10-10 10-10-10z"/>',
    label: 'UI Library Visual Testing',
    stats: [
      ['900+', 'visual tests for a UI element library'],
      ['2', 'test layers: functional and visual'],
      ['Every change', 'checked in CI'],
    ],
  },
];

const icon = (body) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const mailIcon = icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>');
const copyIcon = icon('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>');
const checkIcon = icon('<path d="m5 12 5 5 9-10"/>');
const icons = {
  sun: icon(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  ),
  menu: icon('<path d="M4 6h16M4 12h16M4 18h16"/>'),
};

const esc = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// JSON-LD block for a page head; "<" is escaped so the data cannot close the script tag.
const jsonLdScript = (data) =>
  `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', ...data }, null, 2).replace(/</g, '\\u003c')}\n</script>\n`;
// The Person described on the landing page; other pages point to it by @id.
const author = { '@type': 'Person', '@id': `${cvUrl}#person`, name: 'Mykyta Knysh', url: cvUrl };

// The date a generated page was first committed to this repo, or today for a page not committed yet.
function firstPublished(path) {
  try {
    const dates = execFileSync('git', ['-C', root, 'log', '--diff-filter=A', '--format=%cs', '--', path], { encoding: 'utf8' }).trim();
    if (dates) return dates.split('\n').at(-1);
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

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

// base is the path from the page to docs/portfolio/, and up the path to docs/.
// The avatar and the Portfolio link lead to the portfolio overview; case studies are reached from there, so the header does not list them.
// Shown in full in every page header, so it stays in view while reading a case study.
const headerEmail = 'nknysh@gmail.com';
const headerLinks = [
  { href: 'https://github.com/nknysh/cmc-tests', label: 'Demo project', img: 'github.png', invert: true, rel: 'noopener' },
  { href: 'https://www.linkedin.com/in/mykytaknysh/', label: 'LinkedIn', img: 'linkedin.png', rel: 'me noopener' },
  { href: '', label: 'Resume', img: 'pdf.png', page: 'resume' },
  { href: 'portfolio/', label: 'Portfolio', img: 'portfolio.svg', page: 'portfolio' },
  { href: 'work-history/', label: 'Work history', img: 'work-history.svg', page: 'work-history' },
];

function siteHeader(current, base, up) {
  const links = headerLinks
    .map(
      ({ href, label, img, invert, rel, page }) =>
        `<li><a href="${href.startsWith('http') ? href : `${up}${href}` || './'}"${rel ? ` rel="${rel}"` : ''}${page && current === page ? ' aria-current="page"' : ''} title="${esc(label)}"><img src="${up}images/${img}"${invert ? ' class="invert-dark"' : ''} alt="" width="20" height="20"><span class="label">${esc(label)}</span></a></li>`,
    )
    .join('\n        ');
  return `<header class="site-header">
  <div class="bar">
    <a class="brand" href="${base || './'}" aria-label="Mykyta Knysh, portfolio overview"><img src="${up}images/avatar.jpg" alt="" width="40" height="40"></a>
    <div class="actions">
      <button class="icon-link framed theme-toggle" type="button" aria-label="Switch color theme" title="Switch color theme">${icons.sun}</button>
      <button class="icon-link menu-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu">${icons.menu}</button>
    </div>
    <nav id="menu" class="menu" aria-label="Links">
      <ul>
        <li class="menu-email"><a href="mailto:${headerEmail}" title="Email ${headerEmail}">${mailIcon}<span class="label">${headerEmail}</span></a></li>
        ${links}
      </ul>
    </nav>
  </div>
</header>`;
}

// A page title with a link beside it to download the page's PDF (a file in docs/); indent is the title's own indentation.
function titleRow(name, subject, pdf, indent, label = 'Download PDF') {
  return `<div class="title-row">
${indent}  <h1>${esc(name)} <span class="sep">—</span> <em>${esc(subject)}</em></h1>
${indent}  <a class="title-pdf" href="../${pdf}" download><img src="../images/pdf.png" alt="" width="24" height="24">${esc(label)}</a>
${indent}</div>`;
}

// "2026-11-03" -> "3 November 2026", for the visible last-updated line.
const longDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${months[month - 1]} ${year}`;
};

// updated is the same ISO date the page's structured data gives as dateModified.
// narrow lines the footer up with case pages, whose content sits in the narrower .wrap.narrow column.
function layout({ title, description, url, current, body, updated, narrow = false, base = '', up = '../', type = 'article', head = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Mykyta Knysh">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${up}images/favicon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontsUrl}">
<link rel="stylesheet" href="${base}portfolio.css">
<script src="${base}menu.js"></script>
${head}</head>
<body>
<a class="skip" href="#content">Skip to content</a>
${siteHeader(current, base, up)}
<main id="content">
${body}
</main>
${updated ? `<footer class="wrap${narrow ? ' narrow' : ''} page-updated"><p>Last updated <time datetime="${updated}">${longDate(updated)}</time></p></footer>\n` : ''}</body>
</html>
`;
}

function overviewPage(doc) {
  const [name, subject] = doc.title.split(' — ');
  const email = doc.contacts.find(({ label }) => label === 'Email').value;
  const leading = trackRecordLead.map((slug) => doc.items.find((entry) => entry.slug === slug));
  const stats = [...leading, ...doc.items.filter((entry) => !leading.includes(entry))]
    .map(
      (entry) =>
        `<li data-case="${entry.caseNo}"><a href="${entry.slug}.html"><span class="stat-value">${esc(entry.stats[0][0])}</span><span class="stat-label">${esc(entry.stats[0][1])}</span></a></li>`,
    )
    .join('\n        ');
  const cards = doc.items
    .map(
      (entry) => `      <li><a class="card" href="${entry.slug}.html">
        <svg class="card-icon" viewBox="0 0 48 48" aria-hidden="true">${entry.icon}</svg>
        <span class="card-title">${esc(entry.headline)}</span>
        <span class="tags">${entry.tech
          .map((tool) => `<span>${esc(tool)}</span>`)
          .join('')}</span>
        <span class="read-more">Read case study <span aria-hidden="true">→</span></span>
      </a></li>`,
    )
    .join('\n');
  const description = 'Case studies from Mykyta Knysh: building QA functions, test strategies and test automation at scale.';
  const head = jsonLdScript({
    '@type': 'CollectionPage',
    '@id': siteUrl,
    url: siteUrl,
    name: 'Portfolio | Mykyta Knysh',
    description,
    author,
    dateModified: doc.modified,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: doc.items.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}${entry.slug}.html`,
        name: entry.headline,
      })),
    },
  });
  return layout({
    title: 'Portfolio | Mykyta Knysh',
    description,
    head,
    updated: doc.modified,
    url: siteUrl,
    current: 'portfolio',
    body: `  <section class="hero">
    <div class="wrap">
      <div class="intro">
        <div>
          ${titleRow(name, subject, 'Mykyta_Knysh_Portfolio.pdf', '          ', 'Download case studies in PDF')}
          <p class="lead">14 years in test automation and QA leadership across fintech and SaaS. I help teams plan testing around product risk, build automation they can trust in CI/CD, and deliver measurable results.</p>
        </div>
        <div class="availability">
          <p class="availability-title">Available for contract work</p>
          <p class="availability-note">I’d be happy to hear about your project and discuss how I can help your team. Drop me a line.</p>
          <div class="email-actions">
            <a class="button" href="${esc(contactHref(email))}" aria-label="Email ${esc(email)}">${mailIcon}${esc(email)}</a>
            <button class="copy-email" type="button" data-copy="${esc(email)}" title="Copy email address" aria-label="Copy email address" aria-live="polite">${copyIcon}${checkIcon}</button>
          </div>
        </div>
      </div>
      <p class="kicker track"><span class="pip"></span>Track record</p>
      <ul class="stats-row">
        ${stats}
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

  // Published when the page was first committed; modified when portfolio.md last changed, never before publication.
  const published = firstPublished(resolve(outDir, `${entry.slug}.html`));
  const modified = doc.modified && doc.modified > published ? doc.modified : published;
  const url = `${siteUrl}${entry.slug}.html`;
  const head = jsonLdScript({
    '@type': 'Article',
    '@id': url,
    url,
    mainEntityOfPage: url,
    headline: entry.headline,
    description: `${entry.headline}.`,
    author,
    datePublished: published,
    dateModified: modified,
    keywords: entry.tech,
    isPartOf: { '@type': 'CollectionPage', '@id': siteUrl },
  });
  return layout({
    title: `${entry.label} | Mykyta Knysh`,
    head,
    updated: modified,
    narrow: true,
    description: `${entry.headline}.`,
    url: `${siteUrl}${entry.slug}.html`,
    current: entry.slug,
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

// Work history: resume-detailed.md rendered with its text unchanged.
// Blocks are paragraphs (soft line breaks kept), bullet lists, and "Tech stack: a, b" style tag lines inside a job.
const tagLine = /^(Tech stack|Tools|Tools and languages|Languages, tools and technologies): (.+)$/;
const periodLine = /^[A-Z][a-z]+ \d{4} - (?:Present|[A-Z][a-z]+ \d{4})\b/;
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const isoMonth = (text) => {
  const [month, year] = text.split(' ');
  return `${year}-${String(months.indexOf(month) + 1).padStart(2, '0')}`;
};
// "April 2025 - Present (1 year 6 months) · Kyiv" -> start, end (null while current) and the text after the range.
function parsePeriod(period) {
  const [, from, to, rest] = period.match(/^([A-Z][a-z]+ \d{4}) - (Present|[A-Z][a-z]+ \d{4})(.*)$/);
  return { from, to, rest, start: isoMonth(from), end: to === 'Present' ? null : isoMonth(to) };
}
const companyOf = (job) => job.heading.split(' — ')[0].replace(/ \(.+\)$/, '');
const roleOf = (job) => job.heading.split(' — ').slice(1).join(' — ') || job.heading;

function parseHistory(markdown) {
  const doc = { name: '', title: '', contacts: [], sections: [] };
  let section = null;
  let group = null;
  let job = null;
  let block = null;

  markdown.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    const fail = () => {
      throw new Error(`resume-detailed.md:${index + 1}: unexpected line: ${line}`);
    };
    const container = () => job ?? section;
    const add = (type) => {
      block = { type, lines: [] };
      container().blocks.push(block);
    };
    if (!line) {
      block = null;
      return;
    }

    let match;
    if ((match = line.match(/^# (.+)$/))) {
      doc.name = match[1];
    } else if ((match = line.match(/^## (.+)$/))) {
      section = { title: match[1], id: slugify(match[1]), blocks: [], jobs: [] };
      doc.sections.push(section);
      group = job = block = null;
    } else if ((match = line.match(/^(###|####) (.+)$/))) {
      if (section?.title !== 'Experience') fail();
      const sub = match[1] === '####';
      if (sub && !group) fail();
      job = { heading: match[2], period: '', blocks: [], roles: [] };
      block = null;
      if (sub) {
        group.roles.push(job);
      } else {
        section.jobs.push(job);
        group = job;
      }
    } else if (!section) {
      if ((match = line.match(/^- (.+?): (.+)$/))) doc.contacts.push({ label: match[1], value: match[2] });
      else if (!doc.title) doc.title = line;
      else fail();
    } else if (job && !job.period && !job.blocks.length && periodLine.test(line)) {
      job.period = line;
    } else if (job && (match = line.match(tagLine))) {
      job.blocks.push({ type: 'tags', label: match[1], items: match[2].replace(/\.$/, '').split(/, (?![^(]*\))/) });
      block = null;
    } else if ((match = line.match(/^- (.+)$/))) {
      if (block?.type !== 'list') add('list');
      block.lines.push(match[1]);
    } else {
      if (block?.type !== 'p') add('p');
      block.lines.push(line);
    }
  });

  if (!doc.name || !doc.title || !doc.sections.some(({ title }) => title === 'Experience')) {
    throw new Error('resume-detailed.md: missing the name, the title line or the Experience section.');
  }
  return doc;
}

// Escapes text, then turns **bold** into <strong>.
const inline = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function renderBlocks(blocks, indent) {
  return blocks
    .map((block) => {
      if (block.type === 'p') return `<p>${block.lines.map(inline).join('<br>\n')}</p>`;
      if (block.type === 'list') {
        return `<ul class="steps">\n${block.lines.map((item) => `${indent}  <li>${inline(item)}</li>`).join('\n')}\n${indent}</ul>`;
      }
      return `<div class="job-tags">
${indent}  <p class="kicker">${esc(block.label)}</p>
${indent}  <ul class="tags">${block.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
${indent}</div>`;
    })
    .map((html) => `${indent}${html}`)
    .join('\n');
}

// Each job gets an id to link to, and its dates are wrapped in <time> without changing the text.
function renderPeriod(period) {
  const { from, to, rest, start, end } = parsePeriod(period);
  const toHtml = end ? `<time datetime="${end}">${esc(to)}</time>` : esc(to);
  return `<time datetime="${start}">${esc(from)}</time> - ${toHtml}${esc(rest)}`;
}

function renderJob(job, level, indent, idPrefix = '') {
  const id = slugify(`${idPrefix} ${idPrefix ? job.heading : companyOf(job)}`);
  const roles = job.roles.map((role) => renderJob(role, level + 1, `${indent}  `, companyOf(job))).join('\n');
  return `${indent}<article class="job${job.roles.length ? ' job-group' : ''}" id="${id}">
${indent}  <h${level}>${esc(job.heading)}</h${level}>
${job.period ? `${indent}  <p class="kicker period">${renderPeriod(job.period)}</p>\n` : ''}${job.blocks.length ? `${renderBlocks(job.blocks, `${indent}  `)}\n` : ''}${roles ? `${roles}\n` : ''}${indent}</article>`;
}

// A short intro composed from the Summary in resume-detailed.md; it is not in the source, so keep it in line with the Summary by hand.
// It names the person, so it still makes sense when an AI answer quotes it on its own.
const historyIntro =
  'Mykyta Knysh is a QA professional with 26 years of IT experience, including 14 years in test automation, quality assurance and team leadership, on enterprise systems across fintech, SaaS and complex business applications. ISTQB Certified Test Manager who has built and led QA teams and integrates AI tools into testing workflows.';

// Only the Experience section is published: companies are h2, and roles grouped under a company are h3.
function historyPage(history) {
  const experience = history.sections.find(({ title }) => title === 'Experience');
  // Every role as a schema.org Role: current ones under worksFor, past ones under alumniOf.
  const roles = experience.jobs.flatMap((job) =>
    (job.roles.length ? job.roles : [job]).map((role) => ({ company: companyOf(job), name: roleOf(role), ...parsePeriod(role.period) })),
  );
  const asRole = (property, role) => ({
    '@type': 'OrganizationRole',
    roleName: role.name,
    startDate: role.start,
    ...(role.end ? { endDate: role.end } : {}),
    [property]: { '@type': 'Organization', name: role.company },
  });
  const person = {
    '@type': 'Person',
    '@id': `${cvUrl}#person`,
    name: history.name,
    url: cvUrl,
    description: historyIntro,
    sameAs: ['https://www.linkedin.com/in/mykytaknysh/'],
    worksFor: roles.filter((role) => !role.end).map((role) => asRole('worksFor', role)),
    alumniOf: roles.filter((role) => role.end).map((role) => asRole('alumniOf', role)),
  };
  const page = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: historyUrl,
    name: `Work history | ${history.name}`,
    ...(history.modified ? { dateModified: history.modified } : {}),
    mainEntity: person,
  };
  const jsonLd = JSON.stringify(page, null, 2).replace(/</g, '\\u003c');

  return layout({
    title: `Work history | ${history.name}`,
    updated: history.modified,
    description: `Work history of ${history.name}: roles, dates, achievements and tech stacks across test automation, QA leadership and earlier IT roles.`,
    url: historyUrl,
    current: 'work-history',
    base: '../portfolio/',
    type: 'profile',
    head: `<link rel="alternate" type="text/markdown" href="${historyUrl}index.md">\n<script type="application/ld+json">\n${jsonLd}\n</script>\n`,
    body: `  <section class="hero history-hero">
    <div class="wrap">
      ${titleRow(history.name, 'Work history', 'Mykyta_Knysh_Resume_Detailed.pdf', '      ', 'Download resume in PDF')}
      <p class="lead">${esc(historyIntro)}</p>
    </div>
  </section>
  <div class="wrap history">
${experience.jobs.map((job) => renderJob(job, 2, '    ')).join('\n')}
  </div>`,
  });
}

// The landing page: the documents to download.
// LinkedIn, the demo project, the portfolio and the work history are reached from the header, so they are not repeated here.
const cvRole = 'Lead Test Automation Engineer, AI-first, ISTQB Certified Test Manager';
const cvDocs = [
  { href: 'Mykyta_Knysh_Resume.pdf', title: 'Resume', note: 'Most recent positions' },
  { href: 'Mykyta_Knysh_Resume_Detailed.pdf', title: 'Detailed resume', note: 'Full work history' },
  { href: 'Mykyta_Knysh_Portfolio.pdf', title: 'Portfolio', note: 'All case studies' },
];

function cvPage(modified) {
  const description =
    'Mykyta Knysh: Lead Test Automation Engineer, AI-first, ISTQB Certified Test Manager. 14 years building and scaling QA across fintech and SaaS with Playwright, Cypress, Selenium and CI/CD. Download resume and portfolio.';
  const jsonLd = jsonLdScript({
    '@type': 'ProfilePage',
    url: cvUrl,
    name: 'Mykyta Knysh – Resume & Portfolio',
    dateModified: modified,
    mainEntity: {
      ...author,
      givenName: 'Mykyta',
      familyName: 'Knysh',
      jobTitle: 'Lead Test Automation Engineer',
      description:
        'Lead Test Automation Engineer, AI-first, ISTQB Certified Test Manager with 14 years of experience building and scaling QA initiatives across enterprise fintech, SaaS, and complex microservice systems.',
      sameAs: ['https://www.linkedin.com/in/mykytaknysh/'],
      hasCredential: {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'certification',
        name: 'ISTQB Certified Test Manager',
      },
      memberOf: { '@type': 'Organization', name: 'USQB', roleName: 'Board Member and Lead Expert' },
      knowsAbout: [
        'Test automation', 'Test strategy', 'Quality assurance', 'Playwright', 'Cypress',
        'Nightwatch.js', 'Selenium', 'REST API testing', 'GraphQL', 'gRPC',
        'Mobile testing', 'iOS', 'Android', 'CI/CD', 'GitHub Actions', 'GitLab CI',
        'AWS', 'SQL', 'DynamoDB', 'MongoDB', 'AI-assisted testing', 'Claude Code', 'GitHub Copilot',
      ],
    },
  });
  const head = `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="me" href="https://www.linkedin.com/in/mykytaknysh/">
<meta property="og:site_name" content="Mykyta Knysh – Resume &amp; Portfolio">
<meta property="profile:first_name" content="Mykyta">
<meta property="profile:last_name" content="Knysh">
${jsonLd}`;
  const cards = cvDocs
    .map(
      ({ href, title, note }) => `      <li><a class="card doc-card" href="${href}" download>
        <img class="card-icon" src="images/pdf.png" alt="" width="48" height="48">
        <span class="card-title">${esc(title)}</span>
        <span class="doc-note">${esc(note)}</span>
        <span class="read-more">Download PDF <span aria-hidden="true">↓</span></span>
      </a></li>`,
    )
    .join('\n');
  return layout({
    title: 'Mykyta Knysh – Lead Test Automation Engineer | Resume & Portfolio',
    description,
    head,
    updated: modified,
    url: cvUrl,
    current: 'resume',
    base: 'portfolio/',
    up: '',
    type: 'profile',
    body: `  <section class="hero cv-hero">
    <div class="wrap">
      <h1>Mykyta Knysh <span class="sep">—</span> <em>Resume</em></h1>
      <p class="lead">${esc(cvRole)}</p>
    </div>
  </section>
  <section class="work" aria-labelledby="docs">
    <div class="wrap">
      <h2 id="docs">Resume and <em>portfolio</em></h2>
      <ul class="cards doc-cards">
${cards}
      </ul>
    </div>
  </section>`,
  });
}

const doc = { ...parse(readFileSync(sourcePath, 'utf8')), modified: lastModified(sourcePath) };
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'index.html'), overviewPage(doc));
doc.items.forEach((entry, index) => {
  writeFileSync(resolve(outDir, `${entry.slug}.html`), casePage(doc, index));
});
console.log(`Wrote ${doc.items.length + 1} pages to docs/portfolio/ from ${sourcePath}`);

// The date the source last changed: its last commit in the resume repo, or the file date if git has none.
function lastModified(path) {
  try {
    const date = execFileSync('git', ['-C', dirname(path), 'log', '-1', '--format=%cs', '--', path], { encoding: 'utf8' }).trim();
    if (date) return date;
  } catch {}
  return statSync(path).mtime.toISOString().slice(0, 10);
}

// A Markdown copy of the page for agents: the Experience section of the source, one heading level up.
function historyMarkdown(markdown, history) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === '## Experience');
  const end = lines.findIndex((line, index) => index > start && /^## /.test(line));
  const body = lines.slice(start + 1, end === -1 ? undefined : end).map((line) => line.replace(/^(#{3,4}) /, (_, hashes) => `${hashes.slice(1)} `));
  return `# ${history.name} — Work history\n\n${historyIntro}\n\nWeb page: ${historyUrl}\n${body.join('\n').trimEnd()}\n`;
}

const historySource = readFileSync(historyPath, 'utf8');
const history = { ...parseHistory(historySource), modified: lastModified(historyPath) };
mkdirSync(historyDir, { recursive: true });
writeFileSync(resolve(historyDir, 'index.html'), historyPage(history));
writeFileSync(resolve(historyDir, 'index.md'), historyMarkdown(historySource, history));
console.log(`Wrote docs/work-history/index.html and index.md from ${historyPath}`);

// The landing page changes when its documents do: the latest commit of any of them.
const cvModified = cvDocs
  .map(({ href }) => lastModified(resolve(root, 'docs', href)))
  .sort()
  .at(-1);
writeFileSync(resolve(root, 'docs/index.html'), cvPage(cvModified));
console.log('Wrote docs/index.html');
