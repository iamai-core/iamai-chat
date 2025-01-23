import initSqlJs from "sql.js";

const loadDatabase = async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS profile_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            header_color TEXT,
            gradient_color TEXT,
            text_speed TEXT,
            font_size INTEGER,
            run_time TEXT NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Chats (
            ChatID INTEGER PRIMARY KEY AUTOINCREMENT,
            ChatName TEXT NOT NULL,
            Model TEXT NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Messages (
            MessageID INTEGER PRIMARY KEY AUTOINCREMENT,
            ChatID INTEGER NOT NULL,
            Sender TEXT NOT NULL, -- "user" or "ai"
            Content TEXT NOT NULL,
            Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ChatID) REFERENCES Chats(ChatID)
        );
    `);

    return db;
};

// Save a chat to the database
const saveChatToDatabase = (db, newChat) => {
    const { chatName, model } = newChat;
    const query = "INSERT INTO Chats (ChatName, Model) VALUES (?, ?)";
    db.run(query, [chatName, model]);
    return db.get("SELECT last_insert_rowid() AS lastID");
};

// Save profile settings
const saveSettings = (db, settings) => {
    const { headerColor, gradientColor, textSpeed, fontSize } = settings;
    const query = `
        INSERT INTO profile_settings (header_color, gradient_color, text_speed, font_size, run_time)
        VALUES (?, ?, ?, ?, datetime('now'))
    `;
    db.run(query, [headerColor, gradientColor, textSpeed, fontSize]);
};

// Load profile settings
const loadSettings = (db) => {
    const query = "SELECT * FROM profile_settings ORDER BY id DESC LIMIT 1";
    const result = db.exec(query);
    return result.length > 0 ? result[0].values[0] : null;
};

// Save a message to a specific chat
const saveMessage = (db, chatID, sender, content) => {
    const query = "INSERT INTO Messages (ChatID, Sender, Content) VALUES (?, ?, ?)";
    db.run(query, [chatID, sender, content]);
};

// Load chat history for a specific chat
const loadChatHistory = (db, chatID) => {
    const query = "SELECT * FROM Messages WHERE ChatID = ? ORDER BY Timestamp ASC";
    const result = db.exec(query, [chatID]);
    return result.length > 0 ? result[0].values : [];
};

const closeDatabase = (db) => {
    db.close();
};

// Example of usage
const runExample = async () => {
    const db = await loadDatabase();
    const chatID = await saveChatToDatabase(db, { chatName: "General Chat", model: "GPT-3" });
    saveSettings(db, { headerColor: "#FF0000", gradientColor: "#FFFF00", textSpeed: "fast", fontSize: 14 });
    const settings = loadSettings(db);
    console.log(settings);
    saveMessage(db, chatID.lastID, "user", "Hello, how are you?");
    const messages = loadChatHistory(db, chatID.lastID);
    console.log(messages);
    closeDatabase(db);
};

runExample();

export {
    loadDatabase,
    saveChatToDatabase,
    saveSettings,
    loadSettings,
    saveMessage,
    loadChatHistory,
    closeDatabase,
};
