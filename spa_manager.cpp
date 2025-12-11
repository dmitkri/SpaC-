#include "spa_manager.h"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <algorithm>
#include <cstdlib>

using namespace std;

// Инициализация БД
bool SpaManager::initDatabase() {
        int rc = sqlite3_open("spa.db", &db);
        if (rc) {
            cerr << "Ошибка открытия БД: " << sqlite3_errmsg(db) << endl;
            sqlite3_close(db);
            return false;
        }
        
        // Создаем таблицы
        const char* createTables = 
            "CREATE TABLE IF NOT EXISTS clients ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "firstName TEXT NOT NULL,"
            "lastName TEXT NOT NULL,"
            "phone TEXT NOT NULL,"
            "email TEXT NOT NULL,"
            "passwordHash TEXT NOT NULL,"
            "registrationDate TEXT NOT NULL,"
            "bonusPoints INTEGER DEFAULT 0,"
            "role TEXT DEFAULT 'client'"
            ");"
            
            "CREATE TABLE IF NOT EXISTS specialists ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "name TEXT NOT NULL,"
            "specialization TEXT NOT NULL,"
            "averageRating REAL DEFAULT 0.0,"
            "totalReviews INTEGER DEFAULT 0,"
            "workSchedule TEXT DEFAULT '{}'"
            ");"
            
            "CREATE TABLE IF NOT EXISTS services ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "name TEXT NOT NULL,"
            "price INTEGER NOT NULL,"
            "duration INTEGER NOT NULL,"
            "description TEXT"
            ");"
            
            "CREATE TABLE IF NOT EXISTS service_specialists ("
            "serviceId INTEGER NOT NULL,"
            "specialistId INTEGER NOT NULL,"
            "PRIMARY KEY (serviceId, specialistId),"
            "FOREIGN KEY (serviceId) REFERENCES services(id),"
            "FOREIGN KEY (specialistId) REFERENCES specialists(id)"
            ");"
            
            "CREATE TABLE IF NOT EXISTS bookings ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "clientId INTEGER NOT NULL,"
            "serviceId INTEGER NOT NULL,"
            "specialistId INTEGER NOT NULL,"
            "date TEXT NOT NULL,"
            "time TEXT NOT NULL,"
            "endTime TEXT NOT NULL,"
            "status TEXT NOT NULL DEFAULT 'запланирована',"
            "notes TEXT,"
            "FOREIGN KEY (clientId) REFERENCES clients(id),"
            "FOREIGN KEY (serviceId) REFERENCES services(id),"
            "FOREIGN KEY (specialistId) REFERENCES specialists(id)"
            ");"
            
            "CREATE TABLE IF NOT EXISTS payments ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "clientId INTEGER NOT NULL,"
            "bookingId INTEGER,"
            "type TEXT NOT NULL,"
            "amount INTEGER NOT NULL,"
            "date TEXT NOT NULL,"
            "description TEXT,"
            "FOREIGN KEY (clientId) REFERENCES clients(id),"
            "FOREIGN KEY (bookingId) REFERENCES bookings(id)"
            ");"
            
            "CREATE TABLE IF NOT EXISTS reviews ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "clientId INTEGER NOT NULL,"
            "specialistId INTEGER NOT NULL,"
            "bookingId INTEGER,"
            "rating INTEGER NOT NULL,"
            "text TEXT,"
            "date TEXT NOT NULL,"
            "FOREIGN KEY (clientId) REFERENCES clients(id),"
            "FOREIGN KEY (specialistId) REFERENCES specialists(id),"
            "FOREIGN KEY (bookingId) REFERENCES bookings(id)"
            ");";
        
        char* errMsg = 0;
        rc = sqlite3_exec(db, createTables, 0, 0, &errMsg);
        if (rc != SQLITE_OK) {
            cerr << "Ошибка создания таблиц: " << errMsg << endl;
            sqlite3_free(errMsg);
            return false;
        }
        
        // Миграция: добавляем поле role если его нет
        const char* migrateRole = "ALTER TABLE clients ADD COLUMN role TEXT DEFAULT 'client';";
        sqlite3_exec(db, migrateRole, 0, 0, 0); // Игнорируем ошибку если колонка уже есть
        
        return true;
    }

SpaManager::SpaManager() {
        if (!initDatabase()) {
            cerr << "Не удалось инициализировать БД!" << endl;
            exit(1);
        }
        loadFromDatabase();
    }
    
SpaManager::~SpaManager() {
        if (db) {
            sqlite3_close(db);
        }
    }
    
