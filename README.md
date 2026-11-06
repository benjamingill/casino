# Casino

Game simulators in one app: a blackjack basic-strategy trainer, with a slot machine on the way.

## Development

```sh
npm install
npm run dev        # dev server
npm test           # unit tests
npm run typecheck
npm run lint       # Biome: lint, formatting, import order
npm run lint:fix   # apply safe fixes and formatting
npm run build
```

## CI and deploy

Pull requests run lint, typecheck, tests and a build. Pushes to `main` run the same checks and deploy to GitHub Pages.

## License

MIT
