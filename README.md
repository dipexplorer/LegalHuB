# 📚 LegalHuB

**LegalHuB** is a web-based platform designed to simplify access to legal resources. Users can explore legal terms, download state-specific legal documents, understand their rights, read comprehensive legal guides, and apply for legal services through official links — all in one place.

---

## 🚀 Features

- ✅ **Legal Dictionary** – AI-powered explanations of complex legal terms.
- ✅ **Download Legal Forms** – Access and download state-specific legal documents.
- ✅ **Apply for Legal Services** – Redirects to official legal application portals.
- ✅ **Legal Rights Database** – Browse essential civil, fundamental, and employment rights.
- ✅ **Legal Articles & Guides** – Learn from structured and easy-to-read legal content.
- ✅ **Smart Search** – Search across legal terms, rights, and documents efficiently.

---

## 📸 Screenshots

### 🏠 Homepage

![Homepage](https://github.com/user-attachments/assets/b3a791fe-29b3-4acd-99ba-5fd452cd20d7)

---

### 📘 Legal Dictionary

![Legal Dictionary](https://github.com/user-attachments/assets/33660235-dc58-4196-8cdc-c450068312e2)

---

![Link](https://github.com/user-attachments/assets/a7f5e868-29c7-44c5-8ef3-e4cce2c8b4dc)

---

![Link](https://github.com/user-attachments/assets/bd66169d-f22a-48d6-8a93-2f89f165b9dc)

---

![Link](https://github.com/user-attachments/assets/bebb21ce-971c-46ab-a8d4-3c072fedb304)

---

<img width="1000" height="855" alt="Create Account" src="https://github.com/user-attachments/assets/d95be0a0-52d5-4cf5-b4ca-ce2d47244e11" />

---

![Link](https://github.com/user-attachments/assets/91a40e6f-7124-42c2-bfa1-beeedeaf7394)

---

![Link](https://github.com/user-attachments/assets/42e338d4-26f8-46bb-9f93-bc56e9203f84)

---

![Link](https://github.com/user-attachments/assets/13da2694-85d7-4495-9545-5955123d9950)

---

![Link](https://github.com/user-attachments/assets/aea9cc35-7cb3-4c87-8d28-a27f64b73eee)

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Free Tier or Atlas)
- **AI Integration:** Chatbase (for AI chatbot responses)
- **Templating Engine:** EJS
- **Authentication:** Passport.js

---

## ⚙️ Installation

### 📌 Prerequisites

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- `.env` file with necessary API keys

### 📥 Setup Instructions

#### 1. Clone the repository

```bash
   git clone https://github.com/yourusername/LegalHuB

   cd LegalHuB
```

#### 2. Install dependencies

```bash
   npm install
```

#### 3. Set up environment variables

- Create a .env file in the root directory and add the following:

---

## 🧑‍💻 Environment Setup

1. Copy the example environment file:

---

```bash
   cp .env.sample .env
```

---

2. Update the .env file with your configuration:

---

```bash
   # Server Configuration
   PORT=8000
   SESSION_SECRET=mysecrectkey

   # CORS Configuration
   CORS_ORIGIN=*
   # CORS_ORIGIN=http://localhost:4000

   #DB_URL=
   DB_URL=mongodb+srv://<username>:<password>@cluster0.weuhr.mongodb.net
   # Uncomment if needed for frontend security

   DB_URL=

   NODE_ENV=development

   MISTRAL_API_KEY=

   ADMIN_SECRECT_KEY=mysupersecretkey
```

---

## 🔐 Mistral AI API Integration

### ⚙️ Setting Up Mistral API Key

To enable Mistral AI-powered features in LegalHuB, follow the steps below:

1. Go to the [Mistral AI Platform](https://console.mistral.ai/) and create an account (if you haven't already).
2. Navigate to **API Keys** and generate a new key.
3. Add the following entry to your `.env` file:

    ```env
    MISTRAL_API_KEY=your_mistral_api_key_here
    ```

---

3. Start the server

```bash
   npm start or npm run dev
```

The server will run on `http://localhost:8000`

---

## 🤝 How to Contribute

We welcome contributions to help improve **LegalHuB**! 🚀 Whether you're fixing bugs, improving documentation, or building new features — your support makes a difference.

---

### 🍴 Fork the Repository

1. Navigate to the [LegalHuB GitHub repository](https://github.com/dipexplorer/LegalHuB).
2. Click the **Fork** button in the top-right corner to create a personal copy of the repository.

---

### 🔄 Clone Your Forked Repository

1. Clone the repository to your local machine:

```bash
   git clone https://github.com/your-username/LegalHuB.git
```

2. Navigate to the project directory:

```bash
   cd LegalHuB
```

3. 🌿 Create a New Branch
    - Create a new branch for your changes:

```bash
   git checkout -b feature/your-feature-name
```

4. Make Your Changes✏️
    - Add your desired features, fix bugs, or improve documentation. 🛠️

5. 📦 Stage the Changes
    - Add modified files to the staging area:

```bash
   git add .
```

6. 📝 Commit Your Changes
    - Commit your changes with a clear, descriptive message:

```bash
   git commit -m "Add [feature/fix]: short description of what you changed"
```

7. ⬆️ Push to Your Fork
    - Push the changes to your forked GitHub repository:

```bash
   git push origin feature/your-feature-name
```

8. 📬 Create a Pull Request
    - Visit your forked repository on GitHub.

    - Click on "Compare & pull request".

    - Add a title and description of your changes.

    - Submit the pull request for review.

---

## 💡 Tips for a Great Contribution

- Follow consistent code style.

- Write descriptive commit messages.

- Make sure the project builds without errors.

- Reference any related issue numbers (e.g., Fixes #123).

---

## 📂 Project Structure

```plaintext
LegalHuB/
├── init/                   # Seed scripts for rights & documents
│   ├── documents.data.js
│   ├── index.documents.js
│   ├── index.rights.js
│   └── rights.data.js
│
├── src/                    # Main application source
│   ├── controllers/        # Business logic for each route
│   ├── db/                 # MongoDB database connection
│   ├── middlewares/        # Auth, error, upload middleware
│   ├── models/             # Mongoose schemas
│   ├── public/             # Static files (CSS, JS, images)
│   ├── routes/             # Express.js route definitions
│   ├── uploads/            # Uploaded files (PDFs etc.)
│   ├── utils/              # Helpers: error handling, responses, Cloudinary
│   ├── views/              # EJS templates (includes, layouts, pages)
│   ├── app.js              # Express app config
│   ├── constants.js        # Global constants
│   ├── index.js            # Server entry point
│   └── readme.md           # Dev-specific readme
│
├── .env.sample             # Example environment config
├── .gitignore              # Git ignored files
├── .prettierrc             # Prettier config
├── .prettierignore
├── CODE_OF_CONDUCT.md
├── LICENSE
├── package.json
├── package-lock.json
└── README.md               # Project overview and setup
```

---

## 🌐 API Endpoints

### 📘 Legal Dictionary

- **GET** `/api/dictionary/:term`  
  Returns an AI-generated explanation for a legal term.

---

### 📄 Legal Forms & Documents

- **GET** `/api/forms`  
  Retrieve all available legal forms.

- **GET** `/api/forms/:id`  
  Get a specific form by its ID.

- **GET** `/api/forms/download/:id`  
  Download a specific legal form.

---

### 🧾 Legal Rights

- **GET** `/api/rights`  
  Fetch all legal rights from the database.

- **GET** `/api/rights/:id`  
  Retrieve a specific legal right by ID.

---

### 🔍 Smart Search

- **GET** `/api/search?q=your_query`  
  Searches across legal dictionary, rights, and forms.

#### 🔁 Example Response

```json
{
    "dictionary_results": ["Tenant Rights - Explanation"],
    "rights_results": ["Right to Safe Housing"],
    "form_results": ["Rental Agreement Form"]
}
```

---

## 🔍 Smart Search Logic

The Smart Search feature performs a unified query across:

- Legal terms in the dictionary database
- User rights stored in MongoDB
- Legal forms and their descriptions

The results are ranked and returned in a categorized format to ensure relevance and clarity.

---

## 🎨 UI Pages

- **Home** (`/`) – Introductory landing page with navigation
- **Legal Dictionary** (`/dictionary`) – Look up legal terms
- **Legal Forms** (`/forms`) – Download or view forms by category
- **Legal Rights** (`/rights`) – Explore civil and employment rights

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

Pull requests are welcome! For significant changes, please open an issue first to discuss your proposed modifications.

---

## 📬 Contact

For support, collaboration, or legal partnerships, please contact:  
📧 **legalhub.help@gmail.com**

---

**LegalHuB** – Empowering users with accessible legal information.