string SpaManager::calculateEndTime(const string& startTime, int durationMinutes) {
        int hour = 9, minute = 0;
        try {
            if (startTime.length() >= 5) {
                hour = stoi(startTime.substr(0, 2));
                minute = stoi(startTime.substr(3, 2));
            }
        } catch (...) {
            // Используем значения по умолчанию
        }
        
        minute += durationMinutes;
        hour += minute / 60;
        minute = minute % 60;
        hour = hour % 24;
        
        stringstream ss;
        ss << setfill('0') << setw(2) << hour << ":" 
           << setfill('0') << setw(2) << minute;
        return ss.str();
    }

int SpaManager::registerClient(string firstName, string lastName, string phone, string email, string password, string role) {
        const char* sql = "INSERT INTO clients (firstName, lastName, phone, email, passwordHash, registrationDate, bonusPoints, role) VALUES (?, ?, ?, ?, ?, ?, 0, ?)";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, firstName.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 2, lastName.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 3, phone.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 4, email.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 5, ::hashPassword(password).c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 6, ::getCurrentDate().c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 7, role.c_str(), -1, SQLITE_STATIC);
            
            if (sqlite3_step(stmt) == SQLITE_DONE) {
                int id = sqlite3_last_insert_rowid(db);
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Пользователь зарегистрирован! ID: " << id << ", роль: " << role << endl;
                return id;
            }
        }
        sqlite3_finalize(stmt);
        return -1;
    }
    
int SpaManager::addClient(string name, string phone, string email) {
        // Разделяем имя на имя и фамилию
        size_t spacePos = name.find(' ');
        string firstName = name;
        string lastName = "";
        if (spacePos != string::npos) {
            firstName = name.substr(0, spacePos);
            lastName = name.substr(spacePos + 1);
        }
        return registerClient(firstName, lastName, phone, email, "default123");
    }
    
    // Авторизация клиента
int SpaManager::authenticateClient(string email, string password) {
        string passwordHash = ::hashPassword(password);
        for (int i = 0; i < clients.size(); i++) {
            if (clients[i].email == email && clients[i].passwordHash == passwordHash) {
                return clients[i].id;
            }
        }
        return -1; // Не найдено
    }
    
    // Получить роль пользователя
string SpaManager::getUserRole(int userId) {
        Client* client = findClient(userId);
        if (client != nullptr) {
            return client->role.empty() ? "client" : client->role;
        }
        return "client";
    }
    
    // Получить указатель на БД
sqlite3* SpaManager::getDatabase() { return db; }

    // Получить всех клиентов
vector<Client> SpaManager::getClients() {
        return clients;
    }

    // Найти клиента по ID
Client* SpaManager::findClient(int id) {
        for (int i = 0; i < clients.size(); i++) {
            if (clients[i].id == id) {
                return &clients[i];
            }
        }
        return nullptr;
    }
    
    // Обновить данные клиента
bool SpaManager::updateClient(int id, string firstName, string lastName, string phone, string email) {
        const char* sql = "UPDATE clients SET firstName = ?, lastName = ?, phone = ?, email = ? WHERE id = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, firstName.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 2, lastName.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 3, phone.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 4, email.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_int(stmt, 5, id);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Данные клиента обновлены! ID: " << id << endl;
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }
    
    // Обновить данные клиента (для обратной совместимости)
bool SpaManager::updateClient(int id, string name, string phone, string email) {
        size_t spacePos = name.find(' ');
        string firstName = name;
        string lastName = "";
        if (spacePos != string::npos) {
            firstName = name.substr(0, spacePos);
            lastName = name.substr(spacePos + 1);
        }
        return updateClient(id, firstName, lastName, phone, email);
    }
    
    // Удалить клиента
bool SpaManager::deleteClient(int id) {
        const char* sql = "DELETE FROM clients WHERE id = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, id);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Клиент удален! ID: " << id << endl;
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }
    
    // Получить все записи клиента
vector<Booking> SpaManager::getClientBookings(int clientId) {
        vector<Booking> result;
        for (int i = 0; i < bookings.size(); i++) {
            if (bookings[i].clientId == clientId) {
                result.push_back(bookings[i]);
            }
        }
        return result;
    }

    // Добавить услугу
void SpaManager::addService(string name, int price, int duration, string description) {
        const char* sql = "INSERT INTO services (name, price, duration, description) VALUES (?, ?, ?, ?)";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, name.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_int(stmt, 2, price);
            sqlite3_bind_int(stmt, 3, duration);
            sqlite3_bind_text(stmt, 4, description.c_str(), -1, SQLITE_STATIC);
            
            if (sqlite3_step(stmt) == SQLITE_DONE) {
                int id = sqlite3_last_insert_rowid(db);
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Услуга добавлена! ID: " << id << endl;
                return;
            }
        }
        sqlite3_finalize(stmt);
    }
    
    // Удалить услугу
