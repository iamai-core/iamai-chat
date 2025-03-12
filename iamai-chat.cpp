#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include <filesystem>
#include <fstream>
#include "crow.h"
#include "iamai-core/core/folder_manager.h"
#include "iamai-core/core/model_manager.h"
#include "iamai-core/core/sqlite3.h"
#include "iamai-core/core/whisper_interface.h"
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

// Helper function to save binary data to a temporary WAV file
std::string saveTempWavFile(const std::string &binary_data)
{
    auto &folder_manager = FolderManager::getInstance();
    fs::path temp_path = folder_manager.getAppDataPath() / "temp";

    // Create temp directory if it doesn't exist
    if (!fs::exists(temp_path))
    {
        fs::create_directories(temp_path);
    }

    // Generate unique filename
    std::string filename = "temp_" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count()) + ".wav";
    fs::path file_path = temp_path / filename;

    // Save binary data
    std::ofstream file(file_path.string(), std::ios::binary);
    file.write(binary_data.data(), binary_data.size());
    std::cout << "Saving temporary WAV file, data size: " << binary_data.size() << " bytes" << std::endl;
    file.close();

    return file_path.string();
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
            is_attachment BOOLEAN NOT NULL,
            file_type Text NOT NULL,
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
    // fs::path projectPath = execPath.parent_path().parent_path().parent_path() / "gui" / "build";
    fs::path projectPath = execPath / "gui" / "build";

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

    // Initialize folder structure
    auto &folder_manager = FolderManager::getInstance();
    if (!folder_manager.createFolderStructure())
    {
        throw std::runtime_error("Failed to create folder structure");
    }

    // Initialize Whisper interface
    std::unique_ptr<WhisperInterface> whisper;
    try
    {
        // Use executable path instead of folder manager
        fs::path whisper_model_path = execPath / "ggml-base.en.bin";
        if (!fs::exists(whisper_model_path))
        {
            std::cerr << "Warning: Whisper model not found at " << whisper_model_path << std::endl;
        }
        else
        {
            whisper = std::make_unique<WhisperInterface>(whisper_model_path.string());
            whisper->setThreads(4);
            whisper->setLanguage("en");
        }
    }
    catch (const std::exception &e)
    {
        std::cerr << "Failed to initialize Whisper: " << e.what() << std::endl;
    }

    // Initialize Model Manager
    //std::unique_ptr<ModelManager> model_manager;
    std::unique_ptr<Interface> llm_model;

    try
    {
        // Hardcode the model path to the executable directory
        fs::path model_path = execPath / "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf";
        
        if (!fs::exists(model_path))
        {
            std::cerr << "Error: Model not found at " << model_path << std::endl;
            throw std::runtime_error("Model file not found");
        }
        
        // Create the Interface directly without using ModelManager
        llm_model = std::make_unique<Interface>(model_path.string());
        
        // Configure the model parameters (same as in ModelManager::switchModel)
        llm_model->setMaxTokens(512);
        llm_model->setThreads(4);
        llm_model->setBatchSize(512);
        
        std::cout << "Model loaded successfully: " << model_path.string() << std::endl;
    }
    catch (const std::exception &e)
    {
        std::cerr << "Failed to initialize model: " << e.what() << std::endl;
        return 1;
    }

    // API endpoints
    CROW_ROUTE(app, "/api/models").methods(crow::HTTPMethod::Get)([]()
    {
        crow::response res;
        crow::json::wvalue response_body;
        // Return just the hardcoded model
        response_body["models"] = std::vector<std::string>{"tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"};
        res.write(response_body.dump());
        res.code = 200;
        res.set_header("Content-Type", "application/json");
        return res;
    });

    CROW_ROUTE(app, "/api/models/switch").methods(crow::HTTPMethod::Post)([](const crow::request &req)
    {
        crow::response res;
        res.set_header("Content-Type", "application/json");
        // Always return success since we only have one model
        res.code = 200;
        res.write("{\"message\": \"Using default model\"}");
        return res;
    });

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
        
                if (!x.has("chat_id") || !x.has("sender") || !x.has("content") || !x.has("is_attachment") || !x.has("file_type")) {
                    res.code = 400;
                    res.write("{\"error\": \"Missing required fields\"}");
                    return res;
                }
                int chat_id = x["chat_id"].i();
                std::string sender = x["sender"].s();
                std::string content = x["content"].s();
                int is_attachment = x["is_attachment"].b() ? 1 : 0;
                std::string file_type = x["file_type"].s();
                std::cout << "Inserting message: " << std::endl;
                std::cout << "chat_id: " << chat_id << std::endl;
                std::cout << "sender: " << sender << std::endl;
                std::cout << "content: " << content << std::endl;
                std::cout << "is_attachment: " << is_attachment << std::endl;
                std::cout << "file_type: " << file_type << std::endl;

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
        
                const char* insert_query = "INSERT INTO Messages (chat_id, sender, message, is_attachment, file_type) VALUES (?, ?, ?, ?, ?)";
                if (sqlite3_prepare_v2(db, insert_query, -1, &stmt, nullptr) != SQLITE_OK) {
                    throw std::runtime_error(sqlite3_errmsg(db));
                }
        
                sqlite3_bind_int64(stmt, 1, chat_id);
                sqlite3_bind_text(stmt, 2, sender.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(stmt, 3, content.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_int(stmt, 4, is_attachment);
                sqlite3_bind_text(stmt, 5, file_type.c_str(), -1, SQLITE_TRANSIENT);
        
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
                    
                    std::string query = "SELECT id, sender, message, created_at, is_attachment, file_type FROM Messages WHERE chat_id = ? ORDER BY created_at ASC";
                    if (sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
                        throw std::runtime_error(sqlite3_errmsg(db));
                    }
            
                    sqlite3_bind_text(stmt, 1, chat_id.c_str(), -1, SQLITE_TRANSIENT);
            
                    crow::json::wvalue::list messages;
                    while (sqlite3_step(stmt) == SQLITE_ROW) {
                        crow::json::wvalue message;
                        message["id"] = sqlite3_column_int(stmt, 0);
                        message["sender"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)));
                        message["content"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2)));
                        message["created_at"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)));
                        message["is_attachment"] = (sqlite3_column_int(stmt, 4) == 1);
                        message["file_type"] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5)));
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
            .onmessage([&llm_model, &whisper](crow::websocket::connection &conn, const std::string &data, bool is_binary)
                       {
        try {
            std::string input_text;
            int chat_id = -1;
        
            if (is_binary) {
                std::cout << "Received binary audio data, size: " << data.size() << " bytes" << std::endl;
                
                if (!whisper) {
                    std::cerr << "Error: Whisper interface not initialized" << std::endl;
                    crow::json::wvalue error_response;
                    error_response["type"] = "error";
                    error_response["message"] = "Speech-to-text service not available";
                    conn.send_text(error_response.dump());
                    return;
                }
                std::string temp_file = saveTempWavFile(data);
                std::cout << "Saved temporary WAV file: " << temp_file << std::endl;
                
                try {
                    std::cout << "Starting transcription..." << std::endl;
                    input_text = whisper->transcribe(temp_file);
                    std::cout << "Transcription complete: " << input_text << std::endl;
                    fs::remove(temp_file);
                    std::cout << "Removed temporary file" << std::endl;
                    crow::json::wvalue transcription_response;
                    transcription_response["type"] = "transcription";
                    transcription_response["content"] = input_text;
                    conn.send_text(transcription_response.dump());
                    if (input_text.empty()) {
                        std::cout << "Transcription was empty, no further processing needed" << std::endl;
                        return;
                    }
                } catch (const std::exception& e) {
                    fs::remove(temp_file);
                    std::cerr << "Error during transcription: " << e.what() << std::endl;
                    
                    crow::json::wvalue error_response;
                    error_response["type"] = "error";
                    error_response["message"] = std::string("Error transcribing audio: ") + e.what();
                    conn.send_text(error_response.dump());
                    return;
                }
            } else {
                auto json_data = crow::json::load(data);
                if (!json_data) {
                    throw std::runtime_error("Invalid JSON received");
                }
                input_text = json_data["content"].s();
                chat_id = json_data["chatId"].i();
                if (json_data.has("isAudio") && json_data["isAudio"].b() == true) {
                    std::cout << "Received confirmation for audio transcription with chat_id: " << chat_id << std::endl;
                }
            }
            
            // Use the Interface directly instead of through model_manager
            if (!input_text.empty() && llm_model && chat_id != -1) {
                std::cout << "Generating response for input: " << input_text << std::endl;
                std::string response = llm_model->generate(input_text);
                
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
        }
        });

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