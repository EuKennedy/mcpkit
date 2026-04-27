# contributing

short version: open an issue first if it's a non-trivial change. tests come
with the change, not after. keep PRs focused.

## local setup

```bash
git clone https://github.com/EuKennedy/mcpkit.git
cd mcpkit
npm install
npm test
```

## running the CLI from source

```bash
node --experimental-strip-types ./src/cli/index.ts create /tmp/scratch
# or after build:
npm run build
node ./dist/cli.js create /tmp/scratch
```

## what makes a good PR

- one concern per PR. it's fine to split.
- tests for new behavior, regression test for fixed bugs.
- no dependency added casually — say what's gained vs the install footprint.
- README updated when public surface changes.
- commit messages can be casual but should explain the *why* if it's not
  obvious from the diff.

## release notes

every PR that ships user-visible behavior updates `CHANGELOG.md` under
`[unreleased]`. release process bumps the version and rolls that section.
