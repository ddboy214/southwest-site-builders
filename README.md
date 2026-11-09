# Southwest Site Builders

A responsive static website for Southwest Site Builders, Devante Allen's Glendale, Arizona web-design service. The site includes a home page, a custom 404 page, and six multi-page portfolio concepts for local home-service businesses.

## Preview locally

No build step or package install is required. From the repository root, run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Deploy with GitHub Pages

The repository is configured for GitHub Pages using **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` checks the site entry points, uploads the repository root, and deploys it. Pushes to `main` deploy automatically; the workflow can also be started manually from the Actions tab.

Published site: <https://ddboy214.github.io/southwest-site-builders/>

The contact forms are static-site friendly: they prepare a prefilled email in the visitor's email app. They do not transmit or store form submissions on the website. Portfolio business sites are concept demonstrations, not live business sites.
