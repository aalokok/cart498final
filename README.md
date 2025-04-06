# The Actual Informer

A web application that dynamically fetches real current news stories and uses generative AI to amplify, distort, and exaggerate their content.

## Features

- Automatically fetches real-time news headlines and articles
- Transforms news articles using AI to create exaggerated versions
- Generates AI images related to the transformed articles
- Creates synthetic audio news reports

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **AI Services**: OpenAI GPT-4o (text), DALL-E 3 (images), ElevenLabs (audio)
- **Database**: MongoDB
- **Frontend**: Vue.js (planned)

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env` file (see `.env.example`)
4. Run in development mode: `npm run dev`
5. Build for production: `npm run build`
6. Run in production mode: `npm start`

## Project Structure

```
src/
  ├── config/        # Configuration files
  ├── controllers/   # Route controllers
  ├── models/        # Database models
  ├── routes/        # API routes
  ├── services/      # Business logic and external service integration
  ├── utils/         # Utility functions
  └── server.ts      # Entry point
```

## API Endpoints (Planned)

- `GET /api/news` - Get all transformed news articles
- `GET /api/news/:id` - Get specific news article
- `POST /api/refresh` - Force refresh news from external API 