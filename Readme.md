# Medisynn Frontend

The web app for **Medisynn**, a healthcare platform with an **AI-powered health assessment**. Create an account, verify your email with an OTP, and get an AI-generated health assessment based on your symptoms.


The server lives in a separate repository: **Medisynn-Backend**.

## Try it

You don't need to set anything up to try Medisynn. Just open the live site:

**https://medisynncare24.netlify.app/**

Sign up, verify the OTP sent to your email, and you can start your health assessment right away. The steps below are only for running the app locally for development.

## Features

- **AI health assessment** powered by Google Gemini 2.5 Flash (via the backend).
- **Secure authentication** with JWT stored in httpOnly cookies.
- **Email OTP verification**, sent by the backend through the Brevo HTTP API.
- **Responsive UI** that works on desktop and mobile browsers.

## Tech stack

| Area | Tools |
| --- | --- |
| UI | <React / Vite / Tailwind CSS: edit as per your project> |
| Backend (separate repo) | Node.js, Express, MongoDB, JWT |
| AI | Google Gemini 2.5 Flash |
| Email | Brevo HTTP API (OTP emails) |
| Hosting | Netlify (frontend), Render (backend) |

## Getting started

### Prerequisites

- Node.js (LTS)
- npm (comes with Node.js)
- The Medisynn backend running (see the **Medisynn-Backend** repository)

### Clone

```bash
git clone https://github.com/aditya79373/Medisynn-Frontend.git
cd Medisynn-Frontend
```

### Install and run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

### Environment variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:5000
```

For production, point `VITE_API_URL` at your deployed backend URL (for example your Render service).

### Build for the web

```bash
npm run build
npm run preview       # optional: preview the production build
```



## Scripts

| Script | What it does |
| --- | --- |
| `dev` | Start the Vite dev server |
| `build` | Production build |
| `preview` | Preview the production build |

## Notes

- Do not commit `.env` files.
- This app gives AI-generated suggestions only. It is **not a substitute for professional medical advice**.
- The backend's `CLIENT_URL` must match the frontend URL, otherwise cookies and CORS will not work.
