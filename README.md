# cobt_pages

Encrypted GitHub Pages viewer for ConnectBetween.

## Security rule

This repository is public. Do not commit plaintext project notes, Markdown source documents, passwords, API keys, credentials, private links, or other sensitive material here.

The intended public contents are only:

- `index.html`
- `app.js`
- `style.css`
- `robots.txt`
- encrypted `vault.json`

The plaintext source remains in the private `connectbetween` repository. The browser decrypts `vault.json` locally after the user enters the passphrase.
