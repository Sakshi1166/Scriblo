# Scriblo

Scriblo is a temporary, real-time collaborative whiteboard for teams that need a shared canvas without creating a permanent workspace. A user creates a room, shares its link, and collaborates with other participants in a tldraw-powered canvas. Each room has a time-to-live (TTL), and the room can also be manually burned before its timer expires.

The project is designed for quick planning sessions, incident response, technical discussions, workshops, interviews, design reviews, and other situations where a temporary shared canvas is more useful than a long-lived document.

## Highlights

- **Real-time collaborative canvas** powered by tldraw and Supabase Realtime.
- **Temporary rooms** with 15-minute, 1-hour, 6-hour, and 24-hour TTL options.
- **Shareable room URLs** using short generated room identifiers.
- **Anonymous session identity** with a generated participant name and cursor color.
- **Live presence and remote cursors** for participants in the same room.
- **Canvas persistence** through debounced snapshots stored in PostgreSQL JSON.
- **Image uploads** from the canvas to the Supabase Storage `canvas-assets` bucket.
- **Optional room passcodes** for an additional client-side access gate.
- **Manual burn flow** that broadcasts a room-destruction event and deletes the room record through Supabase.
- **Expiry and self-destruct states** with countdown, warning, and terminated-room views.
- **Responsive black-and-yellow interface** with a glass-style room creation card.
- **Accessible interaction states** including focus-visible styling and reduced-motion support.

## How it works

### 1. Create a room

From the landing page, a user can:

1. Enter an optional room title.
2. Select a self-destruct window.
3. Optionally add a passcode.
4. Generate the room.

The client creates a short room ID and inserts a room record into Supabase with its title, expiration timestamp, optional passcode, creator ID, and initial empty canvas state.

### 2. Collaborate

Participants open the generated `/room/:roomId` URL. The room page:

- Loads the room record.
- Displays a countdown timer.
- Shows connected participants.
- Synchronizes canvas changes through Supabase Realtime broadcasts.
- Broadcasts cursor positions and participant identity.
- Persists canvas snapshots after editing pauses.
- Allows images to be uploaded to Supabase Storage.

### 3. Expire or burn the room

When the countdown reaches zero, the client displays the self-destruct flow and terminated-room state. A participant can also use **Burn Now** to broadcast an emergency burn event and request deletion of the room record.

The current client-side timer and burn flow are UX mechanisms. Server-side database policies and scheduled cleanup are still required for production-grade expiration and deletion guarantees.

## Technology stack

- React 19
- TypeScript
- Vite
- React Router
- Framer Motion
- tldraw
- Supabase JavaScript client
  - Anonymous Auth
  - PostgreSQL
  - Realtime
  - Storage
- Tailwind CSS
- Lucide React
- nanoid
- canvas-confetti

## Project structure

```text
.
├── index.html
├── package.json
├── vite.config.ts
├── src
│   ├── components
│   │   ├── canvas
│   │   │   ├── DeadDropCanvas.tsx
│   │   │   └── RemoteCursors.tsx
│   │   ├── hud
│   │   │   ├── BurnModal.tsx
│   │   │   └── CountdownHUD.tsx
│   │   └── ui
│   │       ├── GlitchOverlay.tsx
│   │       └── TerminatedView.tsx
│   ├── context
│   │   └── AuthContext.tsx
│   ├── lib
│   │   ├── audio.ts
│   │   ├── supabase.ts
│   │   └── types.ts
│   ├── pages
│   │   ├── Home.tsx
│   │   └── Room.tsx
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
└── .env.example
```

## Local development

### Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project

### Install dependencies

```bash
npm install
```

### Configure Supabase

