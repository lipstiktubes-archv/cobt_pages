# cobt_pages

Encrypted GitHub Pages viewer for ConnectBetween.

## Security rule

This repository is public. Do not commit plaintext project notes, Markdown source documents, passwords, credentials, private links, or other sensitive material here.

The intended public contents are only:

- `index.html`
- `app.js`
- `style.css`
- `robots.txt`
- `recipient-public-key.json`
- encrypted `vault.json`

The plaintext source remains in the private `connectbetween` repository.

## Secret-link model

The `#key=...` fragment in the user's secret URL is the private decryption key. It is not stored in this repository.

`recipient-public-key.json` is intentionally public. New vaults can be encrypted using that public key without knowing the user's secret URL/private key. Therefore the same secret URL can continue to work across vault updates.

Anyone who obtains the complete secret URL should be treated as able to read the encrypted documents. Do not post the complete secret URL publicly.