bool SpaManager::deleteService(int id) {
        const char* sql = "DELETE FROM services WHERE id = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, id);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Услуга удалена! ID: " << id << endl;
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }
    
    // Добавить мастера
int SpaManager::addSpecialist(string name, string specialization) {
        const char* sql = "INSERT INTO specialists (name, specialization, averageRating, totalReviews, workSchedule) VALUES (?, ?, 0.0, 0, '{}')";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, name.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 2, specialization.c_str(), -1, SQLITE_STATIC);
            
            if (sqlite3_step(stmt) == SQLITE_DONE) {
                int id = sqlite3_last_insert_rowid(db);
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Мастер добавлен! ID: " << id << endl;
                return id;
            }
        }
        sqlite3_finalize(stmt);
        return -1;
    }
    
    // Удалить мастера
bool SpaManager::deleteSpecialist(int id) {
        const char* sql = "DELETE FROM specialists WHERE id = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, id);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Мастер удален! ID: " << id << endl;
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }
    
    // Получить всех мастеров
vector<Specialist> SpaManager::getSpecialists() {
        return specialists;
    }
    
    // Найти мастера по ID
Specialist* SpaManager::findSpecialist(int id) {
        for (int i = 0; i < specialists.size(); i++) {
            if (specialists[i].id == id) {
                return &specialists[i];
            }
        }
        return nullptr;
    }
    
    // Установить расписание мастера
bool SpaManager::setSpecialistSchedule(int specialistId, string schedule) {
        const char* sql = "UPDATE specialists SET workSchedule = ? WHERE id = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, schedule.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_int(stmt, 2, specialistId);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Расписание мастера обновлено! ID: " << specialistId << endl;
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }
    
    // Получить записи мастера
vector<Booking> SpaManager::getSpecialistBookings(int specialistId) {
        vector<Booking> result;
        for (int i = 0; i < bookings.size(); i++) {
            if (bookings[i].specialistId == specialistId) {
                result.push_back(bookings[i]);
            }
        }
        return result;
    }
    
    // Добавить мастера к услуге
void SpaManager::addSpecialistToService(int serviceId, int specialistId) {
        const char* sql = "INSERT OR IGNORE INTO service_specialists (serviceId, specialistId) VALUES (?, ?)";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, serviceId);
            sqlite3_bind_int(stmt, 2, specialistId);
            sqlite3_step(stmt);
            sqlite3_finalize(stmt);
            loadFromDatabase(); // Обновляем кэш
        }
    }
    
    // Удалить мастера из услуги
bool SpaManager::removeSpecialistFromService(int serviceId, int specialistId) {
        const char* sql = "DELETE FROM service_specialists WHERE serviceId = ? AND specialistId = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, serviceId);
            sqlite3_bind_int(stmt, 2, specialistId);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }
    
    // Получить мастеров для услуги
vector<int> SpaManager::getSpecialistsForService(int serviceId) {
        vector<int> result;
        Service* service = findService(serviceId);
        if (service != nullptr) {
            return service->specialistIds;
        }
        return result;
    }
    
    // Получить услуги для мастера
vector<int> SpaManager::getServicesForSpecialist(int specialistId) {
        Specialist* specialist = findSpecialist(specialistId);
        if (specialist != nullptr) {
            return specialist->serviceIds;
        }
        return vector<int>();
    }

    // Получить все услуги
vector<Service> SpaManager::getServices() {
        return this->services;
    }

    // Найти услугу по ID
Service* SpaManager::findService(int id) {
        for (int i = 0; i < services.size(); i++) {
            if (services[i].id == id) {
                return &services[i];
            }
        }
        return nullptr;
    }

    // Проверить доступность временного слота
bool SpaManager::isTimeSlotAvailable(int specialistId, string date, string time, int duration) {
        string endTime = calculateEndTime(time, duration);
        
        // Добавляем 30 минут буфера после окончания новой записи
        string bufferEndTime = calculateEndTime(endTime, 30);
        
        for (int i = 0; i < bookings.size(); i++) {
            if (bookings[i].specialistId == specialistId && 
                bookings[i].date == date && 
                bookings[i].status != "отменена") {
                
                // Добавляем 30 минут буфера после окончания существующей записи
                string existingBufferEndTime = calculateEndTime(bookings[i].endTime, 30);
                
                // Проверяем пересечение временных интервалов (с учетом буфера)
                // Новая запись не должна начинаться до окончания буфера существующей записи
                // И существующая запись не должна начинаться до окончания буфера новой записи
                if ((time < existingBufferEndTime && endTime > bookings[i].time) ||
                    (bookings[i].time < bufferEndTime && bookings[i].endTime > time)) {
                    return false; // Слот занят (с учетом 30-минутного буфера)
                }
            }
        }
        return true; // Слот свободен
    }
    
    // Получить доступные временные слоты для мастера
    // Получить рабочие часы мастера на дату
