# Nyaya AI – Indian Legal Assistant

## Setup Guide

### Step 1: Install Ollama
- **Linux / macOS**: `curl -fsSL https://ollama.com/install.sh | sh`
- **Windows**: Download from [https://ollama.com/download](https://ollama.com/download)

### Step 2: Start Ollama Server
```bash
ollama serve
```

### Step 3: Pull a Language Model
Recommended models for Indian legal analysis:
```bash
ollama pull llama3.2         # Fast, good for Indian languages
ollama pull qwen2.5          # Excellent multilingual + Hindi
ollama pull mistral          # Lightweight, fast
ollama pull deepseek-r1      # Best reasoning for legal analysis
```

### Step 4: Enable CORS (if needed)
If you encounter connection issues, set the environment variable before starting:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

### Step 5: Open the App
Open `client/index.html` in your browser.

## Features
- **AI Chat Assistant**: General legal help with Indian law.
- **Know Your Rights**: Explore fundamental rights under the Indian Constitution.
- **Case Analyzer**: Structured analysis of legal situations.
- **Draft Documents**: Generate drafts for Legal Notices, Sale Agreements, etc.
- **Legal References**: Quick access to key acts like IPC, BNS, RTI, and more.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+).
- **Backend**: Ollama (running locally).
- **Fonts**: Playfair Display, DM Sans, JetBrains Mono.
