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

    // Start the server on port 8080
    app.port(8080).run();

    return 0;
}