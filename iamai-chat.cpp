#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include "crow.h"
#include "iamai-core/core/folder_manager.h"
#include "iamai-core/core/model_manager.h"
using namespace iamai;

void add_cors_headers(crow::response& res) {
    std::cout << "Adding CORS headers..." << std::endl;
    res.add_header("Access-Control-Allow-Origin", "*");
    res.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.add_header("Access-Control-Allow-Headers", "Content-Type, Accept");
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

    // OPTIONS handler for /models
    CROW_ROUTE(app, "/models").methods("OPTIONS"_method)([](const crow::request& req) {
        crow::response res;
        add_cors_headers(res);
        res.code = 204;
        return res;
    });

    // GET handler for /models
    CROW_ROUTE(app, "/models").methods("GET"_method)([&model_manager]() {
        std::cout << "Handling GET /models request" << std::endl;
        crow::response res;
        crow::json::wvalue response_body;
        response_body["models"] = model_manager->listModels();
        res.write(response_body.dump());
        res.code = 200;
        res.set_header("Content-Type", "application/json");
        add_cors_headers(res);
        return res;
    });

    // OPTIONS handler for /models/switch
    CROW_ROUTE(app, "/models/switch").methods("OPTIONS"_method)([](const crow::request& req) {
        crow::response res;
        add_cors_headers(res);
        res.code = 204;
        return res;
    });

    // POST handler for /models/switch
    CROW_ROUTE(app, "/models/switch").methods("POST"_method)([&model_manager](const crow::request& req) {
        crow::response res;
        add_cors_headers(res);
        res.set_header("Content-Type", "application/json");

        auto x = crow::json::load(req.body);
        if (!x) {
            res.code = 400;
            res.write("{\"error\": \"Invalid JSON\"}");
            return res;
        }
        
        std::string model_name = x["model"].s();
        if (model_manager->switchModel(model_name)) {
            res.code = 200;
            res.write("{\"message\": \"Model switched successfully\"}");
        } else {
            res.code = 400;
            res.write("{\"error\": \"Failed to switch model\"}");
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