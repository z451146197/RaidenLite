# Preview pipeline optimization

See `.github/workflows/mobile-preview.yml` for the active mobile preview workflow. The workflow is optimized to avoid unnecessary global npm linking and project npm-cache restore overhead while keeping the existing Cocos CLI cache and GitHub Pages deployment path.
