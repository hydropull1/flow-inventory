# Product Scanner

A simple one-page web app that uploads a shelf or inventory photo, sends it to the Claude API for vision analysis, and lists detected products with counts and low-stock flags.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Add your API key**

   Copy `.env.example` to `.env` and set your [Anthropic API key](https://console.anthropic.com/):

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Run the server**

   ```bash
   npm start
   ```

4. Open **http://localhost:3000** in your browser, upload a photo, and click **Analyze products**.

## How it works

- The browser uploads an image to a small Express backend (so your API key never goes to the client).
- The server calls Claude with the image and asks for structured JSON: product names, counts, and stock levels (`ok`, `low`, `critical`).
- Results render as a clean list with badges for low or critical stock.

## Notes

- Images are limited to 10 MB.
- Analysis quality depends on photo clarity and how visible products are in the frame.
- Uses `claude-sonnet-4-20250514` for vision; you can change the model in `server.js`.
