#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include <filesystem>
#include "crow.h"
#include "iamai-core/core/folder_manager.h"
#include "iamai-core/core/model_manager.h"
#include "iamai-core/core/sqlite3.h"
#include <memory>
#include <exception>

using namespace iamai;
namespace fs = std::filesystem;

bool hasExtension(const std::string &path, const std::string &ext)
{
    if (ext.length() > path.length())
        return false;
    return path.compare(path.length() - ext.length(), ext.length(), ext) == 0;
}

void add_cors_headers(crow::response &res)
{
    std::cout << "Adding CORS headers to response with status " << res.code << std::endl;
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Accept");
    res.set_header("Access-Control-Max-Age", "3600");
    std::cout << "CORS headers set for response" << std::endl;
}

sqlite3 *initializeDatabase()
{
    sqlite3 *db;
    char *error_message = nullptr;

    int rc = sqlite3_open("database.db", &db);
    if (rc != SQLITE_OK)
    {
        std::cerr << "Failed to open database: " << sqlite3_errmsg(db) << std::endl;
        sqlite3_close(db);
        throw std::runtime_error("Failed to open database");
    }
    else
    {
        std::cout << "Database connected successfully!" << std::endl;
    }

    rc = sqlite3_exec(db, "PRAGMA foreign_keys = ON", nullptr, nullptr, &error_message);
    if (rc != SQLITE_OK)
    {
        std::cerr << "Failed to enable foreign keys: " << error_message << std::endl;
        sqlite3_free(error_message);
        sqlite3_close(db);
        throw std::runtime_error("Failed to enable foreign keys");
    }
    else
    {
        std::cout << "Foreign keys enabled!" << std::endl;
    }

    const char *createChatsTable = R"(
        CREATE TABLE IF NOT EXISTS Chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    )";

    const char *createMessagesTable = R"(
        CREATE TABLE IF NOT EXISTS Messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES Chats(id) ON DELETE CASCADE
        );
    )";
    const char *createSettingsTable = R"(
        CREATE TABLE IF NOT EXISTS Settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        header_color TEXT NOT NULL,
        gradient_color TEXT NOT NULL,
        text_speed INTEGER NOT NULL,
        font_size INTEGER NOT NULL,
        model TEXT NOT NULL,
        run_time TEXT NOT NULL,
        is_gradient BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    )";

    const char *tables[] = {createChatsTable, createMessagesTable, createSettingsTable};
    for (const char *table : tables)
    {
        rc = sqlite3_exec(db, table, nullptr, nullptr, &error_message);
        if (rc != SQLITE_OK)
        {
            std::cerr << "Error creating table: " << error_message << std::endl;
            sqlite3_free(error_message);
            sqlite3_close(db);
            throw std::runtime_error("Failed to create table.");
        }
        else
        {
            std::cout << "Table created successfully!" << std::endl;
        }
    }

    return db;
}

