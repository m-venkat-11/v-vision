# V-VISION — Live Interactive C Code Execution Visualizer

![V-VISION Banner](https://img.shields.io/badge/V--VISION-v2.0_Pro-6366f1?style=for-the-badge&logo=c&logoColor=white)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Vercel Ready](https://img.shields.io/badge/deployed%20with-Vercel-black?style=for-the-badge&logo=vercel)

**V-VISION** is a live, interactive C code execution engine and memory visualizer. Paste **any valid C code** and watch it execute line-by-line with dynamic animations of variables, 1D & 2D arrays, pointers, structs, call stacks, recursion trees, and dynamic heap memory (`malloc`/`free`).

---

## 🌟 Key Features

- **⚡ Universal C Execution**: Powered by an isolated GDB MI2 execution module running GCC C11 with `-lm` (math library).
- **📊 1D & 2D Array Visualization**: Hexadecimal RAM memory offsets (`+0x00`, `+0x04`), index markers, dynamic multi-pointer arrows (`i ↓`, `j ↓`), active comparison glowing brackets, and animated swap diff pills.
- **🎯 Pointer & Memory Mapping**: Address cards, pointer-to-target animated link arrows, dereference pulse indicators (`*ptr`), and memory mutation breadcrumbs.
- **📦 Struct Composite Views**: Struct cards with sub-field mini-tables and animated attribute transitions.
- **📚 Call Stack & Branching Recursion Tree**: Sliding vertical stack frames on function entry/exit, plus an interactive visual branching call tree for recursive algorithms.
- **💾 Dynamic Heap Memory Tracking**: Visual cards for heap allocations (`malloc`/`free`) with real-time memory leak warnings.
- **🔁 Loop & Branch Status Radar**: Real-time iteration counter, substituted boolean condition breakdown (`✅ TRUE / ❌ FALSE`).
- **🕹️ Playback Controls**: Granular speed adjustment (`0.25x` to `2x`), auto-play countdown bar, scrubber slider, and clickable breakpoint (`🔴`) stepping.
- **🖥️ Integrated Console & Trace Log**: Simulated standard output (`$ ./program`) and chronological click-to-jump execution trace table.

---

## 🏗️ Project Architecture

```
v-vision/
├── frontend/             # React + Vite + Monaco Editor + Motion UI
│   ├── src/
│   │   ├── components/   # Visual canvas, array, pointer, struct, stack views
│   │   ├── hooks/        # Playback timing, diff engine, scrubbing
│   │   ├── data/         # Preset algorithms & test suites
│   │   └── index.css     # Obsidian developer workbench design system
│   ├── package.json
│   └── vite.config.js
├── backend/              # Node.js + Express + Isolated GDB Execution Engine
│   ├── src/
│   │   ├── services/     # gdbRunner.js, miParser.js, timelineBuilder.js, whyEngine.js
│   │   └── routes/       # POST /api/execute
│   └── package.json
├── vercel.json           # Vercel deployment configuration
├── package.json          # Root workspace configuration
└── README.md
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** (v18+)
- **GCC & GDB** (MinGW on Windows, or standard GCC/GDB on Linux/macOS)

### Installation & Running

1. **Clone the repository**:
   ```bash
   git clone https://github.com/m-venkat-11/v-vision.git
   cd v-vision
   ```

2. **Install dependencies**:
   ```bash
   # Install frontend dependencies
   cd frontend && npm install
   
   # Install backend dependencies
   cd ../backend && npm install
   ```

3. **Start the development servers**:
   ```bash
   # Terminal 1: Backend Server (port 3001)
   cd backend
   node src/index.js

   # Terminal 2: Frontend Client (port 5173)
   cd frontend
   npm run dev
   ```

4. Open your browser at **`http://localhost:5173/`**.

---

---

## ☁️ Deployment Guide

### 1. Deploy Backend to Render (Docker Web Service)

Because V-VISION compiles and steps through arbitrary C code with **GCC** and **GDB**, the backend runs inside an isolated Docker container on Render.

1. Go to [render.com](https://render.com) and log in.
2. Click **"New +"** → **"Web Service"** (or use **"Blueprint"** with `render.yaml`).
3. Connect your GitHub repository: `m-venkat-11/v-vision`.
4. Configure the Web Service:
   - **Name**: `v-vision-backend`
   - **Region**: Any (e.g., Oregon)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (or `./backend`)
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Docker Build Context**: `./backend`
   - **Instance Type**: **Free**
5. **Environment Variables**:
   - `PORT`: `10000` (Render defaults to this)
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key for AI summaries & Question Mode.
6. Click **"Deploy Web Service"**.
7. Once deployed, Render will provide your public URL:
   `https://v-vision-backend.onrender.com`

---

### 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New Project"** and import `m-venkat-11/v-vision`.
3. Vercel automatically detects the Vite framework and `vercel.json`:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (or leave default with root `vercel.json`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - Add `VITE_API_URL` = `https://v-vision-backend.onrender.com/api`
     *(replace with your actual Render backend URL)*
5. Click **"Deploy"**.

Your frontend is now live on Vercel and communicates securely with your Render backend! Every `git push` to `main` will automatically trigger fresh builds on both Vercel and Render.

---

## 🧪 Verified Test Suites

- **Loop & Array (Find Max)**: `int a[] = {4, 9, 2}` (9 steps)
- **Pointer Swap**: `swap(int *a, int *b)` (7 steps)
- **Struct Point**: `struct Point { int x; int y; }` (4 steps)
- **Recursion Factorial**: `fact(int n)` (8 steps)
- **Dynamic Heap Memory**: `malloc` and `free` block tracking (5 steps)
- **2D Matrix Transpose**: 2D array nested loops (6 steps)
- **Math Library (`<math.h>`)**: `sqrt()`, `pow()`, `-lm` linking (5 steps)
- **Strings (`<string.h>`)**: `strlen()`, `char[]` mutations (5 steps)
- **While & Do-While Loops**: with conditional `break` (16 steps)
- **Switch Case Statement**: multi-branch evaluation (6 steps)
- **Pointer Arithmetic**: `ptr++`, `*ptr = 99` (6 steps)
- **Scanf Input Reading**: in-memory non-blocking stream (5 steps)

---

## 📄 License

MIT © [M.Venkat](https://github.com/m-venkat-11)
