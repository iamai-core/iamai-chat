cmake_minimum_required(VERSION 3.15)
project(iamai-chat C CXX)

add_executable(${PROJECT_NAME} main.cpp)

target_include_directories(${PROJECT_NAME} PUBLIC iamai-core)
