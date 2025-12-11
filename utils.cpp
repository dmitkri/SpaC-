#include "utils.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <ctime>
#include <iomanip>
#include <functional>
#include <cstdlib>

using namespace std;

// Хеширование пароля (простая версия)
string hashPassword(const string& password) {
    hash<string> hasher;
    size_t hashValue = hasher(password);
    stringstream ss;
    ss << hex << hashValue;
    return ss.str();
}

// Получить текущую дату в формате YYYY-MM-DD
string getCurrentDate() {
    time_t now = time(0);
    tm* ltm = localtime(&now);
    stringstream ss;
    ss << (1900 + ltm->tm_year) << "-" 
       << setfill('0') << setw(2) << (1 + ltm->tm_mon) << "-"
       << setfill('0') << setw(2) << ltm->tm_mday;
    return ss.str();
}

// Получить текущую дату и время в формате YYYY-MM-DD HH:MM:SS
string getCurrentDateTime() {
    time_t now = time(0);
    tm* ltm = localtime(&now);
    stringstream ss;
    ss << (1900 + ltm->tm_year) << "-" 
       << setfill('0') << setw(2) << (1 + ltm->tm_mon) << "-"
       << setfill('0') << setw(2) << ltm->tm_mday << " "
       << setfill('0') << setw(2) << ltm->tm_hour << ":"
       << setfill('0') << setw(2) << ltm->tm_min << ":"
       << setfill('0') << setw(2) << ltm->tm_sec;
    return ss.str();
}

// Отправить email уведомление
void sendEmailNotification(const string& to, const string& subject, const string& body) {
    // Создаем временный файл для email
    string tempFile = "/tmp/spa_email_" + to_string(time(0)) + ".txt";
    ofstream emailFile(tempFile);
    if (emailFile.is_open()) {
        emailFile << "To: " << to << "\n";
        emailFile << "Subject: " << subject << "\n\n";
        emailFile << body << "\n";
        emailFile.close();
        
        // Пытаемся отправить через mail команду (если доступна)
        string command = "mail -s \"" + subject + "\" " + to + " < " + tempFile + " 2>/dev/null";
        int result = system(command.c_str());
        
        // Если mail не работает, просто логируем
        if (result != 0) {
            cout << "=== EMAIL УВЕДОМЛЕНИЕ ===" << endl;
            cout << "Кому: " << to << endl;
            cout << "Тема: " << subject << endl;
            cout << "Текст:" << endl;
            cout << body << endl;
            cout << "========================" << endl;
        } else {
            cout << "Email отправлен на " << to << endl;
        }
        
        // Удаляем временный файл
        remove(tempFile.c_str());
    }
}

