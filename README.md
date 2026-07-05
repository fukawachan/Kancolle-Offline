# KanColle Local Offline API

This project is an early server-side implementation for running the Kantai Collection HTML5 browser client locally. The TypeScript code under `src/` implements local KCSAPI-compatible behavior, serves cached static assets, and stores local save data in SQLite.

The browser game cache is not included in this repository. You need to download the cache archive manually from [tsunkit KCCP](https://tsunkit.net/kccp/), then extract it into `./cache`. The cache contains the browser client, art, music, voices, and some client-side logic used by the local server.

## Current Status

The project currently supports the basic flow for:

- Fleet organization
- Remodel and equipment management
- Sorties
- Practice
- Expeditions
- Factory actions, including construction, development, scrapping, and equipment improvement
- Quests
- Marriage

These features are still incomplete and may differ from the official game behavior:

- Combined fleet support
- Full simulation parity with official battle formulas
- Complete sortie maps
- Event map recreation

This project is moving quickly and may contain many unknown bugs. Issue reports are welcome, especially when they include reproduction steps, the expected behavior, the actual behavior, and any relevant logs.

## Requirements

- Node.js 24.x
- npm
- A manually prepared `cache/` directory from [tsunkit KCCP](https://tsunkit.net/kccp/)

## Setup

Install dependencies:

```sh
npm install
```

Download the browser game cache from [tsunkit KCCP](https://tsunkit.net/kccp/), then extract it so the repository has a `cache/` directory like this:

```text
cache/
  kcs/
  kcs2/
  kcscontents/
```

The repository does not redistribute official game assets. Keep `cache/` local and do not commit it.

## Running the Server

Start the local server:

```sh
npm start
```

By default, the server listens at:

```text
http://127.0.0.1:3020
```

Open that URL in a browser. On first launch, select the local world in the launcher, then the cached client should load through the local server.

Useful environment variables:

- `PORT`: server port, default `3020`
- `HOST`: server host, default `127.0.0.1`
- `KANCOLLE_CACHE_DIR`: path to the main cache directory, default `cache`
- `KANCOLLE_EXTRA_CACHE_DIR`: path to extra local cache overrides, default `cache-extra`
- `KANCOLLE_DB_PATH`: SQLite save path, default `.local/save.sqlite`
- `KANCOLLE_RESPONSE_FORMAT`: API response format, either `svdata` or `json`; default `svdata`

Example:

```sh
PORT=3021 KANCOLLE_RESPONSE_FORMAT=json npm start
```

## Development

Run the full test suite:

```sh
npm test
```

Run the TypeScript checker:

```sh
npm run typecheck
```

When improving server behavior, prefer changes under `src/`. The cached client under `cache/` is useful for understanding request paths, payload shapes, and client expectations, but it should not be edited unless a change explicitly requires a local client patch.

For protocol investigation notes, read `Agent.md`. It explains how to search the obfuscated client cache without spending time or context on unrelated code.

Please do not commit local runtime or dependency directories such as:

- `cache/`
- `.local/`
- `node_modules/`

## Contributing

Contributions are welcome. Good improvements include new endpoint coverage, better compatibility with the cached client, battle formula fixes, map data improvements, and focused bug reports.

Before opening a pull request or sharing a patch, please run:

```sh
npm test
npm run typecheck
```

If you find a bug, please open an issue with enough detail to reproduce it. Screenshots, unknown API log entries from `.local/unknown-api.jsonl`, save-state context, and exact steps are all helpful.
