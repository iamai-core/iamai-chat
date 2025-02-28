# Iamai-chat
<img width="600" alt="iamai_logo_2" src="https://github.com/user-attachments/assets/019496ef-5a16-4619-86b2-c5b1dbd653b2" />

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Server](https://github.com/ggerganov/llama.cpp/actions/workflows/server.yml/badge.svg)](https://github.com/ggerganov/llama.cpp/actions/workflows/server.yml)

----
## GUI Project Overview
This project focuses on providing an engaging and interactive front-end experience for the IAMAI project. The GUI offers a sleek chat interface that enables users to:

- Communicate seamlessly with IAMAI.
- Send images, videos, files, and folders that the AI understands.
- Customize various chat settings to enhance user experience.
- Create and manage new chats for different purposes.
- Enjoy modern design elements, including fun facial expressions displayed on the front page for the AI model.

  Requirements
------------
1. Git (to clone the repository and submodules)
2. CMake >= 3.15
3. C++ Compiler supporting C++17
4. CUDA (Version 12 recommended) if you want GPU acceleration
   - You should have the environment variable CUDA_PATH set to your CUDA installation on Windows.
   - On Windows, the build scripts will attempt to copy CUDA DLLs (cudart64_12.dll, cublas64_12.dll, cublasLt64_12.dll) to the output directory automatically.


## Setup and Build the GUI project
We would reccomend Visual Studio Code for this project. Follow the steps below to set up and run the GUI:
- Open a terminal
- Run the following command to build the project: "npm run build"
- Open your CMake Tab, and Launch the CMake.
- Open Localhost:8080 in your web browser of choice
