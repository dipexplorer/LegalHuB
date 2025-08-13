## 🤝 Contributing To Legalhub

Thank you for considering contributing to **LegalHuB**! Whether you’re fixing a bug, building a new feature, or improving documentation — your support is appreciated.

We aim to make the contribution process smooth and beginner-friendly.

---

## 📋 Table of Contents

- [📦 Project Overview](#-project-overview)
- [🛠️ Code of Conduct](#️-code-of-conduct)
- [📌 Prerequisites](#-prerequisites)
- [🧑‍💻 Local Development Setup](#-local-development-setup)
- [🌱 How to Contribute](#-how-to-contribute)
- [📁 Folder Structure](#-folder-structure)
- [📚 Style Guide](#-style-guide)
- [✅ Checklist Before Submitting PR](#-pr-checklist)
- [📬 Contact](#-contact)
- [🔒 Reporting Security Issues](#-reporting-security-issues)
- [🙏 Thank You](#-thank-you)

---

## 📦 Project Overview

**LegalHuB** is a full-stack legal platform where users can:

- Understand legal terms with AI
- Access legal rights and articles
- Download state-specific legal forms
- Apply for legal services via official sites
- Use smart search across all legal content

---

## 🛠️ Code of Conduct

We adhere to the [Contributor Covenant](./CODE_OF_CONDUCT.md).  
Please be respectful, constructive, and inclusive in all your interactions.

---

## 📌 Prerequisites

Before contributing, please ensure you have:

- Node.js (v14 or later)
- MongoDB (local or Atlas)
- Git & GitHub account
- Your own `.env` file (see below)

---

## 🧑‍💻 Local Development Setup

### 1. **Fork the repository**

Click on the top-right **"Fork"** button on GitHub to create your own copy.

### 2. **Clone your fork**

```bash
git clone https://github.com/YOUR-USERNAME/LegalHuB.git
cd LegalHuB
```

### 3. **Install dependencies**

```bash
npm install
```

### 4. **Configure environment variables**

- Copy the sample .env file and edit it with your credentials:

```bash
cp .env.sample .env
```

- Update the .env file with your MongoDB URI, secret keys, and Mistral API key.

---

#### 🔐 Mistral AI API Integration

**⚙️ Setting Up Mistral API Key**

- To enable Mistral AI-powered features in LegalHuB, follow the steps below:
- Go to the Mistral AI Platform and create an account (if you haven't already).
- Navigate to API Keys and generate a new key.
- Add the following entry to your .env file:

```bash
MISTRAL_API_KEY=your_mistral_api_key_here
```

---

### 5. **Run the server**

```bash
npm start      # Production mode
npm run dev    # Development mode
```

- The app will be available at: http://localhost:8000

---

## 🌱 How to Contribute

### 🪴 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

- Use descriptive names like fix/login-redirect, feature/smart-search-improve, etc.

### ✏️ 2. Make Your Changes

- Add your code in the correct folder under /src
- Follow the existing file structure
- Stick to the project's logic, style, and folder conventions

### ✅ 3. Code Formatting

LegalHuB uses Prettier for code formatting.

- A **.prettierrc** config is already set
- You can install a Prettier plugin for your editor (recommended: VS Code Prettier Extension)
- Please format your files before committing
- You can manually format files using:

```bash
npx prettier --write .
```

- ✨ Tip: No **npm run** format script is available — use the **npx** command above.

### 🧪 4. Testing (Optional but Encouraged)

If you're adding backend features, consider writing or updating test cases in **tests**/.

Run test suite using:

```bash
npm test
```

(You can use Supertest or [Jest] if tests already exist.)

### 📦 5. Stage the Changes

Add modified files to the staging area:

```bash
git add .
```

### 📝 6. Commit Guidelines

Please write clear and concise commit messages:

```bash
git commit -m "fix: resolve login redirect on expired session"
git commit -m "feat: add search across form descriptions"
```

- Use prefixes like:
- feat: → new feature
- fix: → bug fix
- docs: → documentation only changes
- refactor: → code refactoring
- test: → adding or updating tests

### 🚀 7. Push & Submit a Pull Request

Push to your fork:

```bash
git push origin feature/your-feature-name
```

Then:

- Go to your forked repository on GitHub

- Click on **"Compare & pull request"**

- Add a meaningful title and description

- Link related issues (e.g., Fixes #14)

- Submit the PR 🚀

---

## 📁 Folder Structure

```bash

 LegalHuB /
 __tests__
    ├──  article.test.js
    ├──  document.test.js
    ├──  healthCheck.test.js
    ├──  lawyer.test.js
    ├──  rights.test.js
    └──  user.test.js
 .github
    ├──  ISSUE_TEMPLATE
        ├──  bug_report.yml
        ├──  config.yml
        ├──  documentation_issue.yml
        └──  feature_request.yml
    ├──  workflows
        ├──  auto-comment-on-issue.yml
        ├──  autocomment-iss-close.yml
        ├──  autocomment-pr-merge.yml
        ├──  autocomment-pr-raise.yml
        ├──  automerge.yml
        ├──  ci_cd.yml
        ├──  close-stale.yml
        ├──  detect-duplicate-issue.yml
        └──  labeler.yml
    ├──  labeler.yml
    └──  PULL_REQUEST_TEMPLATE.md
 init
    ├──  documents.data.js
    ├──  index.documents.js
    ├──  index.rights.js
    └──  rights.data.js
 src
    ├──  controllers
        ├──  article.controller.js
        ├──  dictionary.controller.js
        ├──  document.controller.js
        ├──  healthCheck.js
        ├──  lawyer.controller.js
        ├──  page.controller.js
        ├──  rights.controller.js
        ├──  search.controller.js
        └──  user.controller.js
    ├──  db
        └──  index.js
    ├──  middlewares
        ├──  auth.middleware.js
        └──  multer.middleware.js
    ├──  models
        ├──  article.model.js
        ├──  document.model.js
        ├──  rights.model.js
        └──  user.model.js
    ├──  public
        ├──  css
            ├──  login.css
            └──  style.css
        ├──  js
            └──  login.js
        └──  pic
            ├──  8271787.jpg
            ├──  about_banner.jpg
            ├──  banner.jpg
            ├──  logo.png
            ├──  logo1.png
            └──  profile.jpg
    ├──  routes
        ├──  article.routes.js
        ├──  dictionary.routes.js
        ├──  document.routes.js
        ├──  healthCheck_route.js
        ├──  lawyer.routes.js
        ├──  page.routes.js
        ├──  rights.routes.js
        └──  user.routes.js
    ├──  uploads
        ├──  .gitkeep
        └──  sample.pdf
    ├──  utils
        ├──  apiError.js
        ├──  apiResponse.js
        ├──  asyncHandler.js
        └──  cloudinary.js
    ├──  views
        ├──  includes
            ├──  flash.ejs
            ├──  footer.ejs
            └──  navbar.ejs
        ├──  layouts
            └──  boilerplate.ejs
        ├──  pages
            ├──  about.ejs
            ├──  article-details.ejs
            ├──  article-form.ejs
            ├──  articles.ejs
            ├──  dictionary.ejs
            ├──  documents.ejs
            ├──  down_doc.ejs
            ├──  edit-article.ejs
            ├──  error.ejs
            ├──  fundamental.ejs
            ├──  index.ejs
            ├──  lawyer-profile.ejs
            ├──  lawyers.ejs
            ├──  new.ejs
            ├──  nopage.ejs
            ├──  privacy.ejs
            ├──  right-details.ejs
            ├──  show.ejs
            └──  terms.ejs
        └──  users
            ├──  login.ejs
            ├──  profile.ejs
            └──  updateUser.ejs
    ├──  app.js
    ├──  constants.js
    ├──  index.js
    └──  readme.md
 test
    ├──  globalSetup.js
    ├──  globalTeardown.js
    └──  jest.setup.js
 .env.sample
 .gitignore
 .prettierignore
 .prettierrc
 CODE_OF_CONDUCT.md
 LEARN.md
 LICENSE
 package-lock.json
 package.json
 README.md

```

---

## 📚 Style Guide

- Use consistent naming (camelCase for variables, PascalCase for components)

- Follow project conventions and avoid large, unrelated changes in one PR

- Leave comments for complex logic

---

## ✅ PR Checklist

Before submitting, make sure:

[ ] Your code compiles without errors

[ ] You’ve formatted your code with Prettier

[ ] You’ve tested your changes (if applicable)

[ ] You’ve added comments where needed

[ ] Your PR is focused and not too large (split into multiple PRs if needed)

---

## 🐛 Issues & Labels

We use the following labels to help new contributors:

- good first issue
- enhancement
- bug
- documentation

Feel free to pick one and start! No need to ask before working, but opening an issue before large changes is appreciated.

---

## 🔒 Reporting Security Issues

If you discover a security vulnerability in LegalHuB:

- Please do not open a public issue.
- Instead, email dipexplorerid23@gmail.com with details.
- We’ll review and respond ASAP.

---

## 💬 Need Help?

If you're stuck:

- Open a GitHub Discussion
- Create an Issue
- Or email me at dipexplorerid23@gmail.com

---

### 🙏 Thank You

Your contributions make LegalHuB better for everyone.
Let’s build accessible legal tech together!
