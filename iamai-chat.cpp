#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include <filesystem>
#include "crow.h"
#include "iamai-core/core/folder_manager.h"
#include "iamai-core/core/model_manager.h"
using namespace iamai;
namespace fs = std::filesystem;

bool hasExtension(const std::string& path, const std::string& ext) {
    if (ext.length() > path.length()) return false;
    return path.compare(path.length() - ext.length(), ext.length(), ext) == 0;
}

int main() {
    crow::SimpleApp app;
   
    // Get the executable path and calculate the gui/build path
    fs::path execPath = fs::current_path();
    fs::path projectPath = execPath.parent_path().parent_path().parent_path() / "gui" / "build";  // Since we're in iamai-chat directory
    
    std::cout << "Current path: " << execPath << std::endl;
    std::cout << "Project path: " << projectPath << std::endl;

    // Verify the path exists
    if (!fs::exists(projectPath / "index.html")) {
        std::cerr << "Warning: index.html not found at " << (projectPath / "index.html") << std::endl;
        std::cerr << "Attempting to use alternative path..." << std::endl;
        
        // Try alternative path
        projectPath = execPath.parent_path() / "gui" / "build";
        if (!fs::exists(projectPath / "index.html")) {
            std::cerr << "Error: Could not find index.html at " << (projectPath / "index.html") << std::endl;
            return 1;
        }
    }

    std::cout << "Using GUI path: " << projectPath << std::endl;

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

    // Register WebSocket endpoint first
    CROW_WEBSOCKET_ROUTE(app, "/ws")
        .onopen([](crow::websocket::connection& conn) {
            std::cout << "WebSocket opened" << std::endl;
            try {
                conn.send_text("Server Connected");
            } catch (const std::exception& e) {
                std::cerr << "Error in onopen: " << e.what() << std::endl;
            }
        })
        .onclose([](crow::websocket::connection& /*conn*/, const std::string& /*reason*/) {
            std::cout << "WebSocket closed" << std::endl;
        })
        .onmessage([&model_manager](crow::websocket::connection& conn, const std::string& data, bool is_binary) {
            std::cout << "Received message: " << data << std::endl;
            try {
                if (!is_binary && model_manager->getCurrentModel()) {
                    std::string response = model_manager->getCurrentModel()->generate(data);
                    std::cout << "Sending response: " << response << std::endl;
                    conn.send_text(response);
                }
            } catch (const std::exception& e) {
                std::cerr << "Error processing message: " << e.what() << std::endl;
                conn.send_text("Sorry, I encountered an error processing your message.");
            }
        });

    // API endpoints
    CROW_ROUTE(app, "/api/models").methods(crow::HTTPMethod::Get)
    ([&model_manager]() {
        crow::response res;
        crow::json::wvalue response_body;
        response_body["models"] = model_manager->listModels();
        res.write(response_body.dump());
        res.code = 200;
        res.set_header("Content-Type", "application/json");
        return res;
    });

    CROW_ROUTE(app, "/api/models/switch").methods(crow::HTTPMethod::Post)
    ([&model_manager](const crow::request& req) {
        crow::response res;
        res.set_header("Content-Type", "application/json");
        try {
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
        } catch (const std::exception& e) {
            res.code = 500;
            res.write("{\"error\": \"" + std::string(e.what()) + "\"}");
        }
        return res;
    });

    // Static file routes last
    CROW_ROUTE(app, "/")
    ([projectPath](const crow::request& req) {
        fs::path indexPath = projectPath / "index.html";
        std::ifstream file(indexPath.string(), std::ios::binary);
        if (!file) {
            crow::response res(404);
            res.write("index.html not found");
            return res;
        }
        crow::response res;
        res.set_header("Content-Type", "text/html");
        res.write(std::string(
            std::istreambuf_iterator<char>(file),
            std::istreambuf_iterator<char>()
        ));
        return res;
    });

    CROW_ROUTE(app, "/<path>")
    ([projectPath](const crow::request& req, std::string path) {
        fs::path filepath = projectPath / path;
        crow::response res;
        
        // Set content type based on extension
        if (hasExtension(path, ".html")) res.set_header("Content-Type", "text/html");
        else if (hasExtension(path, ".js")) res.set_header("Content-Type", "application/javascript");
        else if (hasExtension(path, ".css")) res.set_header("Content-Type", "text/css");
        else if (hasExtension(path, ".json")) res.set_header("Content-Type", "application/json");
        else if (hasExtension(path, ".png")) res.set_header("Content-Type", "image/png");
        else if (hasExtension(path, ".jpg") || hasExtension(path, ".jpeg")) res.set_header("Content-Type", "image/jpeg");
        else if (hasExtension(path, ".ico")) res.set_header("Content-Type", "image/x-icon");
        else res.set_header("Content-Type", "text/plain");

        std::ifstream file(filepath.string(), std::ios::binary);
        if (!file) {
            fs::path indexPath = projectPath / "index.html";
            file.open(indexPath.string(), std::ios::binary);
            if (!file) {
                res.code = 404;
                res.write("Not found");
                return res;
            }
            res.set_header("Content-Type", "text/html");
        }
        
        res.write(std::string(
            std::istreambuf_iterator<char>(file),
            std::istreambuf_iterator<char>()
        ));
        return res;
    });

    std::cout << "Starting server on port 8080..." << std::endl;
    app.port(8080).run();
    return 0;
}