pair<string, string> SpaManager::getSpecialistWorkHours(int specialistId, string date) {
        // Получаем день недели (0=воскресенье, 1=понедельник, ...)
        int year = 2024, month = 1, day = 1;
        try {
            if (date.length() >= 10) {
                year = stoi(date.substr(0, 4));
                month = stoi(date.substr(5, 2));
                day = stoi(date.substr(8, 2));
            }
        } catch (...) {
            // Используем значения по умолчанию
        }
        
        tm timeinfo = {};
        timeinfo.tm_year = year - 1900;
        timeinfo.tm_mon = month - 1;
        timeinfo.tm_mday = day;
        mktime(&timeinfo);
        int dayOfWeek = timeinfo.tm_wday; // 0=воскресенье, 1=понедельник
        
        // Ищем мастера
        Specialist* specialist = findSpecialist(specialistId);
        if (specialist == nullptr) {
            return make_pair("09:00", "20:00");
        }
        
        // Парсим расписание (формат: monday:09:00-18:00,tuesday:09:00-18:00)
        string schedule = specialist->workSchedule;
        
        if (schedule.empty() || schedule == "{}") {
            return make_pair("09:00", "20:00");
        }
        
        vector<string> dayNames = {"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"};
        string dayName = dayNames[dayOfWeek];
        
        size_t dayPos = schedule.find(dayName + ":");
        if (dayPos != string::npos) {
            size_t startPos = dayPos + dayName.length() + 1;
            size_t dashPos = schedule.find("-", startPos);
            if (dashPos != string::npos) {
                string startTime = schedule.substr(startPos, dashPos - startPos);
                size_t endPos = dashPos + 1;
                size_t commaPos = schedule.find(",", endPos);
                string endTime;
                if (commaPos != string::npos) {
                    endTime = schedule.substr(endPos, commaPos - endPos);
                } else {
                    endTime = schedule.substr(endPos);
                }
                return make_pair(startTime, endTime);
            }
        }
        
        return make_pair("09:00", "20:00");
    }
    
vector<string> SpaManager::getAvailableTimeSlots(int specialistId, string date, int duration) {
        vector<string> slots;
        
        // Получаем рабочие часы мастера на эту дату
        pair<string, string> workHours = getSpecialistWorkHours(specialistId, date);
        string startTime = workHours.first;
        string endTime = workHours.second;
        
        int startHour = 9, startMinute = 0, endHour = 20, endMinute = 0;
        try {
            if (startTime.length() >= 5) {
                startHour = stoi(startTime.substr(0, 2));
                startMinute = stoi(startTime.substr(3, 2));
            }
            if (endTime.length() >= 5) {
                endHour = stoi(endTime.substr(0, 2));
                endMinute = stoi(endTime.substr(3, 2));
            }
        } catch (...) {
            // Используем значения по умолчанию
        }
        
        // Генерируем слоты с интервалом 30 минут
        int currentHour = startHour;
        int currentMinute = startMinute;
        
        while (currentHour < endHour || (currentHour == endHour && currentMinute < endMinute)) {
            stringstream ss;
            ss << setfill('0') << setw(2) << currentHour << ":" 
               << setfill('0') << setw(2) << currentMinute;
            string time = ss.str();
            
            // Проверяем, что услуга поместится в рабочий день мастера
            string serviceEndTime = calculateEndTime(time, duration);
            int serviceEndHour = 20, serviceEndMinute = 0;
            try {
                if (serviceEndTime.length() >= 5) {
                    serviceEndHour = stoi(serviceEndTime.substr(0, 2));
                    serviceEndMinute = stoi(serviceEndTime.substr(3, 2));
                }
            } catch (...) {
                // Используем значения по умолчанию
            }
            
            // Проверяем, что услуга заканчивается до конца рабочего дня мастера
            // Услуга должна закончиться до endTime (например, если рабочий день до 18:00, услуга должна закончиться до 18:00)
            if (serviceEndHour < endHour || (serviceEndHour == endHour && serviceEndMinute <= endMinute)) {
                if (isTimeSlotAvailable(specialistId, date, time, duration)) {
                    slots.push_back(time);
                }
            }
            
            // Переходим к следующему слоту (+30 минут)
            currentMinute += 30;
            if (currentMinute >= 60) {
                currentMinute -= 60;
                currentHour++;
            }
        }
        
        return slots;
    }

    // Создать запись
