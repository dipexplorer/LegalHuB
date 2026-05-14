# LegalHuB - Project Documentation

**Version:** 1.0.0  
**Last Updated:** May 2026  
**Repository:** [github.com/dipexplorer/LegalHuB](https://github.com/dipexplorer/LegalHuB)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Goals & Vision](#2-project-goals--vision)
3. [Target End Users](#3-target-end-users)
4. [Tech Stack & Architecture](#4-tech-stack--architecture)
5. [Project Structure](#5-project-structure)
6. [Features & Functionality](#6-features--functionality)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [Frontend Pages & Components](#9-frontend-pages--components)
10. [Authentication & Security](#10-authentication--security)
11. [Environment Configuration](#11-environment-configuration)
12. [Development & Deployment](#12-development--deployment)

---

## 1. Project Overview

**LegalHuB** is a comprehensive full-stack web application that democratizes legal knowledge for Indian citizens. It serves as a one-stop platform for accessing legal information, connecting with verified lawyers, downloading state-specific legal documents, and understanding constitutional rights.

The platform bridges the gap between complex legal terminology and everyday citizens by providing AI-powered explanations, real-time chat with lawyers, and streamlined appointment booking.

---

## 2. Project Goals & Vision

### Mission

> To make legal knowledge accessible, understandable, and actionable for every Indian citizen.

### Goals

| Goal | Description |
|------|-------------|
| **Democratize Legal Knowledge** | Simplify complex legal terminology and processes for non-legal professionals |
| **Connect Citizens with Experts** | Facilitate seamless connections between users and verified legal professionals |
| **Streamline Legal Documentation** | Provide easy access to state-specific legal forms and government documents |
| **Empower Through Rights Awareness** | Help citizens understand their constitutional rights under the Indian Constitution |
| **Build Trust & Transparency** | Create a verified, trustworthy ecosystem for legal services |

### Vision

To become India's most trusted and comprehensive legal resource platform, enabling citizens to navigate the legal system with confidence and clarity.

---

## 3. Target End Users

### Primary Users

| User Type | Description | Key Needs |
|-----------|-------------|-----------|
| **General Citizens** | Everyday people seeking legal information | Legal terms, rights, documents, lawyer contact |
| **Law Students** | Academic researchers and learners | Dictionary, articles, case studies, constitutional rights |
| **Legal Professionals** | Lawyers and advocates | Client management, appointment scheduling, reputation building |
| **Admin Users** | Platform administrators | Content management, user verification, analytics |

### User Personas

#### Priya, 28 - IT Professional
> "I need to understand my tenant rights before signing a rental agreement. LegalHuB's dictionary helps me decode legal jargon quickly."

#### Rajesh, 45 - Small Business Owner
> "Finding a verified lawyer for my business contract was tedious. LegalHuB's directory made it simple and trustworthy."

#### Anita, 19 - Law Student
> "Studying constitutional law requires quick access to articles and rights. LegalHuB's organized database is my go-to reference."

---

## 4. Tech Stack & Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                    EJS + Bootstrap 5                        │
│              (Server-side rendered pages)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                    REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                        BACKEND                              │
│                   Node.js + Express                        │
│                 (MVC Architecture)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │ MongoDB │    │Cloudinary │   │   Email   │
    │ (Data)  │    │ (Storage) │   │  (Nodemailer)
    └─────────┘    └───────────┘   └───────────┘
```

### Tech Stack Details

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js v18+ | Server-side JavaScript runtime |
| **Framework** | Express.js | Web application framework |
| **Database** | MongoDB (Mongoose ODM) | Document database for flexible data modeling |
| **Templating** | EJS + ejs-mate | Server-side HTML rendering |
| **UI Framework** | Bootstrap 5 | Responsive front-end components |
| **Auth** | Passport.js | Authentication (Local + OAuth 2.0) |
| **Real-time** | Socket.io | Live chat and notifications |
| **AI Integration** | Mistral AI API | Legal term explanations |
| **File Storage** | Cloudinary | Image and file uploads |
| **Email** | Nodemailer | Transactional emails |
| **PDF Generation** | Puppeteer | Appointment card PDFs |
| **Security** | Helmet, CORS, express-rate-limit | Application security |

### Architecture Pattern

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Views    │────▶│ Controllers │────▶│   Models    │
│   (EJS)     │     │  (Logic)    │     │  (MongoDB)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │
       │            ┌─────┴─────┐             │
       │            │           │             │
    Middleware  Services    Utils           DB
```

### Design Patterns

- **MVC (Model-View-Controller)**: Clear separation of concerns
- **Middleware Pattern**: Request/response pipeline for cross-cutting concerns
- **Service Layer**: External API integrations (AI, Cloudinary, Email)
- **Repository Pattern**: Data access abstraction through Mongoose models

---

## 5. Project Structure

```
LegalHuB/
├── src/
│   ├── config/                 # Application configurations
│   │   ├── cloudinary.js       # Cloudinary storage setup
│   │   ├── email.js            # Email transport configuration
│   │   ├── passport.js         # Passport auth strategies
│   │   └── pushNotification.js # Web push configuration
│   │
│   ├── controllers/            # Business logic handlers
│   │   ├── adminController.js  # Admin dashboard operations
│   │   ├── articleController.js # Article CRUD operations
│   │   ├── appointmentController.js # Appointment booking logic
│   │   ├── authController.js   # Authentication handling
│   │   ├── chatController.js   # Chat room management
│   │   ├── dictionaryController.js # Legal dictionary with AI
│   │   ├── documentController.js # Legal documents management
│   │   ├── lawyerController.js # Lawyer profiles and listing
│   │   ├── notificationController.js # User notifications
│   │   ├── pageController.js   # Static page rendering
│   │   ├── profileController.js # User profile management
│   │   ├── rightController.js # Constitutional rights
│   │   ├── searchController.js # Global search functionality
│   │   ├── subscriptionController.js # Push notification subs
│   │   └── userController.js  # User management
│   │
│   ├── db/                     # Database connection
│   │   └── connection.js      # MongoDB connection setup
│   │
│   ├── middlewares/            # Express middleware
│   │   ├── authMiddleware.js  # Authentication checks
│   │   ├── bookmarkMiddleware.js # Bookmark verification
│   │   ├── fileUpload.js      # Multer file upload config
│   │   ├── isAdmin.js         # Admin role verification
│   │   ├── isAuthor.js        # Article author check
│   │   ├── isLawyer.js        # Lawyer role verification
│   │   ├── rateLimiter.js     # API rate limiting
│   │   └── socketAuth.js      # Socket.io authentication
│   │
│   ├── models/                 # MongoDB schemas
│   │   ├── Appointment.js     # Appointment booking schema
│   │   ├── Article.js         # Article/content schema
│   │   ├── Bookmark.js        # User bookmarks schema
│   │   ├── ChatRoom.js        # Chat rooms schema
│   │   ├── Document.js        # Legal documents schema
│   │   ├── LawyerProfile.js   # Lawyer details schema
│   │   ├── LoginActivity.js   # Login tracking schema
│   │   ├── Message.js         # Chat messages schema
│   │   ├── Notification.js    # User notifications schema
│   │   ├── Review.js          # Lawyer reviews schema
│   │   ├── Right.js           # Constitutional rights schema
│   │   ├── SecuritySettings.js # User security schema
│   │   ├── Subscription.js    # Push subscriptions schema
│   │   └── User.js            # User accounts schema
│   │
│   ├── public/                 # Static assets
│   │   ├── css/               # Custom stylesheets
│   │   ├── images/            # Static images
│   │   ├── js/                # Client-side JavaScript
│   │   └── sw.js              # Service worker for push
│   │
│   ├── routes/                 # Route definitions
│   │   ├── adminRoutes.js     # Admin API routes
│   │   ├── apiRoutes.js       # General API routes
│   │   ├── articleRoutes.js   # Article routes
│   │   ├── appointmentRoutes.js # Appointment routes
│   │   ├── authRoutes.js      # Authentication routes
│   │   ├── chatRoutes.js      # Chat routes
│   │   ├── dictionaryRoutes.js # Dictionary routes
│   │   ├── documentRoutes.js  # Document routes
│   │   ├── lawyerRoutes.js    # Lawyer routes
│   │   ├── notificationRoutes.js # Notification routes
│   │   ├── pageRoutes.js      # Page rendering routes
│   │   ├── profileRoutes.js   # Profile routes
│   │   ├── rightRoutes.js     # Rights routes
│   │   ├── searchRoutes.js    # Search routes
│   │   └── userRoutes.js      # User management routes
│   │
│   ├── services/               # External service integrations
│   │   ├── AIService.js       # Mistral AI integration
│   │   └── pushService.js     # Web push notifications
│   │
│   ├── utils/                  # Utility functions
│   │   ├── apiResponse.js     # Standardized API responses
│   │   ├── catchAsync.js      # Async error wrapper
│   │   ├── cloudinary.js      # Cloudinary helpers
│   │   ├── constants.js       # Application constants
│   │   ├── cron.js            # Scheduled tasks
│   │   ├── emailTemplate.js   # Email HTML templates
│   │   ├── generateQRCode.js  # QR code generation
│   │   ├── logger.js          # Application logging
│   │   ├── parseSections.js   # Article section parsing
│   │   ├── regexPatterns.js   # Common regex patterns
│   │   ├── sanitize.js        # Input sanitization
│   │   ├── validateEnv.js     # Env variable validation
│   │   └── verifyToken.js    # JWT verification
│   │
│   ├── validators/             # Input validation schemas
│   │   ├── authValidator.js   # Auth input validation
│   │   └── userValidator.js   # User input validation
│   │
│   ├── views/                  # EJS templates
│   │   ├── layouts/           # Page layouts
│   │   ├── partials/          # Reusable components
│   │   ├── pages/             # Main pages
│   │   ├── admin/            # Admin panel views
│   │   └── users/            # User-specific views
│   │
│   ├── app.js                 # Express app configuration
│   ├── constants.js           # Global constants
│   ├── index.js               # Application entry point
│   └── socket.js              # Socket.io configuration
│
├── init/                       # Database seeding scripts
│   ├── seedDocuments.js        # Legal documents seeder
│   ├── seedRights.js          # Constitutional rights seeder
│   └── seedUsers.js           # Sample users seeder
│
├── scripts/                    # Build and utility scripts
├── __tests__/                 # Jest test suites
│   ├── controllers/           # Controller unit tests
│   ├── models/                # Model unit tests
│   └── routes/                # Route integration tests
│
├── docs/                       # Project documentation
├── package.json               # Node.js dependencies
├── jest.config.js             # Jest testing config
├── .env.sample                # Environment template
├── .eslint.config.js          # ESLint configuration
├── .prettierrc                # Prettier formatting config
└── README.md                  # Project readme
```

---

## 6. Features & Functionality

### 6.1 Legal Dictionary (AI-Powered)

**Description**: Comprehensive legal terminology database with AI-generated explanations.

| Feature | Description |
|---------|-------------|
| AI Explanations | Uses Mistral AI for in-depth term definitions |
| Fallback Definitions | Pre-loaded definitions for 50+ common terms |
| Smart Search | Real-time search with autocomplete |
| Save Terms | Users can bookmark favorite terms |
| Categories | Organized by legal domains (Contract, Criminal, Family, etc.) |

**Key Files**:
- `controllers/dictionaryController.js`
- `services/AIService.js`
- `models/User.js` (savedTerms field)

---

### 6.2 Legal Documents & Forms

**Description**: State-wise collection of legal documents and government forms.

| Feature | Description |
|---------|-------------|
| State Filter | All 28 states + 8 UTs covered |
| Department Filter | Courts, Revenue, Police, etc. |
| Document Guidelines | Step-by-step filling instructions |
| Required Documents | Checklist for each form |
| Apply Online | Direct links to government portals |
| Download Tracking | Track document download statistics |

**Sample States**: Andhra Pradesh, Maharashtra, Tamil Nadu, Karnataka, Gujarat, West Bengal, etc.

**Sample Departments**: Revenue, Police, Court, Health, Education, etc.

---

### 6.3 Constitutional Rights Database

**Description**: Comprehensive database of Indian Constitution articles and rights.

| Category | Articles Covered |
|----------|------------------|
| Right to Equality | Articles 14-18 |
| Right to Freedom | Articles 19-22 |
| Right Against Exploitation | Articles 23-24 |
| Right to Freedom of Religion | Articles 25-28 |
| Cultural & Educational Rights | Articles 29-30 |
| Right to Constitutional Remedies | Article 32 |

**Features**:
- Category-based browsing
- Article number search
- Source citations
- Plain-language explanations

---

### 6.4 Articles & Legal Guides

**Description**: Rich legal articles and how-to guides.

| Feature | Description |
|---------|-------------|
| WYSIWYG Editor | Rich text content creation |
| Section Support | Hierarchical content structure |
| Tags | Content categorization |
| Author Attribution | Article ownership and credits |
| Draft/Publish | Workflow for content creation |
| Version Control | Track content changes |

---

### 6.5 Lawyer Directory

**Description**: Verified lawyer profiles with specialization and location filtering.

| Feature | Description |
|---------|-------------|
| Verification System | Admin-verified lawyer profiles |
| Specializations | Family, Criminal, Corporate, Property, etc. |
| Location Filter | Search by city/state |
| Experience Filter | Years of practice |
| Fee Range | Hourly/consultation rates |
| Reviews & Ratings | Client feedback system |
| Contact Information | Phone, email, office address |

**Specializations**: Family Law, Criminal Law, Corporate Law, Property Law, Immigration, Tax Law, Consumer Law, Labor Law

---

### 6.6 Appointment Booking System

**Description**: Streamlined appointment booking with lawyers.

| Feature | Description |
|---------|-------------|
| Slot Management | Configurable time slots |
| Real-time Availability | Live slot checking |
| QR Code Cards | Digital appointment passes |
| PDF Generation | Downloadable appointment cards |
| Email Notifications | Appointment confirmations |
| Status Tracking | Pending → Approved → Completed |
| Cancellation | User-initiated cancellation |

**Appointment Flow**:
```
User selects lawyer → Choose date → Select time slot → Confirm booking
→ Email notification → Appointment card with QR code
```

---

### 6.7 Real-time Chat System

**Description**: Socket.io based chat between lawyers and clients.

| Feature | Description |
|---------|-------------|
| Room-based Chat | One room per appointment |
| Real-time Messages | Instant message delivery |
| Typing Indicators | Show when user is typing |
| Read Receipts | Message read status |
| Message Deletion | User can delete own messages |
| History | Persistent chat history |

---

### 6.8 Notification System

**Description**: Multi-channel user notifications.

| Channel | Description |
|---------|-------------|
| In-App | Real-time via Socket.io |
| Email | SMTP-based emails |
| Web Push | Browser push notifications |

**Notification Types**:
- Appointment updates
- New messages
- Lawyer responses
- System announcements

---

### 6.9 User Authentication

| Method | Description |
|--------|-------------|
| Local Auth | Username/password with bcrypt hashing |
| Google OAuth | Social login via Passport.js |
| Password Reset | Email-based token reset |
| Session Management | Express-session with MongoDB store |

---

## 7. Database Schema

### User Model
```javascript
{
  username: String (unique, required)
  email: String (unique, required)
  password: String (hashed)
  role: Enum ['user', 'lawyer', 'admin']
  isActive: Boolean (default: true)
  isGoogleUser: Boolean
  googleId: String
  profilePicture: String (Cloudinary URL)
  savedTerms: Array[String]
  appliedForLawyer: Boolean
  createdAt: Date
  updatedAt: Date
}
```

### LawyerProfile Model
```javascript
{
  user: ObjectId (ref: User)
  specialization: [String]
  licenseNumber: String
  yearsOfExperience: Number
  consultationFee: Number
  about: String
  languages: [String]
  officeAddress: String
  city: String
  state: String
  isVerified: Boolean (default: false)
  verificationDocuments: [String]
  availableSlots: [{
    day: String
    startTime: String
    endTime: String
  }]
}
```

### Appointment Model
```javascript
{
  user: ObjectId (ref: User)
  lawyer: ObjectId (ref: LawyerProfile)
  date: Date
  timeSlot: String
  status: Enum ['pending', 'approved', 'rejected', 'cancelled', 'completed']
  reason: String
  appointmentCard: {
    qrCode: String
    generatedAt: Date
  }
}
```

### Document Model
```javascript
{
  title: String (required)
  description: String
  state: String
  department: String
  guidelines: String
  requiredDocuments: [String]
  downloadLink: String
  applyOnlineLink: String
  category: String
  downloads: Number (default: 0)
}
```

### Right Model
```javascript
{
  title: String (required)
  articleNumber: String
  category: Enum ['equality', 'freedom', 'exploitation', 'religion', 'cultural', 'remedy']
  description: String
  fullText: String
  sourceLink: String
}
```

### ChatRoom Model
```javascript
{
  appointment: ObjectId (ref: Appointment)
  participants: [ObjectId (ref: User)]
  isActive: Boolean
  lastMessage: String
  lastMessageAt: Date
}
```

### Message Model
```javascript
{
  chatRoom: ObjectId (ref: ChatRoom)
  sender: ObjectId (ref: User)
  content: String
  isDeleted: Boolean
  readBy: [ObjectId]
}
```

---

## 8. API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | User registration |
| POST | `/api/users/login` | User login |
| GET | `/api/users/logout` | User logout |
| GET | `/api/users/auth/google` | Google OAuth login |
| GET | `/api/users/auth/google/callback` | Google OAuth callback |
| POST | `/api/users/request-reset` | Request password reset |
| POST | `/api/users/reset-password` | Reset password with token |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get current user profile |
| PUT | `/api/users/update` | Update profile |
| POST | `/api/users/profile-picture` | Upload profile picture |
| DELETE | `/api/users/profile-picture` | Delete profile picture |
| POST | `/api/users/apply-lawyer` | Apply for lawyer role |
| PUT | `/api/users/update-lawyer` | Update lawyer profile |

### Dictionary
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dictionary/:term` | Get AI explanation for term |
| POST | `/api/dictionary/save` | Save term to user profile |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents (filterable) |
| GET | `/api/documents/:id` | Get document details |
| POST | `/api/documents` | Create document (admin) |
| PUT | `/api/documents/:id` | Update document (admin) |
| DELETE | `/api/documents/:id` | Delete document (admin) |
| GET | `/api/documents/:id/download` | Track document download |

### Rights
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rights` | List all rights |
| GET | `/api/rights/:id` | Get right details |
| POST | `/api/rights` | Create right (admin) |
| PUT | `/api/rights/:id` | Update right (admin) |
| DELETE | `/api/rights/:id` | Delete right (admin) |

### Articles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/articles` | List all articles |
| GET | `/api/articles/:id` | Get article details |
| POST | `/api/articles` | Create article |
| PUT | `/api/articles/:id` | Update article |
| DELETE | `/api/articles/:id` | Delete article |

### Lawyers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lawyers` | List all lawyers |
| GET | `/api/lawyers/:id` | Get lawyer profile |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/appointment` | Book appointment |
| GET | `/api/appointment` | Get user appointments |
| PUT | `/api/appointment/status` | Update appointment status |
| DELETE | `/api/appointment/:id` | Cancel appointment |
| GET | `/api/appointment/slots` | Get available slots |
| GET | `/api/appointment/:id/card/download` | Download appointment PDF |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/admin/dashboard/users` | List all users |
| POST | `/api/admin/dashboard/users/toggle-status/:id` | Toggle user active status |
| POST | `/api/admin/dashboard/users/change-role/:id` | Change user role |
| GET | `/api/admin/dashboard/lawyers` | List lawyer applications |
| POST | `/api/admin/dashboard/lawyers/verify/:id` | Verify lawyer |
| GET | `/api/admin/dashboard/documents/export-csv` | Export documents CSV |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/rooms` | Get user's chat rooms |
| GET | `/chat/room/:appointmentId` | Get/create chat room |
| GET | `/chat/messages/:chatRoomId` | Get messages |
| DELETE | `/chat/messages/:messageId` | Delete message |
| DELETE | `/chat/room/:chatRoomId` | Delete chat room |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| POST | `/api/push/subscribe` | Subscribe to push notifications |
| DELETE | `/api/push/unsubscribe` | Unsubscribe |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=query` | Global search across resources |

---

## 9. Frontend Pages & Components

### Public Pages
| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with hero, features, lawyers, FAQ |
| `/about` | About | Platform information |
| `/privacy` | Privacy Policy | Privacy terms |
| `/terms` | Terms of Service | Usage terms |
| `/contributors` | Contributors | GitHub contributors |

### Legal Resources
| Route | Page | Description |
|-------|------|-------------|
| `/dictionary` | Dictionary | Legal term search with AI |
| `/documents` | Documents | State-wise legal forms |
| `/documents/:id` | Document Detail | Form guidelines and download |
| `/rights` | Rights | Constitutional rights listing |
| `/rights/:id` | Right Detail | Article details and text |
| `/articles` | Articles | Legal articles listing |
| `/articles/:id` | Article Detail | Full article content |
| `/articles/publish` | Publish Article | Create new article |
| `/lawyers` | Lawyers Directory | Browse verified lawyers |
| `/lawyers/:id` | Lawyer Profile | Lawyer details and reviews |

### User Dashboard
| Route | Page | Description |
|-------|------|-------------|
| `/appointments` | Appointments | User's bookings |
| `/chat` | Chat | Real-time messaging |
| `/notifications` | Notifications | User notifications |
| `/bookmarks` | Bookmarks | Saved items |
| `/settings` | Settings | Account settings |

### Authentication
| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | User login |
| `/register` | Register | User registration |
| `/forgot-password` | Forgot Password | Password reset request |
| `/reset-password/:token` | Reset Password | New password entry |

### Admin Panel
| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Dashboard | Admin dashboard |
| `/admin/users` | User Management | User list and control |
| `/admin/lawyers` | Lawyer Management | Lawyer verification |
| `/admin/documents` | Document Management | Document CRUD |
| `/admin/rights` | Rights Management | Rights CRUD |
| `/admin/articles` | Article Management | Article moderation |

### View Components
```
views/
├── layouts/
│   └── userLayout.ejs       # Main application layout
├── partials/
│   ├── navbar.ejs           # Navigation bar
│   ├── footer.ejs           # Page footer
│   ├── card-lawyer.ejs      # Lawyer card component
│   ├── card-document.ejs    # Document card component
│   ├── card-right.ejs       # Right card component
│   ├── card-article.ejs     # Article card component
│   ├── notification-dropdown.ejs
│   └── chat-widget.ejs
└── pages/
    ├── home.ejs
    ├── dictionary.ejs
    ├── documents.ejs
    ├── rights.ejs
    ├── articles.ejs
    ├── lawyers.ejs
    ├── appointments.ejs
    ├── chat.ejs
    └── ...
```

---

## 10. Authentication & Security

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Passport │────▶│  MongoDB │
│  Request │     │  Strategy │     │   Store  │
└──────────┘     └──────────┘     └──────────┘
```

**Supported Strategies**:
1. **Local Strategy**: Username + password with bcrypt
2. **Google OAuth 2.0**: Social authentication

### Security Measures

| Measure | Implementation |
|---------|----------------|
| **Helmet** | Security headers (CSP, X-Frame-Options, etc.) |
| **CORS** | Configurable cross-origin rules |
| **Rate Limiting** | express-rate-limit (100 req/5min per IP) |
| **XSS Protection** | xss-clean middleware |
| **NoSQL Injection** | express-mongo-sanitize |
| **HPP** | HTTP Parameter Pollution prevention |
| **Password Hashing** | bcrypt (10 rounds) |
| **Secure Cookies** | HTTP-only, Secure (production) |
| **Session Management** | express-session with connect-mongo |

### Environment Variables (Security)
```env
SESSION_SECRET=<random-64-char-string>
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
MISTRAL_API_KEY=<ai-api-key>
CLOUDINARY_API_SECRET=<cloud-storage-secret>
EMAIL_PASS=<smtp-password>
ADMIN_SECRET_KEY=<admin-bypass-key>
```

---

## 11. Environment Configuration

### Required Environment Variables

```env
# Server
PORT=8000

# Database
DB_URL=mongodb://localhost:27017/legalhub

# Session
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/users/auth/google/callback

# AI Services
MISTRAL_API_KEY=your-mistral-api-key
GEMINI_API_KEY=your-gemini-api-key

# Cloud Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# Email (SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
PUSH_CONTACT_EMAIL=mailto:your-email@example.com

# Admin
ADMIN_SECRET_KEY=your-admin-secret-key

# Development
USE_FAKE_DATA=true   # Set to false in production
```

---

## 12. Development & Deployment

### Installation

```bash
# Clone repository
git clone https://github.com/dipexplorer/LegalHuB.git
cd LegalHuB

# Install dependencies
npm install

# Copy environment file
cp .env.sample .env

# Fill in environment variables
# Edit .env with your API keys and secrets

# Start development server
npm run dev

# Or for production
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development with nodemon |
| `npm test` | Run test suite |
| `npm run test:coverage` | Generate coverage report |
| `npm run format` | Format code (Prettier + ESLint fix) |

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Database Seeding

```bash
# Seed documents
node init/seedDocuments.js

# Seed rights
node init/seedRights.js

# Seed sample users
node init/seedUsers.js
```

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure valid environment variables
- [ ] Set up MongoDB (Atlas or local)
- [ ] Configure Cloudinary for production
- [ ] Set up SMTP email service
- [ ] Enable HTTPS (reverse proxy like Nginx)
- [ ] Set up SSL certificates
- [ ] Configure DNS and domain
- [ ] Set up monitoring (logs, uptime)
- [ ] Enable rate limiting in production

---

## Appendix A: Feature Matrix

| Feature | Status | Priority |
|---------|--------|----------|
| Legal Dictionary (AI) | Implemented | High |
| Legal Documents | Implemented | High |
| Constitutional Rights | Implemented | High |
| Articles & Guides | Implemented | Medium |
| Lawyer Directory | Implemented | High |
| Appointment Booking | Implemented | High |
| Real-time Chat | Implemented | High |
| Notifications (Push) | Implemented | Medium |
| Google OAuth | Implemented | High |
| Admin Dashboard | Implemented | High |
| PDF Generation | Implemented | Medium |
| Email Notifications | Implemented | Medium |
| Search | Implemented | High |
| Bookmarks | Implemented | Medium |

---

## Appendix B: API Response Format

**Success Response**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error info"
}
```

---

## Appendix C: Role Permissions

| Permission | User | Lawyer | Admin |
|-----------|:----:|:------:|:-----:|
| View Dictionary | ✓ | ✓ | ✓ |
| Save Terms | ✓ | ✓ | ✓ |
| View Documents | ✓ | ✓ | ✓ |
| View Rights | ✓ | ✓ | ✓ |
| Publish Articles | ✗ | ✗ | ✓ |
| Manage Articles | ✗ | ✗ | ✓ |
| Manage Documents | ✗ | ✗ | ✓ |
| Manage Rights | ✗ | ✗ | ✓ |
| Book Appointments | ✓ | ✗ | ✓ |
| Receive Appointments | ✗ | ✓ | ✗ |
| Chat | ✓ | ✓ | ✓ |
| Verify Lawyers | ✗ | ✗ | ✓ |
| Manage Users | ✗ | ✗ | ✓ |

---

*This documentation was generated for LegalHuB v1.0.0*