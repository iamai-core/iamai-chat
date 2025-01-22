#include <iostream>
#include <stdexcept>
#include <chrono>
#include <string>
#include <limits>
#include "iamai-core/core/interface.h"

int main(int argc, char** argv) {
    try {
        std::cout << "Starting model initialization...\n" << std::endl;

        // Initialize interface with model path
        const std::string model_path = "../../../models/Llama-3.2-1B-Instruct-Q4_K_M.gguf";
        Interface myInterface(model_path);

        // Configure generation parameters
        myInterface.setMaxTokens(256);    // Generate up to 256 tokens
        myInterface.setThreads(1);        // Reduced CPU threads since we're using GPU
        myInterface.setBatchSize(1);    // Increased batch size for GPU efficiency

        std::cout << "\nModel initialized. Ready for input.\n" << std::endl;

        // Get prompt from user
        std::cout << "Enter your prompt (press Enter twice when done):\n";
        std::string prompt;
        std::string line;

        // Read lines until an empty line is entered
        while (std::getline(std::cin, line) && !line.empty()) {
            prompt += line + "\n";
        }

        // Remove the last newline if it exists
        if (!prompt.empty() && prompt.back() == '\n') {
            prompt.pop_back();
        }

        std::cout << "\nGenerating response for prompt: " << prompt << "\n" << std::endl;

        // Time the generation
        auto start = std::chrono::high_resolution_clock::now();

        // Generate text
        std::string result = myInterface.generate(prompt);

        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> diff = end - start;

        std::cout << "Generated text: " << result << std::endl;
        std::cout << "\nGeneration took " << diff.count() << " seconds" << std::endl;
        std::cout << "Tokens per second: " << 256.0 / diff.count() << std::endl;

        return 0;
    }
    catch (const std::exception &e)
    {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}

// #define ASIO_STANDALONE
// #include <iostream>
// #include <stdexcept>
// #include <filesystem>
// #include "iamai-core/core/interface.h"
// #include "crow.h"

// namespace fs = std::filesystem;

// int main() {
//     crow::SimpleApp app;

//     // Initialize the AI interface
//     std::unique_ptr<Interface> ai;
//     try {
//         fs::path model_path = fs::absolute("../../../iamai-core/models/Llama-3.2-1B-Instruct-Q4_K_M.gguf");
//         std::cout << "Loading model from: " << model_path << std::endl;
//         ai = std::make_unique<Interface>(model_path.string());

//         // Configure the model parameters if needed
//         ai->setMaxTokens(128);  // Adjust based on your needs
//         ai->setThreads(4);      // Adjust based on your hardware
//         ai->setBatchSize(32);    // Adjust based on your needs

//     } catch (const std::exception& e) {
//         std::cerr << "Failed to initialize AI: " << e.what() << std::endl;
//         return 1;
//     }

//     // WebSocket endpoint
//     CROW_WEBSOCKET_ROUTE(app, "/ws")
//         .onopen([](crow::websocket::connection& conn) {
//             try {
//                 conn.send_text("Server Connected");
//             } catch (const std::exception& e) {
//                 std::cerr << "Error in onopen: " << e.what() << std::endl;
//             }
//         })
//         .onclose([](crow::websocket::connection& conn, const std::string& reason) {
//             // Connection cleanup if needed
//         })
//         .onmessage([&ai](crow::websocket::connection& conn, const std::string& data, bool is_binary) {
//             try {
//                 if (!is_binary) {
//                     // Generate AI response
//                     std::string response = ai->generate(data);
//                     conn.send_text(response);
//                 }
//             } catch (const std::exception& e) {
//                 std::cerr << "Error processing message: " << e.what() << std::endl;
//                 conn.send_text("Sorry, I encountered an error processing your message.");
//             }
//         });

//     app.port(8080).run();
//     return 0;
// }
