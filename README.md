# 🌍 Lingo Play & Learn

**Learn languages. Practice daily. Play together.**

Lingo Play & Learn is an interactive language-learning web application designed to make learning engaging through structured lessons, progress tracking, vocabulary practice, and interactive learning experiences.

The platform combines a React-based frontend with an Express backend and Supabase persistence to provide account-based learning experiences.

🔗 **Live Demo:** [Visit Lingo Play & Learn](https://lingo-ruby-three.vercel.app/)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running Locally](#-running-locally)
- [Building for Production](#-building-for-production)
- [Deployment on Vercel](#-deployment-on-vercel)
- [API Overview](#-api-overview)
- [Database](#-database)
- [Testing](#-testing)
- [Security](#-security)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Overview

Lingo Play & Learn aims to make language learning more accessible, interactive, and enjoyable.

Instead of relying exclusively on traditional study methods, the application combines structured learning with gamification and progress tracking.

### Project Goals

- Make language learning approachable for beginners.
- Provide structured learning experiences.
- Help learners build vocabulary consistently.
- Track individual learning progress.
- Make practice more engaging through interactive activities.
- Support multiplayer learning experiences.
- Provide a foundation for future AI-powered learning features.

The project is designed to evolve through continuous improvements informed by testing and user feedback.

---

## ✨ Features

### 🔐 Account Authentication

- Account registration using a username and password.
- User login and logout.
- Session-based authentication.
- Individual accounts for personalized learning experiences.
- Persistent account and learning data through the backend.

### 📚 Structured Learning

- Organized learning content.
- Multiple proficiency levels.
- Lesson-based learning experiences.
- Vocabulary practice.
- Progress tracking across learning activities.

### 📈 Learning Progress

- Track learning activity and experience points.
- Maintain vocabulary-related progress.
- Track completed lessons.
- Store progress associated with individual users.
- Resume learning with saved progress.

### 🎮 Interactive Learning

- Game-oriented learning experiences.
- Solo practice.
- Friends and multiplayer-oriented learning flows.
- Shared-question experiences where supported.
- Learning activities designed to encourage continued practice.

### 🤖 AI-Assisted Practice

The application includes an AI-oriented practice experience intended to support flexible learning activities.

Depending on the configured API keys and implemented features, AI functionality may support custom practice topics and language-level-aware activities.

### ☁️ Persistent Data Storage

- Supabase-backed persistence.
- Server-side database access.
- Account-specific progress storage.
- Backend-managed application data.

### 🌐 Web Application

- React-based user interface.
- Vite development and production build tooling.
- Express API backend.
- Vercel deployment support.

---

## 🛠 Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tooling |
| JavaScript | Application logic |
| Node.js | Backend runtime |
| Express.js | Backend API and request handling |
| Supabase | Database and persistent application storage |
| REST API | Communication between frontend and backend |
| Vercel | Web application deployment |
| Gemini API | Optional AI-powered functionality |

The exact dependencies and versions are defined in the project's `package.json` files.

---

## 🏗 Architecture

Lingo Play & Learn follows a frontend-backend architecture.

```text
                    ┌──────────────────────┐
                    │       Learner        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    React + Vite      │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                         HTTP / JSON
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Express API       │
                    │      Backend         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Supabase        │
                    │ Persistent Storage   │
                    └──────────────────────┘

                    Optional AI Integration
                               │
                               ▼
                         Gemini API
```

### Request Flow

1. A learner interacts with the frontend.
2. The frontend sends a request to the appropriate backend API endpoint.
3. The Express backend validates and processes the request.
4. The backend accesses Supabase when persistent data is required.
5. The backend returns a response to the frontend.
6. The frontend updates the interface based on the response.

**Security principle:** Database service-role credentials must remain on the server and must never be included in the frontend bundle.

---

## 📂 Project Structure

The repository contains the main application under the `lingo/` directory, with additional deployment and API configuration at the repository root.

```text
lingo-source/
│
├── api/
│   └── index.js
│
├── lingo/
│   ├── api/
│   │   └── index.js
│   │
│   ├── src/
│   │   ├── main.jsx
│   │   └── ...
│   │
│   ├── server.mjs
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── ...
│
├── tests/
│   └── ...
│
├── vercel.json
├── package.json
├── .gitignore
└── README.md
```

*This is a high-level overview. Some files and directories may differ depending on the current repository version.*

### Important Files

| File | Responsibility |
|---|---|
| `lingo/src/main.jsx` | Frontend application entry point |
| `lingo/server.mjs` | Express backend and API routes |
| `lingo/package.json` | Application dependencies and scripts |
| `lingo/vite.config.js` | Vite configuration |
| `api/index.js` | Root-level Vercel API entry point |
| `vercel.json` | Root-level deployment and routing configuration |
| `lingo/api/index.js` | Application-level API entry point |
| `lingo/vercel.json` | Application-level deployment configuration |
| `tests/` | Automated tests and verification scripts |

---

## ⚙️ Getting Started

Follow these instructions to run the application locally.

### Prerequisites

Install the following tools:

- [Node.js](https://nodejs.org/) — use a version compatible with the project's dependencies.
- npm — included with Node.js.
- A [Supabase](https://supabase.com/) project.
- A Gemini API key if you intend to use AI-powered features.

You should also have Git installed if you plan to clone the repository.

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Navigate to the repository:

```bash
cd lingo-source
```

Replace `<YOUR_GITHUB_REPOSITORY_URL>` with your actual GitHub repository URL.

### 2. Install Dependencies

From the repository root:

```bash
npm install
```

If your repository uses a different package-manager or workspace configuration, follow the scripts and dependency configuration in the committed `package.json` files.

### 3. Configure Environment Variables

Create the required environment configuration using the project's existing `.env.example` as a reference.

For local development, place the backend environment variables in the location read by `server.mjs`.

Do not commit `.env` files.

See [Environment Variables](#-environment-variables) for details.

### 4. Start the Application

Inspect the available scripts in `package.json`.

For the application package, the typical Vite development command is:

```bash
npm run dev
```

If the command is not available from the repository root, run it from the `lingo/` directory.

Start the Express backend using the project's configured development command or, where appropriate:

```bash
node server.mjs
```

**Note:** The frontend and backend may use separate development processes. Use the existing development configuration rather than starting duplicate servers.

---

## 🔑 Environment Variables

Configure environment variables in your local environment and your hosting provider.

The following variables are relevant to the application's described architecture. Check the current backend code and `.env.example` to confirm which variables are mandatory.

| Variable | Purpose | Required |
|---|---|---|
| `SUPABASE_URL` | Identifies the Supabase project | Yes, for Supabase persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side privileged database access | Yes, for the current service-role-based backend |
| `NODE_ENV` | Identifies the runtime environment | Recommended in production |
| `GEMINI_API_KEY` | Enables supported Gemini-powered functionality | Optional, if AI features are enabled |

### Example Local Configuration

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SIDE_SECRET
NODE_ENV=development
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Replace the example values with your own credentials.

Do not use these placeholders as real credentials.

### Environment Variable Rules

- Never commit `.env` files.
- Never expose the Supabase service-role key to the browser.
- Never prefix server-only secrets with `VITE_`.
- Do not hardcode API keys into JavaScript or JSX files.
- Use separate development and production credentials where appropriate.
- Redeploy the application after changing production environment variables.

---

## 💻 Running Locally

### Development

Start the frontend and backend using the project's configured scripts.

The frontend is powered by Vite, while `server.mjs` provides the Express backend.

Verify that:

- The frontend loads successfully.
- The backend starts without errors.
- Required environment variables are available.
- Supabase connectivity works.
- API requests reach the Express application.

### Local API Verification

If your development server is configured to use port `3000`, you can inspect its health endpoint:

```bash
curl http://localhost:3000/api/health
```

Check the configuration endpoint:

```bash
curl http://localhost:3000/api/config
```

The exact port depends on your local configuration.

---

## 📦 Building for Production

From the repository root, run:

```bash
npm run build
```

The repository's root build script is intended to build the frontend and prepare the production assets.

Verify that the build completes successfully before deploying.

After building, inspect the output for the generated HTML and asset files.

A successful frontend build does not, by itself, guarantee that the backend API is configured correctly. Verify both the frontend and backend deployment.

---

## 🚀 Deployment on Vercel

Lingo Play & Learn is deployed at:

**https://lingo-ruby-three.vercel.app/**

### 1. Connect GitHub

1. Open the [Vercel Dashboard](https://vercel.com/dashboard).
2. Import the GitHub repository.
3. Select the correct repository.
4. Confirm the project's Root Directory and Build settings.
5. Deploy the application.

### 2. Configure the Project Root

The repository contains root-level configuration and an application directory named `lingo/`.

Confirm whether the Vercel project uses:

- The repository root, or
- The `lingo/` directory.

Use the matching build configuration and API entry points. Do not assume that both root-directory configurations have been verified merely because both sets of files exist.

### 3. Configure Environment Variables

In Vercel:

1. Open your project.
2. Navigate to **Settings → Environment Variables**.
3. Add the required production variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV`
   - `GEMINI_API_KEY`, if needed
4. Select the appropriate deployment environments.
5. Save the changes.

Keep all privileged keys server-side.

### 4. Deploy

Push your changes to the configured GitHub deployment branch.

```bash
git add .
git commit -m "Update application"
git push origin main
```

Use the actual deployment branch configured for your repository.

Vercel should build and deploy the new commit automatically if Git integration is enabled.

### 5. Verify the Deployment

Open the live application and check the configuration endpoint:

```text
https://lingo-ruby-three.vercel.app/api/config
```

Expected behavior: the endpoint should return a valid JSON response rather than a Vercel 404 page.

Also verify:

- Signup and login.
- Logout and session handling.
- Lesson completion.
- Saved learning progress.
- Data persistence after refreshing the page.
- Any enabled AI practice functionality.
- Browser console and network errors.

**Important:** Deployment configuration can change. If an API route returns `404`, inspect Vercel's deployment logs and routing configuration before changing application data or database schemas.

---

## 🔌 API Overview

The Express backend exposes API endpoints used by the frontend.

The following routes have been referenced in the application's development and testing workflow.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Check backend health |
| `/api/config` | GET | Retrieve supported application configuration |
| `/api/auth/signup` | POST | Register an account |
| `/api/auth/login` | POST | Authenticate a user |
| `/api/auth/logout` | POST | End a session |
| `/api/curriculum/levels` | GET | Retrieve curriculum-level information |

Additional endpoints may support learning progress, games, vocabulary, solo activities, multiplayer experiences, and AI practice.

The exact endpoint inventory, request bodies, response schemas, and authentication requirements should be taken from the current implementation in `server.mjs`.

### API Error Handling

Clients should handle unsuccessful responses gracefully.

A request may fail because of:

- Invalid input.
- Authentication errors.
- Missing routes.
- Database failures.
- Configuration errors.
- Server-side exceptions.

The frontend should not assume every response contains JSON. It should validate response status and handle unexpected content types without crashing.

---

## 🗄 Database

The application uses Supabase for persistent storage.

The current architecture keeps database access in the backend, which communicates with Supabase using server-side credentials.

The application's existing storage design includes tables for:

- User accounts.
- User sessions.
- Learning progress.
- Game-related state.
- Solo-learning state.

The exact table definitions and column structure should be verified against the database migrations and current backend storage adapter.

### Database Responsibilities

The database supports persistence for application data, including user-specific learning progress and session information.

### Data Safety

- Protect production credentials.
- Avoid manually deleting user records.
- Do not run unreviewed migrations against production.
- Back up important data before performing destructive operations.
- Test migrations and data-cleanup scripts against isolated data before production execution.

---

## 🧪 Testing

Run the project's available tests before releasing changes.

### Production Build

```bash
npm run build
```

### API Routing Tests

If the repository includes the serverless routing test script:

```bash
node tests/test-serverless-routing.mjs
```

### Additional Verification

Use the relevant test scripts present in the repository to check:

- API routing.
- Authentication.
- Session validation.
- User-specific data isolation.
- Progress persistence.
- Lesson functionality.
- Game-related functionality.
- Error handling.
- Production build behavior.

Only treat tests that have actually been run successfully as passing.

Before deployment, test the application in a local or isolated environment. After deployment, run a small set of live smoke tests without creating unnecessary production data.

---

## 🔒 Security

Security is important because the application stores user accounts, sessions, and learning progress.

The following practices should be maintained.

### Authentication

- Validate signup and login inputs on the server.
- Hash passwords securely.
- Never store plaintext passwords.
- Avoid logging passwords, session tokens, or secrets.
- Expire sessions appropriately.
- Invalidate sessions when users log out.

### API Security

- Authenticate protected requests.
- Authorize access to user-specific data.
- Validate user input.
- Handle errors without leaking sensitive information.
- Apply appropriate request limits where necessary.

### Supabase Security

- Keep the service-role key on the server.
- Restrict privileged database access.
- Review Row Level Security policies and database permissions.
- Do not assume that enabling RLS alone protects operations performed using a privileged service-role key.

### Secrets Management

Store production secrets in the hosting provider's environment-variable settings.

Never publish credentials in:

- Source code.
- Git commits.
- Screenshots.
- Public issue reports.
- Frontend bundles.
- README examples.

---

## 🛠 Troubleshooting

### Signup Fails With a JSON Parsing Error

Example:

```text
Unexpected token 'T', "The page c..." is not valid JSON
```

**Possible cause:** The frontend is trying to parse a plain-text or HTML error page as JSON.

Check:

1. Open browser Developer Tools.
2. Select the Network tab.
3. Attempt signup again.
4. Inspect the `/api/auth/signup` request.
5. Check its status code, request URL, and response body.
6. Verify that the API route is configured correctly in Vercel.
7. Inspect deployment logs and server-side environment variables.

A `404` response indicates that the requested route was not found at the requested URL; it does not necessarily mean the database or password is incorrect.

### API Returns 404 on Vercel

Check:

- Vercel Project Root Directory.
- The applicable `vercel.json`.
- Serverless function entry points.
- Rewrites and route matching.
- Whether the latest Git commit was deployed.
- Vercel function logs.

### Supabase Connection Fails

Check:

- `SUPABASE_URL` is correct.
- `SUPABASE_SERVICE_ROLE_KEY` is configured in the server environment.
- The deployment was rebuilt after environment changes.
- The required tables exist.
- Database errors are visible in server-side logs.

Never paste service-role keys into public logs or issue reports.

### Progress Does Not Persist

Check:

- Whether the frontend sends the correct API request.
- Whether the backend authenticates the request.
- Whether the update succeeds in Supabase.
- Whether the application reloads progress from the backend.
- Whether user IDs are correctly associated with progress records.

### AI Features Do Not Work

Check whether the relevant AI functionality is enabled and whether `GEMINI_API_KEY` is configured on the server.

Also inspect API errors, usage limits, and provider availability.

---

## 🗺 Roadmap

The following are potential areas for future development, not promises about features already implemented.

- [ ] Improve the onboarding experience.
- [ ] Expand lessons and vocabulary content.
- [ ] Improve progress visualization.
- [ ] Refine the learning experience based on user feedback.
- [ ] Expand interactive practice activities.
- [ ] Improve accessibility.
- [ ] Optimize frontend loading performance.
- [ ] Expand AI-assisted practice.
- [ ] Improve automated test coverage.
- [ ] Add monitoring and operational alerts.
- [ ] Explore additional language-learning paths.

The roadmap should evolve based on actual learner needs rather than adding features without validation.

---

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

### How to Contribute

1. Fork the repository.
2. Create a feature branch.
3. Make a focused change.
4. Run relevant tests.
5. Commit your changes.
6. Open a pull request describing the problem and solution.

Example:

```bash
git checkout -b feature/your-feature
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

Please avoid including credentials, personal user data, or production database exports in pull requests.

---

## 📄 License

No license has been specified here.

Before making the repository public, add a `LICENSE` file if you intend to grant others permission to use, modify, and distribute the project.

If you want to retain all rights, do not add an open-source license without deciding to do so.

---

## 💬 Feedback

Have an idea to improve language learning?

Found a bug or have a feature suggestion? Open an issue in the GitHub repository with a clear description of the problem or proposed improvement.

---

<p align="center">
  <strong>Lingo Play & Learn</strong><br>
  Learn consistently. Practice confidently. Keep progressing. 🌍
</p>
