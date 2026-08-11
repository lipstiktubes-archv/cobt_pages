# cobt_pages

Encrypted GitHub Pages viewer for ConnectBetween.

## Security rule

This repository is public. Do not commit plaintext project notes, Markdown source documents, passwords, API keys, credentials, secret-link keys, or other sensitive material here.

The intended public contents are only:

- `index.html`
- `app.js`
- `style.css`
- `robots.txt`
- encrypted `vault.json`

The plaintext source remains in the private `connectbetween` repository.

## Secret-link access

The viewer uses a URL fragment in this form:

`https://<account>.github.io/cobt_pages/#key=<43-character-base64url-key>`

`vault.json` is encrypted with AES-256-GCM. The 256-bit decryption key is carried only in the secret URL fragment and is not committed to this public repository.

Anyone who obtains the complete secret URL should be treated as able to read the encrypted documents. Do not post the complete secret URL publicly.
