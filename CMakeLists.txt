cmake_minimum_required(VERSION 3.15)
project(iamai-chat C CXX)

# Set C/C++ standards
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Keep existing output directory
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Copy CUDA DLLs
set(CUDA_DLL_VERSION "12")
add_custom_target(copy_cuda_dlls ALL
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/$<CONFIG>
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "$ENV{CUDA_PATH}/bin/cudart64_${CUDA_DLL_VERSION}.dll"
        "$ENV{CUDA_PATH}/bin/cublas64_${CUDA_DLL_VERSION}.dll"
        "$ENV{CUDA_PATH}/bin/cublasLt64_${CUDA_DLL_VERSION}.dll"
        ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/$<CONFIG>
    COMMENT "Copying CUDA DLLs to bin/${CONFIG} directory"
)

# Enable CUDA but disable other acceleration
set(GGML_CUDA ON CACHE BOOL "Enable CUDA" FORCE)
set(GGML_METAL OFF CACHE BOOL "disable Metal" FORCE)
set(GGML_OPENBLAS OFF CACHE BOOL "disable OpenBLAS" FORCE)

# Add llama.cpp and whisper.cpp subdirectories
add_subdirectory(${CMAKE_SOURCE_DIR}/iamai-core/llama.cpp ${CMAKE_BINARY_DIR}/llama.cpp)
add_subdirectory(${CMAKE_SOURCE_DIR}/iamai-core/whisper.cpp ${CMAKE_BINARY_DIR}/whisper.cpp)

# Windows specific settings for Crow/ASIO
if(WIN32)
    add_definitions(-D_WIN32_WINNT=0x0601)
    add_definitions(-D_CRT_SECURE_NO_WARNINGS)
    add_definitions(-DASIO_STANDALONE)
endif()

# Add Crow as a header-only library
add_library(Crow INTERFACE)
target_include_directories(Crow INTERFACE ${CMAKE_SOURCE_DIR}/include)

# Find required Windows libraries
find_library(SHELL32_LIBRARY Shell32)
find_library(OLE32_LIBRARY Ole32)

# Create the executable
add_executable(iamai-chat
    iamai-chat.cpp
    iamai-core/core/interface.cpp
    iamai-core/core/folder_manager.cpp
    iamai-core/core/whisper_interface.cpp
)

# Add include directories
target_include_directories(iamai-chat
    PUBLIC
    ${CMAKE_SOURCE_DIR}/include  # For Crow headers
    ${CMAKE_SOURCE_DIR}/iamai-core  # For iamai-core headers
    ${CMAKE_SOURCE_DIR}/iamai-core/whisper.cpp  # For whisper headers
)

# Link all libraries
target_link_libraries(iamai-chat
    PRIVATE
    llama
    whisper
    Crow
    ${SHELL32_LIBRARY}
    ${OLE32_LIBRARY}
    Threads::Threads
)

# Find and link threads
find_package(Threads REQUIRED)

# Optional: Add OpenSSL if needed
find_package(OpenSSL)
if(OpenSSL_FOUND)
    target_link_libraries(iamai-chat PRIVATE OpenSSL::SSL OpenSSL::Crypto)
endif()

# Set additional compiler flags
if(MSVC)
    target_compile_options(iamai-chat PRIVATE /W4)
else()
    target_compile_options(iamai-chat PRIVATE -Wall -Wextra)
endif()

# Ensure ASIO is found
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/include/asio.hpp")
    message(WARNING "ASIO headers not found. Please ensure ASIO is properly installed in the include directory.")
endif()

# Ensure Crow is found
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/include/crow.h")
    message(WARNING "Crow headers not found. Please ensure Crow is properly installed in the include directory.")
endif()