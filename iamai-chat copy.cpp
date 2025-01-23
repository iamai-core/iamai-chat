#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include "crow.h"
#include "iamai-core/core/folder_manager.h"
#include "iamai-core/core/model_manager.h"
using namespace iamai;

void add_cors_headers(crow::response& res) {
    std::cout << "Adding CORS headers to response with status " << res.code << std::endl;
    
    // Set headers directly in the response
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Accept");
    res.set_header("Access-Control-Max-Age", "3600");
    
    // Log the headers we just set
    std::cout << "CORS headers set for response" << std::endl;
}

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
        auto models = model_manager->listModels();
        if (models.empty()) {
            std::cout << "No models found in models directory" << std::endl;
        } else {
            if (!model_manager->switchModel(models[0])) {
                throw std::runtime_error("Failed to load default model");
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize Model Manager: " << e.what() << std::endl;
        return 1;
    }

    // Handle OPTIONS for /models
    CROW_ROUTE(app, "/models").methods(crow::HTTPMethod::Options)([](const crow::request& req) {
        std::cout << "Handling OPTIONS request for /models" << std::endl;
        crow::response res;
        add_cors_headers(res);
        res.code = 204; // No content for OPTIONS
        return res;
    });

    // GET models endpoint
    CROW_ROUTE(app, "/models").methods(crow::HTTPMethod::Get)([&model_manager]() {
        std::cout << "Handling GET request for /models" << std::endl;
        
        crow::response res;
        crow::json::wvalue response_body;
        response_body["models"] = model_manager->listModels();
        
        res.write(response_body.dump());
        res.code = 200;
        res.set_header("Content-Type", "application/json");
        add_cors_headers(res);
        
        std::cout << "Returning models response with body: " << response_body.dump() << std::endl;
        return res;
    });

    // Handle OPTIONS for /models/switch
    CROW_ROUTE(app, "/models/switch").methods(crow::HTTPMethod::Options)([](const crow::request& req) {
        std::cout << "Handling OPTIONS request for /models/switch" << std::endl;
        crow::response res;
        add_cors_headers(res);
        res.code = 204; // No content for OPTIONS
        return res;
    });

    // Model switching endpoint
    CROW_ROUTE(app, "/models/switch").methods(crow::HTTPMethod::Post)([&model_manager](const crow::request& req) {
        std::cout << "Handling POST request for /models/switch" << std::endl;
        
        crow::response res;
        res.set_header("Content-Type", "application/json");
        add_cors_headers(res);

        try {
            auto x = crow::json::load(req.body);
            if (!x) {
                res.code = 400;
                res.write("{\"error\": \"Invalid JSON\"}");
                return res;
            }
            
            std::string model_name = x["model"].s();
            std::cout << "Attempting to switch to model: " << model_name << std::endl;
            
            if (model_manager->switchModel(model_name)) {
                res.code = 200;
                res.write("{\"message\": \"Model switched successfully\"}");
            } else {
                res.code = 400;
                res.write("{\"error\": \"Failed to switch model\"}");
            }
        } catch (const std::exception& e) {
            std::cout << "Error processing request: " << e.what() << std::endl;
            res.code = 500;
            res.write("{\"error\": \"Internal server error\"}");
        }
        
        return res;
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

    std::cout << "Starting server on port 8080..." << std::endl;
    app.port(8080).run();
    return 0;
}