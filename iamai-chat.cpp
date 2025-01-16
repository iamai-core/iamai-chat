#define ASIO_STANDALONE
#include <iostream>
#include <stdexcept>
#include "iamai-core/interface.h"
#include "crow.h"

int main() {
    crow::SimpleApp app;

    // Simple GET endpoint that returns "Hello"
    CROW_ROUTE(app, "/")([]() {
        return "Hello from Crow!";
    });

    // Simple POST endpoint that echoes back the JSON it receives
    CROW_ROUTE(app, "/test")
    .methods("POST"_method)
    ([](const crow::request& req) {
        return crow::response(req.body);
    });

    // WebSocket endpoint
    CROW_WEBSOCKET_ROUTE(app, "/ws")
        .onopen([](crow::websocket::connection& conn) {
            std::cout << "New WebSocket connection" << std::endl;
            conn.send_text("Welcome to the WebSocket server!");
        })
        .onclose([](crow::websocket::connection& conn, const std::string& reason) {
            std::cout << "WebSocket connection closed: " << reason << std::endl;
        })
        .onmessage([](crow::websocket::connection& conn, const std::string& data, bool is_binary) {
            std::cout << "Received message: " << data << std::endl;
            // Echo the message back to the client
            if (is_binary)
                conn.send_binary(data);
            else
                conn.send_text(data);
        });

    // Start the server on port 8080
    app.port(8080).run();
    return 0;
}