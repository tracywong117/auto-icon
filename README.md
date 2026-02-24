# AutoIcon: Bullet Journal Stamp & Vector Generator

AutoIcon is a modern web application designed to create pristine, minimalist line-art icons and vector rubber stamps. Using Google's Gemini 3.0 Pro Vision for generation and advanced tracing algorithms for vectorization, it transforms ideas or raster images into clean, scalable SVG and high-resolution PNG assets.

## ✨ Features

- **AI Icon Generation**: Generate minimalist, professional line-art icons from text descriptions using Gemini 3.0 Pro Vision.
- **Custom Prompting**: Fully customizable prompts with support for `${itemName}` placeholders and prompt shortcuts.
- **Advanced Vectorization**: Convert PNGs to SVGs using a robust Sharp + Potrace pipeline with noise reduction and artifact filtering.
- **Interactive Workspace**:
  - Live preview artboard.
  - Real-time color customization with persistent shortcuts.
  - Design scaling and transformation.
- **Export Options**: 
  - Scalable Vector Graphics (SVG).
  - High-resolution (1024x1024) PNG with custom ink colors.
- **Persistent Storage**: All history, custom prompts, and color shortcuts are saved locally in your browser.
- **Modern UI**: A responsive, glassmorphic interface built with Next.js and Tailwind CSS (Vanilla CSS).

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A Google Vertex AI / Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tracywong117/auto-icon.git
   cd auto-icon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment:
   Create a `.env` file in the root directory and add your API key:
   ```env
   VERTEX_AI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **AI Model**: [Gemini 3.0 Pro Vision](https://deepmind.google/technologies/gemini/)
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/)
- **Vectorization**: [Potrace](https://www.npmjs.com/package/potrace)
- **Styling**: Vanilla CSS with Glassmorphism

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
