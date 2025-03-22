import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import { hash } from "bcrypt-ts";
import { students, studentsLogin } from "./demo_data.js";


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
        CREATE TABLE IF NOT EXISTS students (
        registration_number INTEGER PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        birth_place TEXT NOT NULL,
        enrollment_date TEXT NOT NULL,
        study_course TEXT NOT NULL,
        study_degree TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS studentLogin (
            registration_number INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            FOREIGN KEY (registration_number) REFERENCES students(registration_number) ON DELETE CASCADE
        );
    `);

    for (const student of students) {
        const existingStudent = await db.get("SELECT * FROM students WHERE registration_number = ?", [student.registrationNumber])

        if (!existingStudent) {
            await db.run("INSERT OR IGNORE INTO students (registration_number, first_name, last_name, birth_date, birth_place, enrollment_date, study_course, study_degree) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [student.registrationNumber, student.firstName, student.lastName, student.birthDate.toISOString(), student.birthPlace, student.enrollmentDate.toISOString(), student.studyCourse, student.studyDegree])
        }
    }

    for (const student of studentsLogin) {
        const existingStudent = await db.get("SELECT * FROM studentLogin WHERE registration_number = ?", [student.registrationNumber])

        if (!existingStudent) {
            const hashedPassword = await hash(student.password, SALT_ROUNDS)
            await db.run("INSERT OR IGNORE INTO studentLogin (registration_number, username, password) VALUES (?, ?, ?)", [student.registrationNumber, student.username, hashedPassword])
        }
    }

    console.log("SQLite-Datenbank initialisiert.");
}