int SpaManager::createBooking(int clientId, int serviceId, int specialistId, string date, string time, string notes) {
        // Проверяем, есть ли клиент, услуга и мастер
        if (findClient(clientId) == nullptr) {
            cout << "Ошибка: клиент не найден!" << endl;
            return -1;
        }
        if (findService(serviceId) == nullptr) {
            cout << "Ошибка: услуга не найдена!" << endl;
            return -1;
        }
        if (findSpecialist(specialistId) == nullptr) {
            cout << "Ошибка: мастер не найден!" << endl;
            return -1;
        }
        
        Service* service = findService(serviceId);
        // Проверяем доступность временного слота
        if (!isTimeSlotAvailable(specialistId, date, time, service->duration)) {
            cout << "Ошибка: временной слот занят!" << endl;
            return -1;
        }

        string endTime = calculateEndTime(time, service->duration);
        const char* sql = "INSERT INTO bookings (clientId, serviceId, specialistId, date, time, endTime, status, notes) VALUES (?, ?, ?, ?, ?, ?, 'запланирована', ?)";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, clientId);
            sqlite3_bind_int(stmt, 2, serviceId);
            sqlite3_bind_int(stmt, 3, specialistId);
            sqlite3_bind_text(stmt, 4, date.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 5, time.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 6, endTime.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 7, notes.c_str(), -1, SQLITE_STATIC);
            
            if (sqlite3_step(stmt) == SQLITE_DONE) {
                int id = sqlite3_last_insert_rowid(db);
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Запись создана! ID: " << id << endl;
                
                // Отправляем email уведомление клиенту
                Client* client = findClient(clientId);
                Service* service = findService(serviceId);
                Specialist* specialist = findSpecialist(specialistId);
                if (client != nullptr && service != nullptr && specialist != nullptr) {
                    stringstream emailBody;
                    emailBody << "Здравствуйте, " << client->firstName << " " << client->lastName << "!\n\n";
                    emailBody << "Ваша запись подтверждена:\n\n";
                    emailBody << "Услуга: " << service->name << "\n";
                    emailBody << "Мастер: " << specialist->name << "\n";
                    emailBody << "Дата: " << date << "\n";
                    emailBody << "Время: " << time << " - " << endTime << "\n";
                    if (!notes.empty()) {
                        emailBody << "Комментарий: " << notes << "\n";
                    }
                    emailBody << "\nЖдем вас в нашем салоне!\n";
                    
                    sendEmailNotification(client->email, "Подтверждение записи в СПА салоне", emailBody.str());
                }
                
                return id;
            }
        }
        sqlite3_finalize(stmt);
        return -1;
    }
    
    // Создать запись (для обратной совместимости)
void SpaManager::createBooking(int clientId, int serviceId, string date, string time) {
        // Находим первого доступного мастера для услуги
        Service* service = findService(serviceId);
        int specialistId = -1;
        if (service != nullptr && !service->specialistIds.empty()) {
            specialistId = service->specialistIds[0];
        } else if (!specialists.empty()) {
            specialistId = specialists[0].id;
        }
        
        if (specialistId == -1) {
            cout << "Ошибка: нет доступных мастеров!" << endl;
            return;
        }

        createBooking(clientId, serviceId, specialistId, date, time);
    }

    // Получить все записи
vector<Booking> SpaManager::getBookings() {
        return bookings;
    }

    // Отменить запись
bool SpaManager::cancelBooking(int bookingId, string reason) {
        // Проверяем статус записи
        Booking* booking = nullptr;
        for (int i = 0; i < bookings.size(); i++) {
            if (bookings[i].id == bookingId) {
                booking = &bookings[i];
                break;
            }
        }
        if (!booking) {
            return false;
        }
        if (booking->status == "выполнена") {
            cout << "Нельзя отменить выполненную запись!" << endl;
            return false;
        }
        
        string notes = booking->notes;
        if (!reason.empty()) {
            notes = reason;
        }
        
        const char* sql = "UPDATE bookings SET status = 'отменена', notes = ? WHERE id = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, notes.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_int(stmt, 2, bookingId);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                
                // Создаем транзакцию возврата, если была предоплата
                Service* service = findService(booking->serviceId);
                if (service != nullptr) {
                    for (int j = 0; j < payments.size(); j++) {
                        if (payments[j].bookingId == bookingId && payments[j].type == "предоплата") {
                            createPayment(booking->clientId, bookingId, "возврат", service->price, "Возврат за отмененную запись");
                            break;
                        }
                    }
                }
                
                cout << "Запись отменена!" << endl;
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }

    // Завершить запись с оплатой
