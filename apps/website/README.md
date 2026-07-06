# ETFVoid Website

React Router SSR website for ETFVoid, built inside the repository's Vite+ monorepo.

## Development

Install dependencies from the repository root:

```bash
vp install
```

Start the website dev server:

```bash
vp run website#dev
```

## Building for Production

Create a production build:

```bash
vp run website#build
```

The output is written to `apps/website/build`.

## Deployment

### Docker Deployment

Build from the repository root so the Dockerfile can use the workspace lockfile and Vite+ configuration:

```bash
docker build -f apps/website/Dockerfile -t etf-website .

docker run --rm -p 3000:3000 etf-website
```

The container runs `react-router-serve ./build/server/index.js` from `apps/website`.

### DIY Deployment

If you're deploying as a Node application, build with Vite+ first and deploy the generated website build output together with the workspace package manifests and production dependencies.

```text
apps/website/build/
├── client/    # Static assets
└── server/    # Server-side code
```

## Styling

This app uses Tailwind CSS and shared local UI components.
