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
        });
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