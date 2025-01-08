#include <iostream>
#include <stdexcept>
#include "interface.h"

int main()
{
    try
    {
        // Initialize interface with model path
        // TODO: Replace with your actual model path
        const std::string model_path = "C:\\Neumont_classes\\Q10\\PRO490\\Iamai\\iamai-chat\\iamai-core\\models\\llama-3.2-1b-instruct-q4_k_m.gguf";
        Interface myInterface(model_path);

        // Configure generation parameters
        myInterface.setMaxTokens(256); // Generate up to 256 tokens
        myInterface.setThreads(6);     // Use 6 threads
        myInterface.setBatchSize(1);   // Process 1 token at a time

        // Test prompt for generation
        const std::string prompt = "Write a short story about a robot learning to paint:";
        std::cout << "Prompt: " << prompt << std::endl
                  << std::endl;

        // Generate text
        std::string result = myInterface.generate(prompt);
        std::cout << "Generated text: " << result << std::endl;

        return 0;
    }
    catch (const std::exception &e)
    {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}
