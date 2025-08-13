# 📘 **Learn About LegalHuB**

Welcome to **LegalHuB** — a web-based legal support platform designed to make legal information accessible, understandable, and actionable for everyone.

This document serves as a **technical guide and developer onboarding reference**. Whether you're exploring the codebase or contributing to the project, this will help you understand how everything works under the hood.

---

## 🧭 Table of Contents

- [🎯 What Is LegalHuB?](#-what-is-legalhub)
- [🛠️ Tech Stack](#️-tech-stack)
- [🧠 Core Functionality Breakdown](#-core-functionality-breakdown)
    - [⚖️ Legal Dictionary (AI-powered)](#️-legal-dictionary-ai-powered)
    - [📄 Legal Forms](#-legal-forms)
    - [🧾 Legal Rights](#-legal-rights)
    - [📚 Legal Articles & Guides](#-legal-articles--guides)
    - [🔍 Smart Search](#-smart-search)
- [🏗️ Project Structure (Monorepo)](#️-project-structure-monorepo)
- [🔍 API & Controllers](#-api--controllers)
    - [`/src/controllers/`](#srccontrollers)
    - [`/src/models/`](#srcmodels)
    - [`/src/routes/`](#srcroutes)
    - [`/src/views/`](#srcviews-ejs-templates)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [🚦 GitHub Actions (CI/CD)](#-github-actions-cicd)
- [🙋 Contributing](#-contributing)
- [🧠 Tips for New Contributors](#-tips-for-new-contributors)
- [📬 Contact](#-contact)
- [🙌 Thank You](#-thank-you)

---

## 🎯 What Is LegalHuB?

**LegalHuB** empowers users to:

- Understand complex legal terms using AI
- Download state-specific legal forms
- Explore legal rights (fundamental, civil, employment)
- Read accessible legal articles and guides
- Perform smart searches across legal content

---

## 🛠️ Tech Stack

| Layer              | Technology                 |
| ------------------ | -------------------------- |
| **Backend**        | Node.js, Express.js        |
| **Database**       | MongoDB (Free Tier/Atlas)  |
| **Templating**     | EJS (Embedded JavaScript)  |
| **AI Chatbot**     | Chatbase + OpenAI API      |
| **Authentication** | Passport.js                |
| **Search**         | Custom Smart Search Engine |

---

## 🧠 Core Functionality Breakdown

### 1. ⚖️ Legal Dictionary (AI-powered)

- Users search a legal term
- The backend sends the term to the **OpenAI API**
- Results are rendered via EJS templates

---

### 2. 📄 Legal Forms

- Forms are stored in MongoDB and categorized
- Users can browse by type or state
- Backend allows **download** or **external redirection**

---

### 3. 🧾 Legal Rights

- Rights include descriptions, categories, and source links
- Available at the `/rights` route

---

### 4. 📚 Legal Articles & Guides

- Markdown or HTML content rendered via EJS
- Written in simple, user-friendly language

---

### 5. 🔍 Smart Search

- Unified endpoint `/api/search?q=term`
- Searches across:
    - Dictionary entries
    - Legal rights
    - Document metadata
- Ranked and returned as structured JSON:

```json
{
  "dictionary_results": [...],
  "rights_results": [...],
  "form_results": [...]
}
```

---

## 🏗️ Project Structure (Monorepo)

```plaintext
LegalHuB/
├── __tests__/              # Unit & integration tests
├── .github/                # GitHub workflows & templates
│   └── workflows/
├── init/                   # Seed scripts (rights, documents)
├── src/                    # Core backend app
│   ├── controllers/        # Route logic & APIs
│   ├── db/                 # MongoDB connection
│   ├── middlewares/        # Auth, error, upload handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express route definitions
│   ├── utils/              # Cloudinary, error helpers, etc.
│   ├── views/              # EJS templates
│   ├── public/, uploads/   # Static & uploaded files
│   ├── app.js              # Express app config
│   ├── index.js            # Entry point
│   ├── constants.js        # Global constants
│   └── readme.md           # Dev-only usage guide
├── .env.sample             # Sample environment variables
├── package.json            # NPM config
└── README.md               # Project overview
```

---

## 🔍 API & Controllers

📂 `/src/controllers/`
Handles backend logic for each feature:

- `dictionary.controller.js` – AI-powered legal term explanations
- `document.controller.js` – Upload/view/download forms
- `rights.controller.js` – Read and manage legal rights
- `article.controller.js` – Legal articles & blogs
- `search.controller.js` – Smart search queries
- `user.controller.js` – User auth/profile handling
- `healthCheck.js` – Monitoring and uptime status

---

## 🗂 `/src/models/`

Mongoose models for:

- `document.model.js`
- `rights.model.js`
- `article.model.js`
- `user.model.js`

---

## 🌐 `/src/routes/`

Each route maps to a controller method.

| Method | Endpoint            | Action                |
| ------ | ------------------- | --------------------- |
| GET    | `/api/rights`       | Fetch all rights      |
| POST   | `/api/documents`    | Upload a document     |
| GET    | `/api/search?q=...` | Smart search by query |

---

## 🧾 `/src/views/` (EJS templates)

- Layouts: `layouts/boilerplate.ejs`
- Includes: `navbar.ejs`, `footer.ejs`, `flash.ejs`
- Pages: `documents.ejs`, `rights.ejs`, `dictionary.ejs`
- User auth: `login.ejs`, `profile.ejs`, `updateUser.ejs`

---

## ⚙️ Environment Configuration

1. Copy the sample environment file:

```bash
cp .env.sample .env
```

2. Fill in required fields:

```env
# Server
PORT=8000
SESSION_SECRET=mysecretkey


# MongoDB
DB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net


# CORS
CORS_ORIGIN=*


# AI APIs
MISTRAL_API_KEY=
ADMIN_SECRET_KEY=mysupersecretkey


NODE_ENV=development
```

## 🚦 GitHub Actions (CI/CD)

Workflow file: `.github/workflows/integration.yml`

- Runs automated tests on PRs
- Enforces code quality
- Can be extended for deployments

---

## 🙋 Contributing

We welcome your contributions!
Start by reading:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

Ways to contribute:

- Fix typos, links, or formatting in this guide ✅
- Suggest improvements or beginner tips
- Submit PRs for features or bugs

---

## 🧠 Tips for New Contributors

- Use [VS Code's Markdown Preview](https://code.visualstudio.com/) to test changes
- Follow the repo’s Prettier config
- Reference [README.md](README.md) for user-facing info
- Reach out via GitHub Issues if stuck!

---

## 📬 Contact

📧 Email: dipexplorerid23@gmail.com

🐛 Open an Issue: [GitHub Issues](https://github.com/dipexplorer/LegalHuB/issues)

---

## 🙌 Thank You

Thanks for contributing to **LegalHuB**!

Let’s build a more legally literate web — together.