int main()
{
    crow::SimpleApp app;
    std::unique_ptr<sqlite3, decltype(&sqlite3_close)> db_guard(nullptr, sqlite3_close);
    sqlite3 *db = nullptr;

    try
    {
        db = initializeDatabase();
        db_guard.reset(db);
    }
    catch (const std::exception &e)
    {
        std::cerr << "Database initialization failed: " << e.what() << std::endl;
        return 1;
    }

    fs::path execPath = fs::current_path();
    fs::path projectPath = execPath.parent_path().parent_path().parent_path() / "gui" / "build";

    std::cout << "Current path: " << execPath << std::endl;
    std::cout << "Project path: " << projectPath << std::endl;

    if (!fs::exists(projectPath / "index.html"))
    {
        std::cerr << "Warning: index.html not found at " << (projectPath / "index.html") << std::endl;
        std::cerr << "Attempting to use alternative path..." << std::endl;

        projectPath = execPath.parent_path() / "gui" / "build";
        if (!fs::exists(projectPath / "index.html"))
        {
            std::cerr << "Error: Could not find index.html at " << (projectPath / "index.html") << std::endl;
            return 1;
        }
    }

    std::cout << "Using GUI path: " << projectPath << std::endl;

    try
    {
        auto &folder_manager = FolderManager::getInstance();
        if (!folder_manager.createFolderStructure())
        {
            throw std::runtime_error("Failed to create folder structure");
        }
    }
    catch (const std::exception &e)
    {
        std::cerr << "Failed to initialize folder structure: " << e.what() << std::endl;
        return 1;
    }

    std::unique_ptr<ModelManager> model_manager;
    try
    {
        model_manager = std::make_unique<ModelManager>();
        auto models = model_manager->listModels();
        if (models.empty())
        {
            std::cout << "No models found in models directory" << std::endl;
        }
        else
        {
            if (!model_manager->switchModel(models[0]))
            {
                throw std::runtime_error("Failed to load default model");
            }
        }
    }
    catch (const std::exception &e)
    {
        std::cerr << "Failed to initialize Model Manager: " << e.what() << std::endl;
        return 1;
    }

    CROW_ROUTE(app, "/api/models").methods(crow::HTTPMethod::Get)([&model_manager]()
                                                                  {
        crow::response res;
        crow::json::wvalue response_body;
        response_body["models"] = model_manager->listModels();
        res.write(response_body.dump());
        res.code = 200;
        res.set_header("Content-Type", "application/json");
        return res; });

    CROW_ROUTE(app, "/api/models/switch").methods(crow::HTTPMethod::Post)([&model_manager](const crow::request &req)
                                                                          {
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
            return res; });

    CROW_ROUTE(app, "/chat").methods(crow::HTTPMethod::Post)([db](const crow::request &req)
                                                             {
    crow::response res;
    add_cors_headers(res);
    sqlite3_stmt* stmt = nullptr;

    try {
        auto x = crow::json::load(req.body);
        if (!x) {
            res.code = 400;
            res.write("{\"error\": \"Invalid JSON\"}");
            return res;
        }

        std::string name = x["name"].s();

        std::string query = "INSERT INTO Chats (name) VALUES (?)";
        if (sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
            throw std::runtime_error(sqlite3_errmsg(db));
        }

        sqlite3_bind_text(stmt, 1, name.c_str(), -1, SQLITE_TRANSIENT);

        if (sqlite3_step(stmt) != SQLITE_DONE) {
            throw std::runtime_error(sqlite3_errmsg(db));
        }

        int64_t chatId = sqlite3_last_insert_rowid(db);
        res.code = 200;
        res.write("{\"id\": " + std::to_string(chatId) + ", \"name\": \"" + name + "\"}");
    } catch (const std::exception& e) {
        res.code = 500;
        res.write("{\"error\": \"" + std::string(e.what()) + "\"}");
    }

    if (stmt) sqlite3_finalize(stmt);
    return res; });

    CROW_ROUTE(app, "/chats").methods(crow::HTTPMethod::Get)([db]()
                                                             {
        crow::response res;
        add_cors_headers(res);
        sqlite3_stmt* stmt = nullptr;

        try {
            std::string query = "SELECT id, name FROM Chats ORDER BY created_at DESC";
            if (sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
                throw std::runtime_error(sqlite3_errmsg(db));
            }

            crow::json::wvalue::list chats;
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                crow::json::wvalue chat;
                chat["id"] = sqlite3_column_int(stmt, 0);
                chat["name"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)));
                chats.push_back(std::move(chat));
            }

            res.write(crow::json::wvalue(chats).dump());
            res.code = 200;
        } catch (const std::exception& e) {
            res.code = 500;
            res.write("{\"error\": \"" + std::string(e.what()) + "\"}");
        }

        if (stmt) sqlite3_finalize(stmt);
        return res; });

    CROW_ROUTE(app, "/chat/message").methods(crow::HTTPMethod::Post)([db](const crow::request &req)
                                                                     {
            crow::response res;
            add_cors_headers(res);
            sqlite3_stmt* stmt = nullptr;
        
            try {
                auto x = crow::json::load(req.body);
                if (!x) {
                    res.code = 400;
                    res.write("{\"error\": \"Invalid JSON\"}");
                    return res;
                }
        
                if (!x.has("chat_id") || !x.has("sender") || !x.has("content")) {
                    res.code = 400;
                    res.write("{\"error\": \"Missing required fields\"}");
                    return res;
                }
        
                int chat_id = x["chat_id"].i();
                std::string sender = x["sender"].s();
                std::string content = x["content"].s();
        
                sqlite3_stmt* check_stmt = nullptr;
                const char* check_query = "SELECT 1 FROM Chats WHERE id = ?";
                if (sqlite3_prepare_v2(db, check_query, -1, &check_stmt, nullptr) != SQLITE_OK) {
                    throw std::runtime_error(sqlite3_errmsg(db));
                }
                sqlite3_bind_int(check_stmt, 1, chat_id);
                
                if (sqlite3_step(check_stmt) != SQLITE_ROW) {
                    sqlite3_finalize(check_stmt);
                    res.code = 404;
                    res.write("{\"error\": \"Chat not found\"}");
                    return res;
                }
                sqlite3_finalize(check_stmt);
        
                const char* insert_query = "INSERT INTO Messages (chat_id, sender, message) VALUES (?, ?, ?)";
                if (sqlite3_prepare_v2(db, insert_query, -1, &stmt, nullptr) != SQLITE_OK) {
                    throw std::runtime_error(sqlite3_errmsg(db));
                }
        
                sqlite3_bind_int(stmt, 1, chat_id);
                sqlite3_bind_text(stmt, 2, sender.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(stmt, 3, content.c_str(), -1, SQLITE_TRANSIENT);
        
                if (sqlite3_step(stmt) != SQLITE_DONE) {
                    throw std::runtime_error(sqlite3_errmsg(db));
                }
        
                int64_t message_id = sqlite3_last_insert_rowid(db);
                res.code = 200;
                res.write("{\"id\": " + std::to_string(message_id) + "}");
        
            } catch (const std::exception& e) {
                res.code = 500;
                res.write("{\"error\": \"" + std::string(e.what()) + "\"}");
            }
        
            if (stmt) sqlite3_finalize(stmt);
            return res; });

    CROW_ROUTE(app, "/chat/messages").methods(crow::HTTPMethod::Get)([db](const crow::request &req)
                                                                     {
        crow::response res;
        add_cors_headers(res);
        sqlite3_stmt* stmt = nullptr;

        try {
            std::string chat_id = req.url_params.get("chat_id");
            if (chat_id.empty()) {
                res.code = 400;
                res.write("{\"error\": \"Missing chat_id parameter\"}");
                return res;
            }

            std::string query = "SELECT sender, message, created_at FROM Messages WHERE chat_id = ? ORDER BY created_at ASC";
            if (sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
                throw std::runtime_error(sqlite3_errmsg(db));
            }

            sqlite3_bind_text(stmt, 1, chat_id.c_str(), -1, SQLITE_TRANSIENT);

            crow::json::wvalue::list messages;
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                crow::json::wvalue message;
                message["sender"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0)));
                message["content"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)));
                message["created_at"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2)));
                messages.push_back(std::move(message));
            }

            res.write(crow::json::wvalue(messages).dump());
            res.code = 200;
        } catch (const std::exception& e) {
            res.code = 500;
            res.write("{\"error\": \"" + std::string(e.what()) + "\"}");
        }

        if (stmt) sqlite3_finalize(stmt);
        return res; });

    CROW_ROUTE(app, "/settings/save").methods(crow::HTTPMethod::Post)([db](const crow::request &req)
                                                                      {
            crow::response res;
            add_cors_headers(res);
            sqlite3_stmt* stmt = nullptr;
            try {
                auto x = crow::json::load(req.body);
                if (!x) {
                    res.code = 400;
                    res.write("{\"error\": \"Invalid JSON\"}");
                    return res;
                }
                if (!x.has("headerColor") || !x.has("gradientColor") || 
                    !x.has("textSpeed") || !x.has("fontSize") || 
                    !x.has("model") || !x.has("isGradient")) {
                    res.code = 400;
                    res.write("{\"error\": \"Missing required fields\"}");
                    return res;
                }
        
                std::string header_color = x["headerColor"].s();
                std::string gradient_color = x["gradientColor"].s();
                int text_speed = x["textSpeed"].i();
                int font_size = x["fontSize"].i();
                std::string model = x["model"].s();
                bool is_gradient = x["isGradient"].b();
        
                const char* query = R"(
                    INSERT INTO Settings (
                        header_color, 
                        gradient_color, 
                        text_speed, 
                        font_size, 
                        model, 
                        run_time,
                        is_gradient
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                )";
        
                if (sqlite3_prepare_v2(db, query, -1, &stmt, nullptr) != SQLITE_OK) {
                    throw std::runtime_error(sqlite3_errmsg(db));
                }
        
                sqlite3_bind_text(stmt, 1, header_color.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(stmt, 2, gradient_color.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_int(stmt, 3, text_speed);
                sqlite3_bind_int(stmt, 4, font_size);
                sqlite3_bind_text(stmt, 5, model.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_int(stmt, 6, is_gradient ? 1 : 0);
        
                if (sqlite3_step(stmt) != SQLITE_DONE) {
                    throw std::runtime_error(sqlite3_errmsg(db));
                }
        
                res.code = 200;
                res.write("{\"message\": \"Settings saved successfully\", \"id\": " + 
                         std::to_string(sqlite3_last_insert_rowid(db)) + "}");
            }
            catch (const std::exception& e) {
                res.code = 500;
                res.write("{\"error\": \"" + std::string(e.what()) + "\"}");
            }
        
            if (stmt) {
                sqlite3_finalize(stmt);
            }
            return res; });

    CROW_ROUTE(app, "/settings/load").methods(crow::HTTPMethod::Get)([db]()
                                                                     {
            crow::response res;
            add_cors_headers(res);
            sqlite3_stmt* stmt = nullptr;
            try {
                const char* query = R"(
                    SELECT 
                        id,
                        header_color,
                        gradient_color,
                        text_speed,
                        font_size,
                        model,
                        run_time,
                        is_gradient
                    FROM Settings 
                    ORDER BY created_at DESC 
                    LIMIT 1
                )";
        
                if (sqlite3_prepare_v2(db, query, -1, &stmt, nullptr) != SQLITE_OK) {
                    throw std::runtime_error(sqlite3_errmsg(db));
                }
        
                if (sqlite3_step(stmt) == SQLITE_ROW) {
                    crow::json::wvalue settings;
                    settings["id"] = sqlite3_column_int(stmt, 0);
                    settings["headerColor"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)));
                    settings["gradientColor"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2)));
                    settings["textSpeed"] = sqlite3_column_int(stmt, 3);
                    settings["fontSize"] = sqlite3_column_int(stmt, 4);
                    settings["model"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5)));
                    settings["runTime"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6)));
                    settings["isGradient"] = (sqlite3_column_int(stmt, 7) != 0);
        
                    res.code = 200;
                    res.write(settings.dump());
                } else {
                    crow::json::wvalue default_settings;
                    default_settings["headerColor"] = "#164194";
                    default_settings["gradientColor"] = "#164194";
                    default_settings["textSpeed"] = 1000;
                    default_settings["fontSize"] = 16;
                    default_settings["model"] = "default";
                    default_settings["isGradient"] = false;
                    
                    res.code = 200;
                    res.write(default_settings.dump());
                }
            }
            catch (const std::exception& e) {
                res.code = 500;
                res.write("{\"error\": \"" + std::string(e.what()) + "\"}");
            }
        
            if (stmt) {
                sqlite3_finalize(stmt);
            }
            return res; });

    CROW_WEBSOCKET_ROUTE(app, "/ws")
        .onopen([](crow::websocket::connection &conn)
                {
            try {
                crow::json::wvalue response;
                response["type"] = "connection";
                response["status"] = "connected";
                conn.send_text(response.dump());
            } catch (const std::exception& e) {
                std::cerr << "Error in onopen: " << e.what() << std::endl;
                crow::json::wvalue error_response;
                error_response["type"] = "error";
                error_response["message"] = e.what();
                conn.send_text(error_response.dump());
            } })
        .onclose([](crow::websocket::connection &conn, const std::string &reason)
                 { std::cout << "WebSocket connection closed: " << reason << std::endl; })
        .onmessage([&model_manager](crow::websocket::connection &conn, const std::string &data, bool is_binary)
                   {
            try {
                if (!is_binary) {
                    auto json_data = crow::json::load(data);
                    if (!json_data) {
                        throw std::runtime_error("Invalid JSON received");
                    }

                    if (!model_manager->getCurrentModel()) {
                        throw std::runtime_error("No model currently loaded");
                    }

                    std::string message_content = json_data["content"].s();
                    int chat_id = json_data["chatId"].i();

                    std::string response = model_manager->getCurrentModel()->generate(message_content);
                    
                    crow::json::wvalue response_json;
                    response_json["type"] = "response";
                    response_json["content"] = response;
                    response_json["chatId"] = chat_id;
                    
                    conn.send_text(response_json.dump());
                }
            } catch (const std::exception& e) {
                std::cerr << "Error processing message: " << e.what() << std::endl;
                crow::json::wvalue error_response;
                error_response["type"] = "error";
                error_response["message"] = e.what();
                conn.send_text(error_response.dump());
            } });

    CROW_ROUTE(app, "/")
    ([projectPath](const crow::request &req)
     {
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
        return res; });

    CROW_ROUTE(app, "/<path>")
    ([projectPath](const crow::request &req, std::string path)
     {
        fs::path filepath = projectPath / path;
        crow::response res;
        
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
        return res; });

    std::cout << "Starting server on port 8080..." << std::endl;
    app.port(8080).run();
    return 0;
}