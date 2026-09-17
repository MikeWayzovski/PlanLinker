# SheetHop (PlanLinker)

Interactive 2D PDF viewer for Trimble Connect. SheetHop turns drawing codes on an
overview sheet (`DET-01`, `DETAIL-12`, `D-3`) into clickable hotspots, then looks up
the matching detail PDF in the active project.

It runs **embedded in Trimble Connect** (Workspace API token) and **standalone**
(Trimble ID PKCE), using the same dual-token bridge as SitePass and TC Cross Over.

## What it does

1. Open a PDF from the current Trimble Connect project.
2. PDF.js renders the page and reads the text layer.
3. Text that matches the configured drawing-code regex becomes a hotspot.
4. Clicking a hotspot searches the project (`GET /search?query=…&projectId=…`), then
   fetches a temporary download URL (`GET /files/{fileId}/downloadurl`).
5. The detail sheet opens and the previous sheet is pushed onto a back stack.

Settings let you change the matching regex and a fallback folder name used when
several files match the same code.

## Tech

React 18 + Vite, Trimble Modus Bootstrap, `pdfjs-dist`, Trimble Connect Core REST
API 2.1 (with 2.0 fallbacks), and `trimble-connect-project-workspace-api`.

```
src/
  api/           Trimble Connect REST wrappers (`trimbleApi.js`) and Trimble ID client
  components/    Viewer/, Settings/, Auth/, Modus/
  hooks/         usePDF, useDrawingSearch, useSettings, useToast
  utils/         workspaceBridge, token resolution, drawing-code matching, logger
```

## Deploying

This is a static Vite SPA. `vercel.json` rewrites every path to `index.html` so
`/callback` and `/logout-callback` work with Trimble ID.

Set the `VITE_*` values from `.env.example` in the Vercel project. Register
`https://<your-host>/manifest.json` as a Trimble Connect extension.

Embedded mode does not need Trimble ID. Standalone sign-in only works on the
redirect URLs registered with the Trimble ID application.

Do not rely on `npm run dev` for Trimble Connect testing: the Workspace iframe
token and Vercel `VITE_*` values are not present on localhost.
