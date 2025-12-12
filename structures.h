#ifndef STRUCTURES_H
#define STRUCTURES_H

#include <vector>
#include <string>
#include <map>

using namespace std;

// Структура для мастера
struct Specialist {
    int id;
    string name;                    // имя
    string specialization;          // специализация
    vector<int> serviceIds;         // список услуг
    string workSchedule;            // рабочий график (JSON строка)
    double averageRating;           // средняя оценка
    int totalReviews;               
};

// Структура для клиента
struct Client {
    int id;
    string firstName;               // имя
    string lastName;                // фамилия
    string phone;                   // телефон
    string email;                   // email
    string passwordHash;            // хеш пароля
    string registrationDate;        // дата регистрации
    int bonusPoints;                // бонусные баллы
    string role;                    // роль: client, admin, specialist, superadmin
};

// Структура для услуги
struct Service {
    int id;
    string name;                    // название услуги
    int price;                      // цена
    int duration;                   // длительность в минутах
    string description;             // описание
    vector<int> specialistIds;     // доступные мастера
};

// Структура для записи
struct Booking {
    int id;
    int clientId;                   // id клиента
    int serviceId;                  // id услуги
    int specialistId;               // id мастера
    string date;                    // дата начала
    string time;                    // время начала
    string endTime;                 // время окончания
    string status;                  // статус (запланирована, отменена, выполнена)
    string notes;                   // комментарии
};

// Структура для платежа
struct Payment {
    int id;
    int clientId;                   // id клиента
    int bookingId;                  // id записи (если есть)
    string type;                    // тип (предоплата, списание, возврат)
    int amount;                     // сумма
    string date;                    // дата и время
    string description;             // описание
};

// Структура для отзыва
struct Review {
    int id;
    int clientId;                   // id клиента
    int specialistId;               // id мастера
    int bookingId;                  // id записи (если есть)
    int rating;                     // оценка (1-5)
    string text;                    // текст отзыва
    string date;                    // дата отзыва
};

// Структура для статистики
struct Statistics {
    int totalBookings;              // всего записей
    int completedBookings;          // выполнено
    int cancelledBookings;          // отменено
    int totalRevenue;               // общая выручка
    map<int, int> servicePopularity; // популярность услуг
    map<int, int> specialistLoad;   // загрузка мастеров
};

#endif // STRUCTURES_H

