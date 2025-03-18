# Ollama-Chat
This is a very simple GUI made for my personal use of Ollama.

A simple, elegant chat interface for your local Ollama AI models. Available as a native macOS application or a standalone HTML file.

## Features

- 💬 Clean, intuitive chat interface similar to ChatGPT/Claude
- 🤖 Connect to your local Ollama server
- 📋 Select from all your available models
- 🎛️ Adjust temperature and token parameters
- 📤 Export conversations as markdown (in the macOS app)
- 🌓 Dark mode support
- 💻 Code formatting & syntax highlighting

## Quick Start Options

### Option 1: Standalone HTML Version

The simplest way to use Ollama Chat - just save and open the HTML file:

1. Download `ollama-simple-chat.html` from this repository
2. Make sure Ollama is running on your computer (`ollama serve` in terminal)
3. Open the HTML file in your web browser
4. Click "Connect" to connect to your local Ollama server

### Option 2: macOS Application

For a native macOS experience:

1. Download the latest `.dmg` or `.zip` from the [Releases](https://github.com/DolphinsAreWeird/Ollama-Chat/releases) page
2. Open the `.dmg` and drag to your Applications folder (or unzip the `.zip`)
3. Make sure Ollama is running (`ollama serve` in terminal)
4. Launch the app from your Applications folder

## Building from Source

### Prerequisites

- Node.js and npm installed
- Ollama installed on your computer

### Building the macOS App

```bash
# Clone the repository
git clone https://github.com/DolphinsAreWeird/Ollama-Chat.git
cd ollama-chat

# Install dependencies
npm install

# Run in development mode
npm start

# Build macOS application
npm run build:mac

# The built app will be in the dist folder
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by ChatGPT and other modern AI chat interfaces.
- Thanks to the open-source community for their contributions.

