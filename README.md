# CV

Latest resume and portfolio, published with GitHub Pages.

Page: https://nknysh.github.io/cv/

| Document | Permanent link |
| --- | --- |
| Resume | https://nknysh.github.io/cv/Mykyta_Knysh_Resume.pdf |
| Detailed resume | https://nknysh.github.io/cv/Mykyta_Knysh_Resume_Detailed.pdf |
| Portfolio | https://nknysh.github.io/cv/Mykyta_Knysh_Portfolio.pdf |

Online portfolio: https://nknysh.github.io/cv/portfolio/

## Updating

Overwrite the file in `docs/`, commit, and push to `main`. Pages redeploys automatically.

The online portfolio in `docs/portfolio/` is generated from `../resume/data/portfolio.md`, and the work history page in `docs/work-history/` from `../resume/data/resume-detailed.md`. After either file changes, run `node scripts/build-portfolio.mjs`, then commit and push. Edit the Markdown, not the generated HTML. Adding or removing an item also needs a matching change to `pages` in the script.

The landing page `docs/index.html` is edited by hand: when you change it, update the date in its "Last updated" footer and the matching `dateModified` in its JSON-LD. The generated pages take their dates from the source files' last commits.

Visit stats (private, cookieless) are at https://nknysh.goatcounter.com. Every page loads the counter through `layout()` in the build script, and `menu.js` counts PDF link clicks as `download-*` events.

**Never rename the files or the repository** — the links above depend on them.
