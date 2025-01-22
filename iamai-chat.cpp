#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include "crow.h"
#include "iamai-core/core/folder_manager.h"
#include "iamai-core/core/model_manager.h"

using namespace iamai;

int main() {
    crow::SimpleApp app;
    
    // Initialize the folder structure
    try {
        auto& folder_manager = FolderManager::getInstance();
        if (!folder_manager.createFolderStructure()) {
            throw std::runtime_error("Failed to create folder structure");
        }
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize folder structure: " << e.what() << std::endl;
        return 1;
    }

    // Initialize the Model Manager
    std::unique_ptr<ModelManager> model_manager;
    try {
        model_manager = std::make_unique<ModelManager>();
        
        // Get available models
        auto models = model_manager->listModels();
        if (models.empty()) {
            std::cout << "No models found in models directory" << std::endl;
        } else {
            // Load the first available model as default
            if (!model_manager->switchModel(models[0])) {
                throw std::runtime_error("Failed to load default model");
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize Model Manager: " << e.what() << std::endl;
        return 1;
    }

    // REST endpoint for listing models
    CROW_ROUTE(app, "/models")
    .methods("GET"_method)
    ([&model_manager]() {
        crow::json::wvalue response;
        response["models"] = model_manager->listModels();
        return response;
    });

    // REST endpoint for switching models
    CROW_ROUTE(app, "/models/switch")
    .methods("POST"_method)
    ([&model_manager](const crow::request& req) {
        auto x = crow::json::load(req.body);
        if (!x) {
            return crow::response(400, "Invalid JSON");
        }
        
        std::string model_name = x["model"].s();
        if (model_manager->switchModel(model_name)) {
            return crow::response(200, "Model switched successfully");
        } else {
            return crow::response(400, "Failed to switch model");
        }
    });

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
        .onmessage([&model_manager](crow::websocket::connection& conn, const std::string& data, bool is_binary) {
            try {
                if (!is_binary && model_manager->getCurrentModel()) {
                    std::string response = model_manager->getCurrentModel()->generate(data);
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