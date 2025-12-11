#ifndef SPA_MANAGER_H
#define SPA_MANAGER_H

#include "structures.h"
#include "utils.h"
#include <sqlite3.h>
#include <vector>
#include <string>
#include <utility>

using namespace std;

class SpaManager {
private:
    sqlite3* db;
    vector<Client> clients;
    vector<Service> services;
    vector<Booking> bookings;
    vector<Specialist> specialists;
    vector<Payment> payments;
    vector<Review> reviews;
    
    bool initDatabase();
    void loadFromDatabase();

public:
    SpaManager();
    ~SpaManager();
    
    // Работа с клиентами
    int registerClient(string firstName, string lastName, string phone, string email, string password, string role = "client");
    int addClient(string name, string phone, string email);
    int authenticateClient(string email, string password);
    string getUserRole(int userId);
    vector<Client> getClients();
    Client* findClient(int id);
    bool updateClient(int id, string firstName, string lastName, string phone, string email);
    bool updateClient(int id, string name, string phone, string email);
    bool deleteClient(int id);
    vector<Booking> getClientBookings(int clientId);
    
    // Работа с услугами
    void addService(string name, int price, int duration, string description = "");
    bool deleteService(int id);
    vector<Service> getServices();
    Service* findService(int id);
    
    // Работа с мастерами
    int addSpecialist(string name, string specialization);
    bool deleteSpecialist(int id);
    vector<Specialist> getSpecialists();
    Specialist* findSpecialist(int id);
    bool setSpecialistSchedule(int specialistId, string schedule);
    vector<Booking> getSpecialistBookings(int specialistId);
    
    // Связь мастеров и услуг
    void addSpecialistToService(int serviceId, int specialistId);
    bool removeSpecialistFromService(int serviceId, int specialistId);
    vector<int> getSpecialistsForService(int serviceId);
    vector<int> getServicesForSpecialist(int specialistId);
    
    // Работа с записями
    int createBooking(int clientId, int serviceId, int specialistId, string date, string time, string notes = "");
    void createBooking(int clientId, int serviceId, string date, string time);
    vector<Booking> getBookings();
    bool cancelBooking(int bookingId, string reason = "");
    bool completeBooking(int bookingId, string paymentMethod = "cash", double discount = 0.0, 
                         string bonusAction = "none", int bonusPoints = 0, double finalAmount = 0.0);
    
    // Работа с временными слотами
    bool isTimeSlotAvailable(int specialistId, string date, string time, int duration);
    pair<string, string> getSpecialistWorkHours(int specialistId, string date);
    vector<string> getAvailableTimeSlots(int specialistId, string date, int duration);
    string calculateEndTime(const string& startTime, int durationMinutes);
    
    // Работа с платежами
    int createPayment(int clientId, int bookingId, string type, int amount, string description = "");
    vector<Payment> getClientPayments(int clientId);
    
    // Статистика
    Statistics getStatistics();
    
    // Работа с отзывами
    int addReview(int clientId, int specialistId, int bookingId, int rating, string text = "");
    vector<Review> getReviews(int specialistId = -1); // -1 для всех отзывов
    vector<Review> getRecentReviews(int limit = 10);
    
    // Утилиты
    sqlite3* getDatabase();
    void saveToFile();
};

#endif // SPA_MANAGER_H
