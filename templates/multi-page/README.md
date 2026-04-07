# Multi-Page

Multi-page app with client-side routing via [wouter](https://github.com/molefrog/wouter).

```bash
npm install
jxr dev
```

Routes:
- `/` — Home with interactive counter
- `/about` — About page
- `*` — 404 fallback

Add pages by creating files in `src/pages/` and adding a `<Route>` in `src/App.tsx`.