bool SpaManager::completeBooking(int bookingId, string paymentMethod, double discount, 
                         string bonusAction, int bonusPoints, double finalAmount) {
        Booking* booking = nullptr;
        for (int i = 0; i < bookings.size(); i++) {
            if (bookings[i].id == bookingId) {
                booking = &bookings[i];
                break;
            }
        }
        if (!booking) {
            return false;
        }
        
        const char* sql = "UPDATE bookings SET status = 'выполнена' WHERE id = ?";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, bookingId);
            
            if (sqlite3_step(stmt) == SQLITE_DONE && sqlite3_changes(db) > 0) {
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                
                Service* service = findService(booking->serviceId);
                Client* client = findClient(booking->clientId);
                if (service != nullptr && client != nullptr) {
                    // Обрабатываем бонусные баллы
                    int bonusPointsEarned = 0;
                    int bonusPointsSpent = 0;
                    
                    if (bonusAction == "earn") {
                        // Начисляем баллы (1% от финальной суммы)
                        bonusPointsEarned = (int)(finalAmount * 0.01);
                        if (bonusPoints > 0) {
                            bonusPointsEarned = bonusPoints; // Если указано конкретное количество
                        }
                    } else if (bonusAction == "spend") {
                        // Списываем баллы
                        bonusPointsSpent = min(bonusPoints, (int)finalAmount);
                    } else {
                        // По умолчанию начисляем 1% от финальной суммы
                        bonusPointsEarned = (int)(finalAmount * 0.01);
                    }
                    
                    // Обновляем бонусные баллы клиента
                    int newBonusPoints = client->bonusPoints + bonusPointsEarned - bonusPointsSpent;
                    if (newBonusPoints < 0) newBonusPoints = 0;
                    
                    const char* updateSql = "UPDATE clients SET bonusPoints = ? WHERE id = ?";
                    sqlite3_stmt* updateStmt;
                    if (sqlite3_prepare_v2(db, updateSql, -1, &updateStmt, 0) == SQLITE_OK) {
                        sqlite3_bind_int(updateStmt, 1, newBonusPoints);
                        sqlite3_bind_int(updateStmt, 2, booking->clientId);
                        sqlite3_step(updateStmt);
                        sqlite3_finalize(updateStmt);
                        loadFromDatabase(); // Обновляем кэш
                    }
                    
                    // Создаем транзакцию оплаты
                    string paymentDescription = "Оплата услуги (" + paymentMethod + ")";
                    if (discount > 0) {
                        paymentDescription += " (скидка " + to_string((int)discount) + "%)";
                    }
                    if (bonusPointsSpent > 0) {
                        paymentDescription += " (списано " + to_string(bonusPointsSpent) + " баллов)";
                    }
                    
                    // Проверяем, была ли предоплата
                    bool hasPrepayment = false;
                    for (int j = 0; j < payments.size(); j++) {
                        if (payments[j].bookingId == bookingId && payments[j].type == "предоплата") {
                            hasPrepayment = true;
                            break;
                        }
                    }
                    
                    if (!hasPrepayment) {
                        createPayment(booking->clientId, bookingId, "списание", (int)finalAmount, paymentDescription);
                    }
                }
                
                cout << "Запись завершена!" << endl;
                return true;
            }
        }
        sqlite3_finalize(stmt);
        return false;
    }
    
    // Создать транзакцию
int SpaManager::createPayment(int clientId, int bookingId, string type, int amount, string description) {
        const char* sql = "INSERT INTO payments (clientId, bookingId, type, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, clientId);
            sqlite3_bind_int(stmt, 2, bookingId);
            sqlite3_bind_text(stmt, 3, type.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_int(stmt, 4, amount);
            sqlite3_bind_text(stmt, 5, ::getCurrentDateTime().c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 6, description.c_str(), -1, SQLITE_STATIC);
            
            if (sqlite3_step(stmt) == SQLITE_DONE) {
                int id = sqlite3_last_insert_rowid(db);
                sqlite3_finalize(stmt);
                loadFromDatabase(); // Обновляем кэш
                cout << "Транзакция создана! ID: " << id << endl;
                return id;
            }
        }
        sqlite3_finalize(stmt);
        return -1;
    }
    
    // Получить все транзакции клиента
