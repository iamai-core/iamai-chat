
#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include <filesystem>
#include "iamai-core/core/interface.h"
#include "crow.h"

namespace fs = std::filesystem;

int main() {
    crow::SimpleApp app;

    // Initialize the AI interface
    std::unique_ptr<Interface> ai;
    try {
        fs::path model_path = fs::absolute("../../../iamai-core/models/Llama-3.2-1B-Instruct-Q4_K_M.gguf");
        std::cout << "Loading model from: " << model_path << std::endl;
        ai = std::make_unique<Interface>(model_path.string());

        // Configure the model parameters if needed
        ai->setMaxTokens(128);  // Adjust based on your needs
        ai->setThreads(1);      // Adjust based on your hardware
        ai->setBatchSize(1);    // Adjust based on your needs

    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize AI: " << e.what() << std::endl;
        return 1;
    }

    // WebSocket endpoint
    CROW_WEBSOCKET_ROUTE(app, "/ws")
        .onopen([](crow::websocket::connection& conn) {
            try {
                conn.send_text("Server Connected");
            } catch (const std::exception& e) {
                std::cerr << "Error in onopen: " << e.what() << std::endl;
            }
        })
        .onclose([](crow::websocket::connection& conn, const std::string& reason) {
            // Connection cleanup if needed
        })
        .onmessage([&ai](crow::websocket::connection& conn, const std::string& data, bool is_binary) {
            try {
                if (!is_binary) {
                    // Generate AI response
                    std::string response = ai->generate(data);
                    conn.send_text(response);
                }
            } catch (const std::exception& e) {
                std::cerr << "Error processing message: " << e.what() << std::endl;
                conn.send_text("Sorry, I encountered an error processing your message.");
            }
        });

    app.port(8080).run();
    return 0;
}
