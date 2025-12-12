#include "spa_manager.h"
#include "server.h"
#include <iostream>

using namespace std;

int main() {
    SpaManager spa;
    
    
    if (spa.getClients().size() == 0) {
        spa.registerClient("Иван", "Иванов", "+79001234567", "ivan@mail.ru", "password123");
        spa.registerClient("Мария", "Петрова", "+79007654321", "maria@mail.ru", "password123");
        
        int master1 = spa.addSpecialist("Анна Смирнова", "Массажист");
        int master2 = spa.addSpecialist("Елена Козлова", "Косметолог");
        int master3 = spa.addSpecialist("Ольга Новикова", "Мастер маникюра");
        
        spa.addService("Классический массаж", 2000, 60, "Расслабляющий массаж всего тела");
        spa.addService("Спортивный массаж", 2500, 60, "Интенсивный массаж для спортсменов");
        spa.addService("Маникюр", 1500, 45, "Классический маникюр");
        spa.addService("Педикюр", 1800, 60, "Уход за ногами");
        spa.addService("Фейс-лифтинг", 3000, 90, "Омолаживающая процедура для лица");
        spa.addService("СПА-процедура", 4000, 120, "Комплексная процедура для всего тела");
        
        spa.addSpecialistToService(1, master1);
        spa.addSpecialistToService(2, master1);
        spa.addSpecialistToService(3, master3);
        spa.addSpecialistToService(4, master3);
        spa.addSpecialistToService(5, master2);
        spa.addSpecialistToService(6, master2);
    }
    
    return startServer(spa);
}
