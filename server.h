#ifndef SERVER_H
#define SERVER_H

#include "spa_manager.h"
#include <string>

using namespace std;

// Функция для отправки HTTP ответа
void sendResponse(int clientSocket, string response, string contentType = "application/json");

// Функция для отправки файла
void sendFile(int clientSocket, string filename);

// Функция для парсинга JSON (очень простая версия)
string parseRequest(string request);

// Обработка HTTP запроса
void handleRequest(int clientSocket, string request, SpaManager& spa);

// Запуск HTTP сервера
int startServer(SpaManager& spa);

#endif // SERVER_H