Create a local environment file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set the following values in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
VITE_TLDRAW_LICENSE_KEY=your-tldraw-license-key
```

The `.env` file is ignored by Git. Never commit it or place a service-role key in a Vite environment variable. Obtain a tldraw license key from tldraw and configure it in Vercel for Production, Preview, and Development. Without it, tldraw intentionally blanks the editor after five seconds in production.

### Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

If `.env` is missing, Scriblo still renders its landing page, but room creation, authentication, collaboration, and uploads remain unavailable until Supabase is configured.

## Supabase setup

The repository contains the frontend client and TypeScript data contracts, but it does not currently contain versioned Supabase migrations. Configure the following resources in the Supabase project before using the application:

### `public.rooms` table

The frontend expects a table with these columns:

| Column | Suggested type | Purpose |
| --- | --- | --- |
| `id` | `text` or `varchar` | Short room identifier |
| `title` | `text` | Room display title |
| `created_at` | `timestamptz` | Creation timestamp |
| `created_by` | `uuid`, nullable | Anonymous/authenticated creator ID |
| `expires_at` | `timestamptz` | Room expiration timestamp |
| `passcode` | `text`, nullable | Optional room passcode |
| `canvas_state` | `jsonb` | Serialized tldraw snapshot |

The client types also describe a `purge_expired_rooms` database function. If server-side cleanup is implemented, use that function or an equivalent trusted job to remove expired rooms and related storage assets.

### Authentication

Enable anonymous sign-ins if the zero-signup workflow is required. The frontend attempts to reuse an existing session and otherwise calls `signInAnonymously()`.

### Row Level Security

Enable RLS and design policies for:

- Room creation.
- Room reads.
- Room canvas updates.
- Authorized room deletion.
- Expired-room access restrictions.

Do not rely on the browser alone to enforce creator-only deletion or expiration rules.

### Realtime

Configure Realtime for the collaboration channels used by the application. Scriblo uses room-specific channels to broadcast:

- Canvas stroke changes.
- Cursor positions.
- Room burn events.

### Storage

Create a `canvas-assets` bucket and add policies for the intended upload and read behavior. Review file size, MIME type, ownership, and expired-asset cleanup requirements before production deployment.

## Available scripts

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run lint     # Run Oxlint
npm run preview  # Preview the production build locally
```

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing page and room creation form |
| `/room/:roomId` | Collaborative room and tldraw canvas |
| Any other path | Redirects to `/` |

## Security and privacy considerations

Scriblo is a temporary collaboration prototype and should not be described as providing guaranteed cryptographic deletion without additional backend work.

- `VITE_SUPABASE_ANON_KEY` or a publishable key is intentionally safe to expose in browser code, but it must be protected by correct RLS, Storage, and Realtime policies.
- Never expose a Supabase service-role key in frontend code, `.env.example`, Git, or deployment client variables.
- Room passcodes are currently stored and compared through the client-side room flow. They should not be treated as strong authentication or encryption.
- The browser countdown is not a server-side deletion guarantee.
- The manual burn request currently originates from the client. Enforce creator authorization and deletion rules with RLS or a trusted Edge Function.
- Expired database rows and uploaded assets require server-side cleanup if retention guarantees matter.
- Anonymous authentication must be enabled in Supabase for the intended no-signup workflow.
- Validate and restrict uploaded files before production use.

## Deployment checklist

Before deploying:

- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider’s environment settings.
- Do not upload `.env`.
- Confirm `.env` and other credential patterns remain ignored by Git.
- Enable anonymous authentication if required.
- Apply and test RLS policies.
- Configure Realtime and the `canvas-assets` Storage bucket.
- Add server-side expired-room and asset cleanup.
- Test room creation, joining, passcodes, collaboration, uploads, sharing, burn, and expiry.
- Run the production build:

  ```bash
  npm run build
  ```

## GitHub safety

The repository ignores:

- `.env` and other environment files.
- Private keys and certificates.
- Credential and secret directories.
- Service-account JSON files.
- Dependencies, build output, logs, and local editor files.

Only `.env.example` should be committed as an environment-variable template. Always review the staged file list before pushing:

```bash
git status
git diff --cached --name-only
```

## Limitations and future improvements

- Add Supabase migrations and policy definitions to the repository.
- Move passcode verification to a trusted backend path.
- Enforce creator-only burn authorization server-side.
- Add scheduled cleanup for expired rooms and uploaded assets.
- Add automated tests for room creation, TTL selection, passcodes, collaboration, uploads, burn, and expiry.
- Split the large tldraw bundle with route-level or dependency-level code splitting.
- Add stronger upload validation and rate limiting.

## License

No license has been declared yet. Add a `LICENSE` file before distributing the project under an open-source license.
