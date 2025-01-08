cmake_minimum_required(VERSION 3.15)
project(iamai-chat C CXX)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

add_subdirectory(iamai-core/llama.cpp)

add_executable(iamai-chat iamai-chat.cpp iamai-core/interface.cpp)
target_link_libraries(iamai-chat llama)

target_include_directories(${PROJECT_NAME} PUBLIC iamai-core)
