import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import { hash } from "bcrypt-ts";


const SALT_ROUNDS = 10;

// Funktion zum Öffnen der Datenbank
export async function openDB(): Promise<Database> {
    return open({
        filename: path.join(process.cwd(), "database.sqlite"),
        driver: sqlite3.Database,
    });
}

// Funktion zur Initialisierung der Tabellen
export async function initDB(): Promise<void> {
    const db = await openDB();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );
    `);

    const users = [
        { username: "nknipper", password: "pass123"}
    ];

    for (const user of users) {
        const existingUser = await db.get("SELECT * FROM users WHERE username = ?", [user.username])

        if (!existingUser) {
            const hashedPassword = await hash(user.password, SALT_ROUNDS)
            await db.run("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)", [user.username, hashedPassword])
        }
    }

    console.log("✅ SQLite-Datenbank initialisiert.");
}
