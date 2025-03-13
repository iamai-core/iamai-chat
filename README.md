# Iamai-chat
<img width="600" alt="iamai_logo_2" src="https://github.com/user-attachments/assets/019496ef-5a16-4619-86b2-c5b1dbd653b2" />

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Server](https://github.com/ggerganov/llama.cpp/actions/workflows/server.yml/badge.svg)](https://github.com/ggerganov/llama.cpp/actions/workflows/server.yml)

----
# GUI Project Overview
This project delivers an engaging and interactive front-end experience for the IAMAI project. The GUI offers a sleek chat interface with the following features:

- **Seamless Communication:** Users can easily interact with IAMAI.
- **Media Sharing:** Send images, videos, files, and folders that the AI can process.
- **Customizable Chat Settings:** Personalize the chat environment for an enhanced user experience.
- **Multi-Chat Management:** Create and manage multiple conversations for different purposes.
- **Modern Design Elements:** Enjoy a visually appealing UI with fun facial expressions displayed for the AI model on the homepage.
- **Speech To Text Feature:** Users are able to record their own audio and send it to our AI, for it to be transcribed as a text to the chat afterwards.

## Requirements
Ensure you have the following tools and dependencies installed:

- **Git** (for cloning the repository and managing submodules)
- **CMake** (version 3.15 or higher)
  - When using visual studio code make sure you have the CMake tools extension
  - Open the CMake tab and click the configuration drop down and select `Visual Studio Enterprise 2022 Release - amd64`
- **C++ Compiler** (supporting C++17)
- **CUDA** (version 12 recommended) for GPU acceleration (optional)

**Note for Windows Users:**
    - Ensure the environment variable `CUDA_PATH` points to your CUDA installation.
    - The build scripts will automatically attempt to copy CUDA DLLs (`cudart64_12.dll`, `cublas64_12.dll`, `cublasLt64_12.dll`) to the output directory.

## Setup and Build Instructions
We recommend using **Visual Studio Code** for this project. Follow these steps to set up and run the GUI:

### Build Process
1. **Switch to the `prod-zip` branch** for both **Core** and **Chat** repositories.
2. Use **Visual Studio Code** for building the project.

### Building Steps
1. **Build the project & static files.**
   - Open a terminal
   - Go to the correct directory `cd gui`
   - Run the following command to downlaod dependencies: `npm i --legacy-peer-deps` or `npm i --force`
   - Run the following command to finish dependencies: `npm i`
   - Run the following command to build the project: `npm run build`
   - Open your CMake Tab, and Launch the CMake.
   - Open Localhost:8080 in your web browser of choice
2. Navigate to the following folder:
   ```
   iamai chat > build > bin > debug
   ```
3. Retrieve the `.dll` files from that folder and create an empty folder `iamai` or whatever you decide.
4. In the `iamai-zip` folder, add the `.exe` file and the retrieved `.dll` files.
5. Retrieve the static files build folder from:
   ```
   iamai chat > gui > build
   ```
6. Place this folder into the `iamai` folder.
7. Then Add the LLM AI model you used to the `iamai` folder.

    - Example:
    - Find an LLM model `.gguf` file from `https://huggingface.co/models` like our `llama-3.2-1b-instruct-q4_k_m.gguf`
    - This is a link to the model we used
    ```
    https://huggingface.co/hugging-quants/Llama-3.2-1B-Instruct-Q4_K_M-GGUF/resolve/main/llama-3.2-1b-instruct-q4_k_m.gguf?download=true
    ```
    
8. Add the Whisper model to the created folder by retrieving it from:
    ```
    iamai chat > iamai core > wisper.cpp > models
    ```
    - The file is named **ggml-base.en.bin**
9. Zip the `iamai` folder for distribution.