vector<Payment> SpaManager::getClientPayments(int clientId) {
        vector<Payment> result;
        for (int i = 0; i < payments.size(); i++) {
            if (payments[i].clientId == clientId) {
                result.push_back(payments[i]);
            }
        }
        return result;
    }
    
    // Получить статистику
Statistics SpaManager::getStatistics() {
        Statistics stats;
        stats.totalBookings = bookings.size();
        stats.completedBookings = 0;
        stats.cancelledBookings = 0;
        stats.totalRevenue = 0;
        
        for (int i = 0; i < bookings.size(); i++) {
            if (bookings[i].status == "выполнена") {
                stats.completedBookings++;
                Service* service = findService(bookings[i].serviceId);
                if (service != nullptr) {
                    stats.totalRevenue += service->price;
                    stats.servicePopularity[bookings[i].serviceId]++;
                    stats.specialistLoad[bookings[i].specialistId]++;
                }
            } else if (bookings[i].status == "отменена") {
                stats.cancelledBookings++;
            }
        }
        
        return stats;
    }

    // Сохранить данные в БД (теперь автоматически при каждом изменении)
void SpaManager::saveToFile() {
        // Данные сохраняются автоматически в БД при каждом изменении
        cout << "Данные сохранены в БД!" << endl;
    }
    
    // Загрузить данные из БД
