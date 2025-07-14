# AI API Test App

A versatile Next.js application for testing and comparing different AI language models through a unified interface.

![Next.js](https://img.shields.io/badge/Next.js-15.2.2-black) ![React](https://img.shields.io/badge/React-19.0.0-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0.12-38b2ac)

## Features

- 🤖 Test multiple AI models including:
  - OpenAI GPT models
  - Anthropic Claude models
  - Google Gemini models
  - Llama models via Groq
  - Custom API endpoints
- 💬 Conversation management with history
- ⚙️ Configurable settings for each model
- 📊 Performance metrics (token usage, response time)
- 📱 Responsive design for both desktop and mobile
- 🖥️ Interactive terminal for system logs
- 🔄 Temporary chat mode for testing without saving

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ai-api-test-app.git
   cd ai-api-test-app
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Create a `.env.local` file in the root directory with your API keys (optional)
   ```
   # Example:
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GOOGLE_API_KEY=your_google_api_key
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter your API key for the model you want to test in the Settings modal
2. Select a model from the dropdown menu
3. Type your message in the chat interface
4. View the AI's response and performance metrics
5. Create and manage multiple conversations using the sidebar
6. Toggle the terminal to view system logs

## Architecture

- **Next.js**: React framework for server-side rendering and API routes
- **React**: Frontend UI library
- **TailwindCSS**: Utility-first CSS framework for styling
- **API Route**: Secure proxy to communicate with AI providers
- **LocalStorage**: For persistent conversation history

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) for the React framework
- [TailwindCSS](https://tailwindcss.com/) for styling
- Various AI providers for their APIs
