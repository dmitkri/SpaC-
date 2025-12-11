#include "server.h"
#include "spa_manager.h"
#include "structures.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <cstring>
#include <algorithm>
#include <cctype>

using namespace std;

// Простой HTTP сервер для API

// Функция для отправки HTTP ответа
void sendResponse(int clientSocket, string response, string contentType) {
    string httpResponse = "HTTP/1.1 200 OK\r\n";
    httpResponse += "Content-Type: " + contentType + "\r\n";
    httpResponse += "Access-Control-Allow-Origin: *\r\n";
    httpResponse += "Content-Length: " + to_string(response.length()) + "\r\n";
    httpResponse += "\r\n";
    httpResponse += response;
    
    send(clientSocket, httpResponse.c_str(), httpResponse.length(), 0);
}

// Функция для отправки файла
void sendFile(int clientSocket, string filename) {
    ifstream file(filename);
    if (!file.is_open()) {
        // Если файл не найден, отправляем 404
        string notFound = "HTTP/1.1 404 Not Found\r\n\r\n";
        send(clientSocket, notFound.c_str(), notFound.length(), 0);
        return;
    }
    
    // Читаем весь файл
    string content((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
    file.close();
    
    // Определяем тип контента по расширению
    string contentType = "text/plain";
    if (filename.find(".html") != string::npos) {
        contentType = "text/html";
    } else if (filename.find(".css") != string::npos) {
        contentType = "text/css";
    } else if (filename.find(".js") != string::npos) {
        contentType = "application/javascript";
    }
    
    sendResponse(clientSocket, content, contentType);
}

// Функция для парсинга JSON (очень простая версия)
string parseRequest(string request) {
    // Ищем тело запроса
    size_t bodyPos = request.find("\r\n\r\n");
    if (bodyPos != string::npos) {
        return request.substr(bodyPos + 4);
    }
    return "";
}


// Обработка HTTP запроса
void handleRequest(int clientSocket, string request, SpaManager& spa) {
    string response = "";
    
    // Обработка CORS preflight запросов (OPTIONS)
    if (request.find("OPTIONS") != string::npos) {
        string corsResponse = "HTTP/1.1 200 OK\r\n";
        corsResponse += "Access-Control-Allow-Origin: *\r\n";
        corsResponse += "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
        corsResponse += "Access-Control-Allow-Headers: Content-Type\r\n";
        corsResponse += "Content-Length: 0\r\n\r\n";
        send(clientSocket, corsResponse.c_str(), corsResponse.length(), 0);
    close(clientSocket);
        return;
    }
    
    // Обработка статических файлов
    // Проверяем запрос главной страницы
    if (request.find("GET / HTTP") != string::npos || 
        request.find("GET / ") != string::npos) {
        sendFile(clientSocket, "home.html");
        close(clientSocket);
        return;
    } else if (request.find("GET /index.html") != string::npos) {
        sendFile(clientSocket, "index.html");
        close(clientSocket);
        return;
    } else if (request.find("GET /booking.html") != string::npos) {
        sendFile(clientSocket, "booking.html");
        close(clientSocket);
        return;
    } else if (request.find("GET /client.html") != string::npos) {
        sendFile(clientSocket, "client.html");
        close(clientSocket);
        return;
    } else if (request.find("GET /home.html") != string::npos) {
        sendFile(clientSocket, "home.html");
        close(clientSocket);
        return;
    } else if (request.find("GET /login.html") != string::npos) {
        sendFile(clientSocket, "login.html");
        close(clientSocket);
        return;
    } else if (request.find("GET /client-dashboard.html") != string::npos) {
        sendFile(clientSocket, "client-dashboard.html");
        close(clientSocket);
        return;
    } else if (request.find("GET /style.css") != string::npos) {
        sendFile(clientSocket, "style.css");
        close(clientSocket);
        return;
    } else if (request.find("GET /script.js") != string::npos) {
        sendFile(clientSocket, "script.js");
        close(clientSocket);
        return;
    } else if (request.find("GET /booking.js") != string::npos) {
        sendFile(clientSocket, "booking.js");
        close(clientSocket);
        return;
    } else if (request.find("GET /client.js") != string::npos) {
        sendFile(clientSocket, "client.js");
        close(clientSocket);
        return;
    }
    
    // GET запросы для API
    // Сначала проверяем специфичные пути (bookings, payments)
    if (request.find("GET /api/clients/") != string::npos && request.find("/bookings") != string::npos) {
        // Получить записи клиента
        try {
        size_t clientIdPos = request.find("GET /api/clients/");
        if (clientIdPos != string::npos) {
            size_t idStart = clientIdPos + 17;
            size_t idEnd = request.find("/bookings", idStart);
            if (idEnd != string::npos) {
            int clientId = 0;
            try {
                clientId = stoi(request.substr(idStart, idEnd - idStart));
            } catch (...) {
                clientId = 0;
            }
            vector<Booking> bookings = spa.getClientBookings(clientId);
            vector<Service> services = spa.getServices();
            vector<Specialist> specialists = spa.getSpecialists();
            
            response = "[";
            for (int i = 0; i < bookings.size(); i++) {
            if (i > 0) response += ",";
            response += "{";
            response += "\"id\":" + to_string(bookings[i].id) + ",";
            response += "\"serviceId\":" + to_string(bookings[i].serviceId) + ",";
            response += "\"specialistId\":" + to_string(bookings[i].specialistId) + ",";
            response += "\"date\":\"" + bookings[i].date + "\",";
            response += "\"time\":\"" + bookings[i].time + "\",";
            response += "\"endTime\":\"" + bookings[i].endTime + "\",";
            response += "\"status\":\"" + bookings[i].status + "\"";
            response += "}";
            }
            response += "]";
            }
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("GET /api/clients/") != string::npos && request.find("/payments") != string::npos) {
        // Получить транзакции клиента
        try {
        size_t idStart = request.find("GET /api/clients/") + 17;
        size_t idEnd = request.find("/payments", idStart);
        if (idEnd != string::npos) {
            int clientId = 0;
            try {
            clientId = stoi(request.substr(idStart, idEnd - idStart));
            } catch (...) {
            clientId = 0;
            }
            if (clientId > 0) {
            vector<Payment> payments = spa.getClientPayments(clientId);
            response = "[";
            for (int i = 0; i < payments.size(); i++) {
                if (i > 0) response += ",";
                response += "{";
                response += "\"id\":" + to_string(payments[i].id) + ",";
                response += "\"bookingId\":" + to_string(payments[i].bookingId) + ",";
                response += "\"type\":\"" + payments[i].type + "\",";
                response += "\"amount\":" + to_string(payments[i].amount) + ",";
                response += "\"date\":\"" + payments[i].date + "\",";
                response += "\"description\":\"" + payments[i].description + "\"";
                response += "}";
            }
            response += "]";
            } else {
            response = "{\"error\":\"Invalid client ID\"}";
            }
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("GET /api/clients") != string::npos) {
        // Проверяем, запрашивается ли конкретный клиент
        size_t clientIdPos = request.find("GET /api/clients/");
        if (clientIdPos != string::npos) {
        // Получить клиента по ID
        size_t idStart = clientIdPos + 17;
        size_t idEnd = request.find(" ", idStart);
        if (idEnd != string::npos) {
            int clientId = 0;
            try {
            clientId = stoi(request.substr(idStart, idEnd - idStart));
            } catch (...) {
            clientId = 0;
            }
            Client* client = spa.findClient(clientId);
            if (client != nullptr) {
            response = "{";
            response += "\"id\":" + to_string(client->id) + ",";
            response += "\"firstName\":\"" + client->firstName + "\",";
            response += "\"lastName\":\"" + client->lastName + "\",";
            response += "\"name\":\"" + client->firstName + " " + client->lastName + "\",";
            response += "\"phone\":\"" + client->phone + "\",";
            response += "\"email\":\"" + client->email + "\",";
            response += "\"bonusPoints\":" + to_string(client->bonusPoints);
            response += "}";
            } else {
            response = "{\"error\":\"Client not found\"}";
            }
        }
        } else {
        // Получить всех клиентов
        vector<Client> clients = spa.getClients();
        response = "[";
        for (int i = 0; i < clients.size(); i++) {
        if (i > 0) response += ",";
        response += "{";
        response += "\"id\":" + to_string(clients[i].id) + ",";
            response += "\"firstName\":\"" + clients[i].firstName + "\",";
            response += "\"lastName\":\"" + clients[i].lastName + "\",";
            response += "\"name\":\"" + clients[i].firstName + " " + clients[i].lastName + "\",";
        response += "\"phone\":\"" + clients[i].phone + "\",";
            response += "\"email\":\"" + clients[i].email + "\",";
            response += "\"bonusPoints\":" + to_string(clients[i].bonusPoints);
        response += "}";
        }
        response += "]";
        }
        
    } else if (request.find("GET /api/services") != string::npos) {
        // Получить все услуги
        vector<Service> services = spa.getServices();
        response = "[";
        for (int i = 0; i < services.size(); i++) {
        if (i > 0) response += ",";
        response += "{";
        response += "\"id\":" + to_string(services[i].id) + ",";
        response += "\"name\":\"" + services[i].name + "\",";
        response += "\"price\":" + to_string(services[i].price) + ",";
        response += "\"duration\":" + to_string(services[i].duration) + ",";
        response += "\"description\":\"" + services[i].description + "\",";
        response += "\"specialistIds\":[";
        for (int j = 0; j < services[i].specialistIds.size(); j++) {
            if (j > 0) response += ",";
            response += to_string(services[i].specialistIds[j]);
        }
        response += "]";
        response += "}";
        }
        response += "]";
        
    } else if (request.find("GET /api/bookings") != string::npos) {
        // Получить все записи
        vector<Booking> bookings = spa.getBookings();
        vector<Client> clients = spa.getClients();
        vector<Service> services = spa.getServices();
        vector<Specialist> specialists = spa.getSpecialists();
        
        response = "[";
        for (int i = 0; i < bookings.size(); i++) {
        if (i > 0) response += ",";
        response += "{";
        response += "\"id\":" + to_string(bookings[i].id) + ",";
        response += "\"clientId\":" + to_string(bookings[i].clientId) + ",";
        response += "\"serviceId\":" + to_string(bookings[i].serviceId) + ",";
        response += "\"specialistId\":" + to_string(bookings[i].specialistId) + ",";
        response += "\"date\":\"" + bookings[i].date + "\",";
        response += "\"time\":\"" + bookings[i].time + "\",";
        response += "\"endTime\":\"" + bookings[i].endTime + "\",";
        response += "\"status\":\"" + bookings[i].status + "\",";
        response += "\"notes\":\"" + bookings[i].notes + "\"";
        response += "}";
        }
        response += "]";
        
    } else if (request.find("POST /api/auth/register") != string::npos) {
        // Регистрация нового клиента
        string body = parseRequest(request);
        string firstName = "", lastName = "", phone = "", email = "", password = "";
        
        size_t pos = body.find("\"firstName\":\"");
        if (pos != string::npos) {
        size_t start = pos + 13;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) firstName = body.substr(start, end - start);
        }
        
        pos = body.find("\"lastName\":\"");
        if (pos != string::npos) {
        size_t start = pos + 12;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) lastName = body.substr(start, end - start);
        }
        
        pos = body.find("\"phone\":\"");
        if (pos != string::npos) {
        size_t start = pos + 9;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) phone = body.substr(start, end - start);
        }
        
        pos = body.find("\"email\":\"");
        if (pos != string::npos) {
        size_t start = pos + 9;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) email = body.substr(start, end - start);
        }
        
        pos = body.find("\"password\":\"");
        if (pos != string::npos) {
        size_t start = pos + 12;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) password = body.substr(start, end - start);
        }
        
        if (firstName.empty() || lastName.empty() || phone.empty() || email.empty() || password.empty()) {
        response = "{\"error\":\"Все поля обязательны\"}";
        } else {
        // Проверяем, есть ли роль в запросе (для суперадмина)
        string role = "client";
        size_t rolePos = body.find("\"role\":\"");
        if (rolePos != string::npos) {
            size_t start = rolePos + 8;
            size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
            role = body.substr(start, end - start);
            }
        }
        
        int clientId = spa.registerClient(firstName, lastName, phone, email, password, role);
        spa.saveToFile();
        response = "{\"success\":true,\"id\":" + to_string(clientId) + "}";
        }
        
    } else if (request.find("POST /api/auth/login") != string::npos) {
        // Авторизация
        string body = parseRequest(request);
        string email = "", password = "";
        
        size_t pos = body.find("\"email\":\"");
        if (pos != string::npos) {
        size_t start = pos + 9;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) email = body.substr(start, end - start);
        }
        
        pos = body.find("\"password\":\"");
        if (pos != string::npos) {
        size_t start = pos + 12;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) password = body.substr(start, end - start);
        }
        
        if (email.empty() || password.empty()) {
        response = "{\"error\":\"Email и пароль обязательны\"}";
        } else {
        int clientId = spa.authenticateClient(email, password);
        if (clientId > 0) {
            Client* client = spa.findClient(clientId);
            string role = spa.getUserRole(clientId);
            response = "{";
            response += "\"success\":true,";
            response += "\"clientId\":" + to_string(clientId) + ",";
            response += "\"id\":" + to_string(clientId) + ",";
            response += "\"firstName\":\"" + client->firstName + "\",";
            response += "\"lastName\":\"" + client->lastName + "\",";
            response += "\"name\":\"" + client->firstName + " " + client->lastName + "\",";
            response += "\"role\":\"" + role + "\"";
            response += "}";
        } else {
            response = "{\"error\":\"Неверный email или пароль\"}";
        }
        }
        
    } else if (request.find("POST /api/clients") != string::npos) {
        // Добавить клиента
        string body = parseRequest(request);
        // Простой парсинг JSON
        string name = "", phone = "", email = "";
        size_t pos;
        
        pos = body.find("\"name\":\"");
        if (pos != string::npos) {
        size_t start = pos + 8;  // после "name":"
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) {
        name = body.substr(start, end - start);
        }
        }
        
        pos = body.find("\"phone\":\"");
        if (pos != string::npos) {
        size_t start = pos + 9;  // после "phone":"
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) {
        phone = body.substr(start, end - start);
        }
        }
        
        pos = body.find("\"email\":\"");
        if (pos != string::npos) {
        size_t start = pos + 9;  // после "email":"
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) {
            email = body.substr(start, end - start);
        }
        }
        
        // Проверяем, что все поля заполнены
        if (name.empty() || phone.empty() || email.empty()) {
        response = "{\"error\":\"Все поля обязательны\"}";
        } else {
        // Создаем клиента и получаем его ID
        int clientId = spa.addClient(name, phone, email);
        spa.saveToFile();
        response = "{\"success\":true,\"id\":" + to_string(clientId) + "}";
        }
        
    } else if (request.find("PUT /api/clients/") != string::npos) {
        // Обновить клиента
        try {
        string body = parseRequest(request);
        int clientId = 0;
        string name = "", phone = "", email = "";
        
        // Извлекаем ID из URL
        size_t urlStart = request.find("PUT /api/clients/");
        if (urlStart != string::npos) {
            size_t idStart = urlStart + 17;
            size_t idEnd = request.find(" ", idStart);
            if (idEnd != string::npos) {
            clientId = stoi(request.substr(idStart, idEnd - idStart));
            }
        }
        
        // Парсим данные из тела запроса
        size_t pos = body.find("\"name\":\"");
        if (pos != string::npos) {
        size_t start = pos + 8;
        size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
            name = body.substr(start, end - start);
            }
        }
        
        pos = body.find("\"phone\":\"");
        if (pos != string::npos) {
            size_t start = pos + 9;
            size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
            phone = body.substr(start, end - start);
            }
        }
        
        pos = body.find("\"email\":\"");
        if (pos != string::npos) {
            size_t start = pos + 9;
            size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
        email = body.substr(start, end - start);
            }
        }
        
        if (clientId > 0 && !name.empty() && !phone.empty() && !email.empty()) {
            if (spa.updateClient(clientId, name, phone, email)) {
        spa.saveToFile();
        response = "{\"success\":true}";
            } else {
            response = "{\"error\":\"Client not found\"}";
            }
        } else {
            response = "{\"error\":\"Invalid data\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("DELETE /api/clients/") != string::npos) {
        // Удалить клиента
        try {
        size_t urlStart = request.find("DELETE /api/clients/");
        if (urlStart != string::npos) {
            size_t idStart = urlStart + 20;
            size_t idEnd = request.find(" ", idStart);
            if (idEnd != string::npos) {
            int clientId = stoi(request.substr(idStart, idEnd - idStart));
            if (spa.deleteClient(clientId)) {
                spa.saveToFile();
                response = "{\"success\":true}";
            } else {
                response = "{\"error\":\"Client not found\"}";
            }
            } else {
            response = "{\"error\":\"Invalid client ID\"}";
            }
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("GET /api/clients/") != string::npos && request.find("/bookings") != string::npos) {
        // Получить записи клиента
        size_t clientIdPos = request.find("GET /api/clients/");
        if (clientIdPos != string::npos) {
        size_t idStart = clientIdPos + 17;
        size_t idEnd = request.find("/bookings", idStart);
        if (idEnd != string::npos) {
            int clientId = stoi(request.substr(idStart, idEnd - idStart));
            vector<Booking> bookings = spa.getClientBookings(clientId);
            vector<Service> services = spa.getServices();
            
            response = "[";
            for (int i = 0; i < bookings.size(); i++) {
            if (i > 0) response += ",";
            response += "{";
            response += "\"id\":" + to_string(bookings[i].id) + ",";
            response += "\"serviceId\":" + to_string(bookings[i].serviceId) + ",";
            response += "\"date\":\"" + bookings[i].date + "\",";
            response += "\"time\":\"" + bookings[i].time + "\",";
            response += "\"status\":\"" + bookings[i].status + "\"";
            response += "}";
            }
            response += "]";
        }
        }
        
    } else if (request.find("POST /api/services/") != string::npos && request.find("/specialists/") != string::npos) {
        // Привязать мастера к услуге
        try {
        size_t urlStart = request.find("/api/services/");
        if (urlStart != string::npos) {
            size_t serviceIdStart = urlStart + 14;
            size_t serviceIdEnd = request.find("/specialists/", serviceIdStart);
            if (serviceIdEnd != string::npos && serviceIdEnd > serviceIdStart) {
            int serviceId = stoi(request.substr(serviceIdStart, serviceIdEnd - serviceIdStart));
            size_t specialistIdStart = serviceIdEnd + 13;
            size_t specialistIdEnd = request.find(" ", specialistIdStart);
            if (specialistIdEnd == string::npos) specialistIdEnd = request.find("\r", specialistIdStart);
            if (specialistIdEnd == string::npos) specialistIdEnd = request.find("\n", specialistIdStart);
            if (specialistIdEnd == string::npos) specialistIdEnd = request.length();
            
            if (specialistIdEnd > specialistIdStart) {
                int specialistId = stoi(request.substr(specialistIdStart, specialistIdEnd - specialistIdStart));
                spa.addSpecialistToService(serviceId, specialistId);
                spa.saveToFile();
                response = "{\"success\":true}";
            } else {
                response = "{\"error\":\"Invalid specialist ID\"}";
            }
            } else {
            response = "{\"error\":\"Invalid service ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("POST /api/services") != string::npos) {
        // Добавить услугу
        try {
        string body = parseRequest(request);
        string name = "", description = "";
        int price = 0, duration = 0;
        
        size_t pos = body.find("\"name\":\"");
        if (pos != string::npos) {
            size_t start = pos + 8;
        size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
        name = body.substr(start, end - start);
            }
        }
        
        pos = body.find("\"description\":\"");
        if (pos != string::npos) {
            size_t start = pos + 15;
            size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
            description = body.substr(start, end - start);
            }
        }
        
        pos = body.find("\"price\":");
        if (pos != string::npos) {
            size_t start = pos + 8;
        size_t end = body.find_first_of(",}", start);
            if (end != string::npos && end > start) {
            string priceStr = body.substr(start, end - start);
            while (!priceStr.empty() && priceStr[0] == ' ') {
                priceStr = priceStr.substr(1);
            }
            if (!priceStr.empty()) {
                price = stoi(priceStr);
            }
            }
        }
        
        pos = body.find("\"duration\":");
        if (pos != string::npos) {
            size_t start = pos + 11;
        size_t end = body.find_first_of(",}", start);
            if (end != string::npos && end > start) {
            string durationStr = body.substr(start, end - start);
            while (!durationStr.empty() && durationStr[0] == ' ') {
                durationStr = durationStr.substr(1);
            }
            if (!durationStr.empty()) {
                duration = stoi(durationStr);
            }
            }
        }
        
        // Проверяем, что все обязательные поля заполнены
        if (name.empty() || price <= 0 || duration <= 0) {
            response = "{\"error\":\"Все поля обязательны и должны быть положительными числами\"}";
        } else {
            spa.addService(name, price, duration, description);
        spa.saveToFile();
        response = "{\"success\":true}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("POST /api/bookings/") != string::npos && request.find("/cancel") != string::npos) {
        // Отменить запись
        try {
        size_t idStart = request.find("/api/bookings/") + 14;
        size_t idEnd = request.find("/cancel", idStart);
        if (idEnd != string::npos && idEnd > idStart) {
            int bookingId = stoi(request.substr(idStart, idEnd - idStart));
            if (spa.cancelBooking(bookingId)) {
            spa.saveToFile();
            response = "{\"success\":true}";
            } else {
            response = "{\"error\":\"Не удалось отменить запись\"}";
            }
        } else {
            response = "{\"error\":\"Invalid booking ID\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("POST /api/bookings/") != string::npos && request.find("/complete") != string::npos) {
        // Завершить запись с оплатой
        try {
        size_t idStart = request.find("/api/bookings/") + 14;
        size_t idEnd = request.find("/complete", idStart);
        if (idEnd != string::npos && idEnd > idStart) {
            string idStr = request.substr(idStart, idEnd - idStart);
            int bookingId = 0;
            try {
            bookingId = stoi(idStr);
            } catch (...) {
            bookingId = 0;
            }
            
            if (bookingId > 0) {
            
            string body = parseRequest(request);
            string paymentMethod = "cash";
            double discount = 0.0;
            string bonusAction = "none";
            int bonusPoints = 0;
            double finalAmount = 0.0;
            
            // Парсим paymentMethod
            size_t pos = body.find("\"paymentMethod\":\"");
            if (pos != string::npos) {
                size_t start = pos + 17;
                size_t end = body.find("\"", start);
                if (end != string::npos && end > start) {
                paymentMethod = body.substr(start, end - start);
                }
            }
            
            // Парсим discount
            pos = body.find("\"discount\":");
            if (pos != string::npos) {
                size_t start = pos + 11;
                size_t end = body.find_first_of(",}", start);
                if (end != string::npos && end > start) {
                string discountStr = body.substr(start, end - start);
                while (!discountStr.empty() && discountStr[0] == ' ') {
                    discountStr = discountStr.substr(1);
                }
                if (!discountStr.empty()) {
                    discount = stod(discountStr);
                }
                }
            }
            
            // Парсим bonusAction
            pos = body.find("\"bonusAction\":\"");
            if (pos != string::npos) {
                size_t start = pos + 14;
                size_t end = body.find("\"", start);
                if (end != string::npos && end > start) {
                bonusAction = body.substr(start, end - start);
                }
            }
            
            // Парсим bonusPoints
            pos = body.find("\"bonusPoints\":");
            if (pos != string::npos) {
                size_t start = pos + 14;
                size_t end = body.find_first_of(",}", start);
                if (end != string::npos && end > start) {
                string bonusStr = body.substr(start, end - start);
                while (!bonusStr.empty() && bonusStr[0] == ' ') {
                    bonusStr = bonusStr.substr(1);
                }
                if (!bonusStr.empty()) {
                    bonusPoints = stoi(bonusStr);
                }
                }
            }
            
            // Парсим finalAmount
            pos = body.find("\"finalAmount\":");
            if (pos != string::npos) {
                size_t start = pos + 14;
                size_t end = body.find_first_of(",}", start);
                if (end != string::npos && end > start) {
                string amountStr = body.substr(start, end - start);
                while (!amountStr.empty() && amountStr[0] == ' ') {
                    amountStr = amountStr.substr(1);
                }
                if (!amountStr.empty()) {
                    finalAmount = stod(amountStr);
                }
                }
            }
            
            if (spa.completeBooking(bookingId, paymentMethod, discount, bonusAction, bonusPoints, finalAmount)) {
                spa.saveToFile();
                response = "{\"success\":true}";
            } else {
                response = "{\"error\":\"Booking not found\"}";
            }
            } else {
            response = "{\"error\":\"Invalid booking ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid booking ID format\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("POST /api/bookings") != string::npos) {
        // Создать запись
        try {
        string body = parseRequest(request);
        int clientId = 0, serviceId = 0;
        string date = "", time = "";
        
        size_t pos = body.find("\"clientId\":");
        if (pos != string::npos) {
            size_t start = pos + 11;  // после "clientId":
        size_t end = body.find_first_of(",}", start);
            if (end != string::npos && end > start) {
            string clientIdStr = body.substr(start, end - start);
            // Убираем пробелы если есть
            while (!clientIdStr.empty() && clientIdStr[0] == ' ') {
                clientIdStr = clientIdStr.substr(1);
            }
            if (!clientIdStr.empty()) {
                clientId = stoi(clientIdStr);
            }
            }
        }
        
        pos = body.find("\"serviceId\":");
        if (pos != string::npos) {
            size_t start = pos + 12;  // после "serviceId":
        size_t end = body.find_first_of(",}", start);
            if (end != string::npos && end > start) {
            string serviceIdStr = body.substr(start, end - start);
            // Убираем пробелы если есть
            while (!serviceIdStr.empty() && serviceIdStr[0] == ' ') {
                serviceIdStr = serviceIdStr.substr(1);
            }
            if (!serviceIdStr.empty()) {
                serviceId = stoi(serviceIdStr);
            }
            }
        }
        
        pos = body.find("\"date\":\"");
        if (pos != string::npos) {
            size_t start = pos + 8;
        size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
        date = body.substr(start, end - start);
            }
        }
        
        pos = body.find("\"time\":\"");
        if (pos != string::npos) {
            size_t start = pos + 8;
        size_t end = body.find("\"", start);
            if (end != string::npos && end > start) {
        time = body.substr(start, end - start);
            }
        }
        
        // Валидация года - проверяем, что год состоит из 4 цифр
        bool validYear = false;
        if (!date.empty()) {
            // Формат даты: YYYY-MM-DD
            size_t firstDash = date.find('-');
            if (firstDash != string::npos && firstDash == 4) {
            string year = date.substr(0, 4);
            // Проверяем, что год состоит из 4 цифр
            validYear = (year.length() == 4);
            for (char c : year) {
                if (!isdigit(c)) {
                validYear = false;
                break;
                }
            }
            }
        }
        
        if (clientId > 0 && serviceId > 0 && !date.empty() && !time.empty() && validYear) {
        spa.createBooking(clientId, serviceId, date, time);
        spa.saveToFile();
        response = "{\"success\":true}";
        } else {
            if (!validYear) {
            response = "{\"error\":\"Год должен состоять из 4 цифр\"}";
            } else {
            response = "{\"error\":\"Invalid data\"}";
            }
        }
        } catch (...) {
        // Если что-то пошло не так, отправляем ошибку
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("PUT /api/bookings/") != string::npos) {
        // Обновить статус записи
        string body = parseRequest(request);
        int bookingId = 0;
        string action = "";
        
        // Извлекаем ID из URL
        size_t urlStart = request.find("PUT /api/bookings/");
        if (urlStart != string::npos) {
        size_t idStart = urlStart + 18;
        size_t idEnd = request.find(" ", idStart);
        bookingId = stoi(request.substr(idStart, idEnd - idStart));
        }
        
        size_t pos = body.find("\"action\":\"");
        if (pos != string::npos) {
        size_t start = pos + 10;  // после "action":"
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) {
        action = body.substr(start, end - start);
        }
        }
        
        if (bookingId > 0 && !action.empty()) {
        if (action == "cancel") {
        spa.cancelBooking(bookingId);
            spa.saveToFile();
            response = "{\"success\":true}";
        } else if (action == "complete") {
        spa.completeBooking(bookingId);
            spa.saveToFile();
            response = "{\"success\":true}";
        } else {
            response = "{\"error\":\"Unknown action\"}";
        }
        } else {
        response = "{\"error\":\"Invalid booking ID or action\"}";
        }
        
    } else if (request.find("GET /api/specialists/") != string::npos && request.find("/slots") != string::npos) {
        // Получить доступные временные слоты для мастера
        try {
        size_t urlPos = request.find("/api/specialists/");
        if (urlPos != string::npos) {
            size_t idStart = urlPos + 17; // длина "/api/specialists/"
            size_t idEnd = request.find("/slots", idStart);
            if (idEnd != string::npos && idEnd > idStart) {
            string idStr = request.substr(idStart, idEnd - idStart);
            int specialistId = 0;
            try {
                specialistId = stoi(idStr);
            } catch (...) {
                specialistId = 0;
            }
            
            if (specialistId > 0) {
                // Извлекаем дату и serviceId из query параметров
                string date = "";
                int serviceId = 0;
                size_t datePos = request.find("date=");
                if (datePos != string::npos) {
                size_t dateStart = datePos + 5;
                size_t dateEnd = request.find("&", dateStart);
                if (dateEnd == string::npos) dateEnd = request.find(" ", dateStart);
                if (dateEnd == string::npos) dateEnd = request.find("\r", dateStart);
                if (dateEnd == string::npos) dateEnd = request.find("\n", dateStart);
                if (dateEnd == string::npos) dateEnd = request.length();
                if (dateEnd > dateStart) {
                    date = request.substr(dateStart, dateEnd - dateStart);
                }
                }
                
                size_t servicePos = request.find("serviceId=");
                if (servicePos != string::npos) {
                size_t serviceStart = servicePos + 10;
                size_t serviceEnd = request.find("&", serviceStart);
                if (serviceEnd == string::npos) serviceEnd = request.find(" ", serviceStart);
                if (serviceEnd == string::npos) serviceEnd = request.find("\r", serviceStart);
                if (serviceEnd == string::npos) serviceEnd = request.find("\n", serviceStart);
                if (serviceEnd == string::npos) serviceEnd = request.length();
                if (serviceEnd > serviceStart) {
                    string serviceStr = request.substr(serviceStart, serviceEnd - serviceStart);
                    try {
                    serviceId = stoi(serviceStr);
                    } catch (...) {
                    serviceId = 0;
                    }
                }
                }
                
                if (!date.empty() && serviceId > 0) {
                Service* service = spa.findService(serviceId);
                if (service != nullptr) {
                    vector<string> slots = spa.getAvailableTimeSlots(specialistId, date, service->duration);
                    response = "[";
                    for (int i = 0; i < slots.size(); i++) {
                    if (i > 0) response += ",";
                    response += "\"" + slots[i] + "\"";
                    }
                    response += "]";
                } else {
                    response = "{\"error\":\"Service not found\"}";
                }
                } else {
                response = "{\"error\":\"Date and serviceId required\"}";
                }
            } else {
                response = "{\"error\":\"Invalid specialist ID\"}";
            }
            } else {
            response = "{\"error\":\"Invalid specialist ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("POST /api/specialists/") != string::npos && request.find("/review") != string::npos) {
        // Добавить отзыв мастеру
        try {
        size_t urlPos = request.find("/api/specialists/");
        if (urlPos != string::npos) {
            size_t idStart = urlPos + 17;
            size_t idEnd = request.find("/review", idStart);
            if (idEnd != string::npos && idEnd > idStart) {
            string idStr = request.substr(idStart, idEnd - idStart);
            int specialistId = stoi(idStr);
            
            string body = parseRequest(request);
            int rating = 0;
            int bookingId = 0;
            
            size_t pos = body.find("\"rating\":");
            if (pos != string::npos) {
                size_t start = pos + 9;
                size_t end = body.find_first_of(",}", start);
                if (end != string::npos && end > start) {
                rating = stoi(body.substr(start, end - start));
                }
            }
            
            pos = body.find("\"bookingId\":");
            if (pos != string::npos) {
                size_t start = pos + 12;
                size_t end = body.find_first_of(",}", start);
                if (end != string::npos && end > start) {
                bookingId = stoi(body.substr(start, end - start));
                }
            }
            
            // Парсим текст отзыва
            string reviewText = "";
            pos = body.find("\"text\":\"");
            if (pos != string::npos) {
                size_t start = pos + 8;
                size_t end = body.find("\"", start);
                if (end != string::npos && end > start) {
                    reviewText = body.substr(start, end - start);
                }
            }
            
            // Парсим clientId
            int clientId = 0;
            pos = body.find("\"clientId\":");
            if (pos != string::npos) {
                size_t start = pos + 11;
                size_t end = body.find_first_of(",}", start);
                if (end != string::npos && end > start) {
                    string clientIdStr = body.substr(start, end - start);
                    while (!clientIdStr.empty() && clientIdStr[0] == ' ') {
                        clientIdStr = clientIdStr.substr(1);
                    }
                    if (!clientIdStr.empty()) {
                        clientId = stoi(clientIdStr);
                    }
                }
            }
            
            Specialist* specialist = spa.findSpecialist(specialistId);
            if (specialist != nullptr && rating > 0 && rating <= 5 && clientId > 0) {
                // Добавляем отзыв
                int reviewId = spa.addReview(clientId, specialistId, bookingId, rating, reviewText);
                if (reviewId > 0) {
                    spa.saveToFile();
                    response = "{\"success\":true,\"id\":" + to_string(reviewId) + "}";
                } else {
                    response = "{\"error\":\"Failed to add review\"}";
                }
            } else {
                response = "{\"error\":\"Invalid data\"}";
            }
            } else {
            response = "{\"error\":\"Invalid specialist ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("GET /api/reviews") != string::npos) {
        // Получить отзывы
        try {
            vector<Review> allReviews;
            
            // Проверяем, запрашиваются ли отзывы конкретного клиента
            size_t clientPos = request.find("/api/reviews?clientId=");
            if (clientPos != string::npos) {
                size_t idStart = clientPos + 23;
                size_t idEnd = request.find("&", idStart);
                if (idEnd == string::npos) idEnd = request.find(" ", idStart);
                if (idEnd == string::npos) idEnd = request.find("\r", idStart);
                if (idEnd == string::npos) idEnd = request.find("\n", idStart);
                if (idEnd == string::npos) idEnd = request.length();
                
                if (idEnd > idStart) {
                    int clientId = stoi(request.substr(idStart, idEnd - idStart));
                    // Получаем все отзывы и фильтруем по clientId
                    vector<Review> all = spa.getReviews(-1);
                    for (int i = 0; i < all.size(); i++) {
                        if (all[i].clientId == clientId) {
                            allReviews.push_back(all[i]);
                        }
                    }
                }
            } else {
                // Проверяем, запрашиваются ли отзывы конкретного мастера
                size_t specialistPos = request.find("/api/reviews?specialistId=");
                if (specialistPos != string::npos) {
                    size_t idStart = specialistPos + 28;
                    size_t idEnd = request.find(" ", idStart);
                    if (idEnd == string::npos) idEnd = request.find("\r", idStart);
                    if (idEnd == string::npos) idEnd = request.find("\n", idStart);
                    if (idEnd == string::npos) idEnd = request.length();
                    
                    if (idEnd > idStart) {
                        int specialistId = stoi(request.substr(idStart, idEnd - idStart));
                        allReviews = spa.getReviews(specialistId);
                    }
                } else {
                    // Получаем последние отзывы (по умолчанию 10)
                    allReviews = spa.getRecentReviews(10);
                }
            }
            
            vector<Client> clients = spa.getClients();
            vector<Specialist> specialists = spa.getSpecialists();
            
            response = "[";
            for (int i = 0; i < allReviews.size(); i++) {
                if (i > 0) response += ",";
                
                // Находим клиента и мастера
                Client* client = nullptr;
                Specialist* specialist = nullptr;
                for (int j = 0; j < clients.size(); j++) {
                    if (clients[j].id == allReviews[i].clientId) {
                        client = &clients[j];
                        break;
                    }
                }
                for (int j = 0; j < specialists.size(); j++) {
                    if (specialists[j].id == allReviews[i].specialistId) {
                        specialist = &specialists[j];
                        break;
                    }
                }
                
                response += "{";
                response += "\"id\":" + to_string(allReviews[i].id) + ",";
                response += "\"clientId\":" + to_string(allReviews[i].clientId) + ",";
                response += "\"specialistId\":" + to_string(allReviews[i].specialistId) + ",";
                response += "\"bookingId\":" + to_string(allReviews[i].bookingId) + ",";
                response += "\"rating\":" + to_string(allReviews[i].rating) + ",";
                response += "\"text\":\"" + allReviews[i].text + "\",";
                response += "\"date\":\"" + allReviews[i].date + "\"";
                
                if (client != nullptr) {
                    response += ",\"clientName\":\"" + client->firstName + " " + client->lastName + "\"";
                }
                if (specialist != nullptr) {
                    response += ",\"specialistName\":\"" + specialist->name + "\"";
                    response += ",\"specialization\":\"" + specialist->specialization + "\"";
                }
                
                response += "}";
            }
            response += "]";
        } catch (...) {
            response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("GET /api/specialists/") != string::npos && request.find("/bookings") != string::npos) {
        // Получить записи мастера
        try {
        size_t urlPos = request.find("/api/specialists/");
        if (urlPos != string::npos) {
            size_t idStart = urlPos + 17; // длина "/api/specialists/"
            size_t idEnd = request.find("/bookings", idStart);
            if (idEnd != string::npos && idEnd > idStart) {
            string idStr = request.substr(idStart, idEnd - idStart);
            int specialistId = stoi(idStr);
            vector<Booking> bookings = spa.getSpecialistBookings(specialistId);
            
            response = "[";
            for (int i = 0; i < bookings.size(); i++) {
            if (i > 0) response += ",";
            response += "{";
            response += "\"id\":" + to_string(bookings[i].id) + ",";
            response += "\"clientId\":" + to_string(bookings[i].clientId) + ",";
            response += "\"serviceId\":" + to_string(bookings[i].serviceId) + ",";
            response += "\"date\":\"" + bookings[i].date + "\",";
            response += "\"time\":\"" + bookings[i].time + "\",";
            response += "\"endTime\":\"" + bookings[i].endTime + "\",";
            response += "\"status\":\"" + bookings[i].status + "\",";
            response += "\"notes\":\"" + bookings[i].notes + "\"";
            response += "}";
            }
            response += "]";
            } else {
            response = "{\"error\":\"Invalid specialist ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("GET /api/specialists/") != string::npos) {
        // Получить мастера по ID
        try {
        size_t urlPos = request.find("/api/specialists/");
        if (urlPos != string::npos) {
            size_t idStart = urlPos + 17; // длина "/api/specialists/"
            size_t idEnd = idStart;
            // Ищем конец ID (пробел, /, \r, \n)
            while (idEnd < request.length() && 
               request[idEnd] != ' ' && 
               request[idEnd] != '/' && 
               request[idEnd] != '\r' && 
               request[idEnd] != '\n') {
            idEnd++;
            }
            if (idEnd > idStart) {
            string idStr = request.substr(idStart, idEnd - idStart);
            int specialistId = stoi(idStr);
            Specialist* specialist = spa.findSpecialist(specialistId);
            if (specialist != nullptr) {
                response = "{";
                response += "\"id\":" + to_string(specialist->id) + ",";
                response += "\"name\":\"" + specialist->name + "\",";
                response += "\"specialization\":\"" + specialist->specialization + "\",";
                response += "\"averageRating\":" + to_string(specialist->averageRating) + ",";
                response += "\"totalReviews\":" + to_string(specialist->totalReviews) + ",";
                response += "\"workSchedule\":\"" + specialist->workSchedule + "\"";
                response += "}";
            } else {
                response = "{\"error\":\"Specialist not found\"}";
            }
            } else {
            response = "{\"error\":\"Invalid specialist ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("PUT /api/specialists/") != string::npos && request.find("/schedule") != string::npos) {
        // Установить расписание мастера
        try {
        string body = parseRequest(request);
        size_t urlPos = request.find("/api/specialists/");
        if (urlPos != string::npos) {
            size_t idStart = urlPos + 17; // длина "/api/specialists/"
            size_t idEnd = request.find("/schedule", idStart);
            if (idEnd != string::npos && idEnd > idStart) {
            string idStr = request.substr(idStart, idEnd - idStart);
            int specialistId = stoi(idStr);
            
            string schedule = "";
            size_t pos = body.find("\"schedule\":\"");
            if (pos != string::npos) {
                size_t start = pos + 12;
                size_t end = body.find("\"", start);
                if (end != string::npos && end > start) {
                schedule = body.substr(start, end - start);
                }
            }
            
            if (spa.setSpecialistSchedule(specialistId, schedule)) {
        spa.saveToFile();
        response = "{\"success\":true}";
            } else {
                response = "{\"error\":\"Specialist not found\"}";
            }
            } else {
            response = "{\"error\":\"Invalid specialist ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("GET /api/specialists") != string::npos) {
        // Получить всех мастеров
        vector<Specialist> specialists = spa.getSpecialists();
        response = "[";
        for (int i = 0; i < specialists.size(); i++) {
        if (i > 0) response += ",";
        response += "{";
        response += "\"id\":" + to_string(specialists[i].id) + ",";
        response += "\"name\":\"" + specialists[i].name + "\",";
        response += "\"specialization\":\"" + specialists[i].specialization + "\",";
        response += "\"averageRating\":" + to_string(specialists[i].averageRating) + ",";
        response += "\"totalReviews\":" + to_string(specialists[i].totalReviews) + ",";
        response += "\"workSchedule\":\"" + specialists[i].workSchedule + "\"";
        response += "}";
        }
        response += "]";
        
    } else if (request.find("POST /api/specialists") != string::npos) {
        // Добавить мастера
        string body = parseRequest(request);
        string name = "", specialization = "";
        
        size_t pos = body.find("\"name\":\"");
        if (pos != string::npos) {
        size_t start = pos + 8;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) name = body.substr(start, end - start);
        }
        
        pos = body.find("\"specialization\":\"");
        if (pos != string::npos) {
        size_t start = pos + 18;
        size_t end = body.find("\"", start);
        if (end != string::npos && end > start) specialization = body.substr(start, end - start);
        }
        
        if (!name.empty() && !specialization.empty()) {
        int specialistId = spa.addSpecialist(name, specialization);
        spa.saveToFile();
        response = "{\"success\":true,\"id\":" + to_string(specialistId) + "}";
        } else {
        response = "{\"error\":\"Все поля обязательны\"}";
        }
        
    } else if (request.find("GET /api/statistics") != string::npos) {
        // Получить статистику
        Statistics stats = spa.getStatistics();
        response = "{";
        response += "\"totalBookings\":" + to_string(stats.totalBookings) + ",";
        response += "\"completedBookings\":" + to_string(stats.completedBookings) + ",";
        response += "\"cancelledBookings\":" + to_string(stats.cancelledBookings) + ",";
        response += "\"totalRevenue\":" + to_string(stats.totalRevenue);
        response += "}";
        
    } else if (request.find("DELETE /api/services/") != string::npos) {
        // Удалить услугу
        try {
        size_t urlStart = request.find("DELETE /api/services/");
        if (urlStart != string::npos) {
            size_t idStart = urlStart + 21;
            size_t idEnd = request.find(" ", idStart);
            if (idEnd != string::npos) {
            int serviceId = stoi(request.substr(idStart, idEnd - idStart));
            if (spa.deleteService(serviceId)) {
                spa.saveToFile();
                response = "{\"success\":true}";
            } else {
                response = "{\"error\":\"Service not found\"}";
            }
            } else {
            response = "{\"error\":\"Invalid service ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else if (request.find("DELETE /api/specialists/") != string::npos) {
        // Удалить мастера
        try {
        size_t urlStart = request.find("DELETE /api/specialists/");
        if (urlStart != string::npos) {
            size_t idStart = urlStart + 24;
            size_t idEnd = request.find(" ", idStart);
            if (idEnd != string::npos) {
            int specialistId = stoi(request.substr(idStart, idEnd - idStart));
            if (spa.deleteSpecialist(specialistId)) {
                spa.saveToFile();
                response = "{\"success\":true}";
            } else {
                response = "{\"error\":\"Specialist not found\"}";
            }
            } else {
            response = "{\"error\":\"Invalid specialist ID\"}";
            }
        } else {
            response = "{\"error\":\"Invalid request\"}";
        }
        } catch (...) {
        response = "{\"error\":\"Server error\"}";
        }
        
    } else {
        // 404 для неизвестных запросов
        response = "{\"error\":\"Not found\"}";
    }
    
    sendResponse(clientSocket, response);
    close(clientSocket);
}

// Запуск HTTP сервера
int startServer(SpaManager& spa) {
    // Создаем сокет для HTTP сервера
    int serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket < 0) {
        cerr << "Ошибка создания сокета" << endl;
        return 1;
    }
    
    // Настройки сокета
    int opt = 1;
    setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    // Адрес сервера
    struct sockaddr_in address;
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(8081);
    
    // Привязываем сокет
    if (::bind(serverSocket, (struct sockaddr*)&address, sizeof(address)) < 0) {
        cerr << "Ошибка привязки сокета" << endl;
        return 1;
    }
    
    // Слушаем подключения
    if (listen(serverSocket, 5) < 0) {
        cerr << "Ошибка прослушивания" << endl;
        return 1;
    }
    
    cout << "Сервер запущен на порту 8081" << endl;
    cout << "Откройте в браузере: http://localhost:8081" << endl;
    
    // Основной цикл сервера
    while (true) {
        struct sockaddr_in clientAddr;
        socklen_t clientLen = sizeof(clientAddr);
        int clientSocket = accept(serverSocket, (struct sockaddr*)&clientAddr, &clientLen);
        
        if (clientSocket < 0) {
            continue;
        }
        
        // Читаем запрос
        char buffer[4096] = {0};
        int bytesRead = read(clientSocket, buffer, 4096);
        if (bytesRead <= 0) {
            close(clientSocket);
            continue;
        }
        string request(buffer);
        
        // Обработка CORS preflight запросов (OPTIONS)
        if (request.find("OPTIONS") != string::npos) {
            string corsResponse = "HTTP/1.1 200 OK\r\n";
            corsResponse += "Access-Control-Allow-Origin: *\r\n";
            corsResponse += "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
            corsResponse += "Access-Control-Allow-Headers: Content-Type\r\n";
            corsResponse += "Content-Length: 0\r\n\r\n";
            send(clientSocket, corsResponse.c_str(), corsResponse.length(), 0);
            close(clientSocket);
            continue;
        }
        
        // Обработка статических файлов
        if (request.find("GET / HTTP") != string::npos || request.find("GET / ") != string::npos) {
            sendFile(clientSocket, "home.html");
            close(clientSocket);
            continue;
        } else if (request.find("GET /index.html") != string::npos) {
            sendFile(clientSocket, "index.html");
            close(clientSocket);
            continue;
        } else if (request.find("GET /client.html") != string::npos) {
            sendFile(clientSocket, "client.html");
            close(clientSocket);
            continue;
        } else if (request.find("GET /home.html") != string::npos) {
            sendFile(clientSocket, "home.html");
            close(clientSocket);
            continue;
        } else if (request.find("GET /login.html") != string::npos) {
            sendFile(clientSocket, "login.html");
            close(clientSocket);
            continue;
        } else if (request.find("GET /client-dashboard.html") != string::npos) {
            sendFile(clientSocket, "client-dashboard.html");
            close(clientSocket);
            continue;
        } else if (request.find("GET /style.css") != string::npos) {
            sendFile(clientSocket, "style.css");
            close(clientSocket);
            continue;
        } else if (request.find("GET /script.js") != string::npos) {
            sendFile(clientSocket, "script.js");
            close(clientSocket);
            continue;
        } else if (request.find("GET /client.js") != string::npos) {
            sendFile(clientSocket, "client.js");
            close(clientSocket);
            continue;
        }
        
        // Обрабатываем API запросы
        handleRequest(clientSocket, request, spa);
    }
    
    close(serverSocket);
    return 0;
}