void SpaManager::loadFromDatabase() {
        clients.clear();
        services.clear();
        bookings.clear();
        specialists.clear();
        payments.clear();
        
        // Загружаем клиентов
        const char* sql = "SELECT id, firstName, lastName, phone, email, passwordHash, registrationDate, bonusPoints, role FROM clients";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                Client c;
                c.id = sqlite3_column_int(stmt, 0);
                c.firstName = string((const char*)sqlite3_column_text(stmt, 1));
                c.lastName = string((const char*)sqlite3_column_text(stmt, 2));
                c.phone = string((const char*)sqlite3_column_text(stmt, 3));
                c.email = string((const char*)sqlite3_column_text(stmt, 4));
                c.passwordHash = string((const char*)sqlite3_column_text(stmt, 5));
                c.registrationDate = string((const char*)sqlite3_column_text(stmt, 6));
                c.bonusPoints = sqlite3_column_int(stmt, 7);
                const char* role = (const char*)sqlite3_column_text(stmt, 8);
                c.role = role ? string(role) : "client";
                clients.push_back(c);
            }
        }
        sqlite3_finalize(stmt);
        
        // Загружаем мастеров
        sql = "SELECT id, name, specialization, averageRating, totalReviews, workSchedule FROM specialists";
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                Specialist sp;
                sp.id = sqlite3_column_int(stmt, 0);
                sp.name = string((const char*)sqlite3_column_text(stmt, 1));
                sp.specialization = string((const char*)sqlite3_column_text(stmt, 2));
                sp.averageRating = sqlite3_column_double(stmt, 3);
                sp.totalReviews = sqlite3_column_int(stmt, 4);
                sp.workSchedule = string((const char*)sqlite3_column_text(stmt, 5));
                specialists.push_back(sp);
            }
        }
        sqlite3_finalize(stmt);
        
        // Загружаем услуги
        sql = "SELECT id, name, price, duration, description FROM services";
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                Service s;
                s.id = sqlite3_column_int(stmt, 0);
                s.name = string((const char*)sqlite3_column_text(stmt, 1));
                s.price = sqlite3_column_int(stmt, 2);
                s.duration = sqlite3_column_int(stmt, 3);
                const char* desc = (const char*)sqlite3_column_text(stmt, 4);
                s.description = desc ? string(desc) : "";
                services.push_back(s);
            }
        }
        sqlite3_finalize(stmt);
        
        // Загружаем связи услуг и мастеров
        sql = "SELECT serviceId, specialistId FROM service_specialists";
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                int serviceId = sqlite3_column_int(stmt, 0);
                int specialistId = sqlite3_column_int(stmt, 1);
                Service* s = findService(serviceId);
                if (s) {
                    s->specialistIds.push_back(specialistId);
                }
            }
        }
        sqlite3_finalize(stmt);
        
        // Загружаем записи
        sql = "SELECT id, clientId, serviceId, specialistId, date, time, endTime, status, notes FROM bookings";
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                Booking b;
                b.id = sqlite3_column_int(stmt, 0);
                b.clientId = sqlite3_column_int(stmt, 1);
                b.serviceId = sqlite3_column_int(stmt, 2);
                b.specialistId = sqlite3_column_int(stmt, 3);
                b.date = string((const char*)sqlite3_column_text(stmt, 4));
                b.time = string((const char*)sqlite3_column_text(stmt, 5));
                b.endTime = string((const char*)sqlite3_column_text(stmt, 6));
                b.status = string((const char*)sqlite3_column_text(stmt, 7));
                const char* notes = (const char*)sqlite3_column_text(stmt, 8);
                b.notes = notes ? string(notes) : "";
                bookings.push_back(b);
            }
        }
        sqlite3_finalize(stmt);
        
        // Загружаем транзакции
        sql = "SELECT id, clientId, bookingId, type, amount, date, description FROM payments";
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                Payment p;
                p.id = sqlite3_column_int(stmt, 0);
                p.clientId = sqlite3_column_int(stmt, 1);
                p.bookingId = sqlite3_column_int(stmt, 2);
                p.type = string((const char*)sqlite3_column_text(stmt, 3));
                p.amount = sqlite3_column_int(stmt, 4);
                p.date = string((const char*)sqlite3_column_text(stmt, 5));
                const char* desc = (const char*)sqlite3_column_text(stmt, 6);
                p.description = desc ? string(desc) : "";
                payments.push_back(p);
            }
        }
        sqlite3_finalize(stmt);
        
        // Загружаем отзывы
        sql = "SELECT id, clientId, specialistId, bookingId, rating, text, date FROM reviews ORDER BY date DESC";
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                Review r;
                r.id = sqlite3_column_int(stmt, 0);
                r.clientId = sqlite3_column_int(stmt, 1);
                r.specialistId = sqlite3_column_int(stmt, 2);
                r.bookingId = sqlite3_column_int(stmt, 3);
                r.rating = sqlite3_column_int(stmt, 4);
                const char* text = (const char*)sqlite3_column_text(stmt, 5);
                r.text = text ? string(text) : "";
                r.date = string((const char*)sqlite3_column_text(stmt, 6));
                reviews.push_back(r);
            }
        }
        sqlite3_finalize(stmt);
        
        cout << "Данные загружены из БД!" << endl;
    }
    
    // Добавить отзыв
    int SpaManager::addReview(int clientId, int specialistId, int bookingId, int rating, string text) {
        if (rating < 1 || rating > 5) {
            return -1;
        }
        
        const char* sql = "INSERT INTO reviews (clientId, specialistId, bookingId, rating, text, date) VALUES (?, ?, ?, ?, ?, ?)";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, 0) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, clientId);
            sqlite3_bind_int(stmt, 2, specialistId);
            if (bookingId > 0) {
                sqlite3_bind_int(stmt, 3, bookingId);
            } else {
                sqlite3_bind_int(stmt, 3, 0);
            }
            sqlite3_bind_int(stmt, 4, rating);
            sqlite3_bind_text(stmt, 5, text.c_str(), -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt, 6, ::getCurrentDate().c_str(), -1, SQLITE_STATIC);
            
            if (sqlite3_step(stmt) == SQLITE_DONE) {
                int id = sqlite3_last_insert_rowid(db);
                sqlite3_finalize(stmt);
                
                // Обновляем рейтинг мастера
                const char* updateSql = "UPDATE specialists SET totalReviews = totalReviews + 1, averageRating = ((averageRating * totalReviews) + ?) / (totalReviews + 1) WHERE id = ?";
                sqlite3_stmt* updateStmt;
                if (sqlite3_prepare_v2(db, updateSql, -1, &updateStmt, 0) == SQLITE_OK) {
                    sqlite3_bind_int(updateStmt, 1, rating);
                    sqlite3_bind_int(updateStmt, 2, specialistId);
                    sqlite3_step(updateStmt);
                    sqlite3_finalize(updateStmt);
                }
                
                loadFromDatabase(); // Обновляем кэш
                cout << "Отзыв добавлен! ID: " << id << endl;
                return id;
            }
        }
        sqlite3_finalize(stmt);
        return -1;
    }
    
    // Получить отзывы
    vector<Review> SpaManager::getReviews(int specialistId) {
        vector<Review> result;
        for (int i = 0; i < reviews.size(); i++) {
            if (specialistId == -1 || reviews[i].specialistId == specialistId) {
                result.push_back(reviews[i]);
            }
        }
        return result;
    }
    
    // Получить последние отзывы
    vector<Review> SpaManager::getRecentReviews(int limit) {
        vector<Review> result;
        int count = 0;
        for (int i = 0; i < reviews.size() && count < limit; i++) {
            result.push_back(reviews[i]);
            count++;
        }
        return result;
    }