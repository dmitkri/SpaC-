// Mock API для работы без сервера (используется localStorage)
// Эмулирует все endpoints C++ сервера

(function() {
    'use strict';

    // Инициализация данных в localStorage
    function initStorage() {
        // Инициализируем остальные хранилища
        if (!localStorage.getItem('spa_services')) {
            localStorage.setItem('spa_services', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_specialists')) {
            localStorage.setItem('spa_specialists', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_bookings')) {
            localStorage.setItem('spa_bookings', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_payments')) {
            localStorage.setItem('spa_payments', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_reviews')) {
            localStorage.setItem('spa_reviews', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_service_specialist_links')) {
            localStorage.setItem('spa_service_specialist_links', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_specialist_schedules')) {
            localStorage.setItem('spa_specialist_schedules', JSON.stringify({}));
        }
        
        // Инициализация клиентов и администратора
        let clients = JSON.parse(localStorage.getItem('spa_clients') || '[]');
        // Проверяем, есть ли администратор. Если нет - создаем
        const hasAdmin = clients.length > 0 && clients.some(c => 
            (c.email === 'admin@spa.ru') || 
            (c.role === 'superadmin') || 
            (c.role === 'admin')
        );
        
        if (!hasAdmin) {
            // Определяем следующий ID
            let nextId = 1;
            if (clients.length > 0) {
                nextId = Math.max(...clients.map(c => c.id || 0)) + 1;
            }
            
            // Создаем администратора по умолчанию
            const defaultAdmin = {
                id: nextId,
                firstName: 'Админ',
                lastName: 'Админов',
                phone: '+79000000000',
                email: 'admin@spa.ru',
                password: 'admin123',
                role: 'superadmin',
                bonusPoints: 0
            };
            
            clients.push(defaultAdmin);
            localStorage.setItem('spa_clients', JSON.stringify(clients));
            localStorage.setItem('spa_next_client_id', (nextId + 1).toString());
        }
        
        // Убеждаемся, что есть spa_next_client_id
        if (!localStorage.getItem('spa_next_client_id')) {
            const maxId = clients.length > 0 ? Math.max(...clients.map(c => c.id || 0)) : 0;
            localStorage.setItem('spa_next_client_id', (maxId + 1).toString());
        }
        if (!localStorage.getItem('spa_services')) {
            localStorage.setItem('spa_services', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_specialists')) {
            localStorage.setItem('spa_specialists', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_bookings')) {
            localStorage.setItem('spa_bookings', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_payments')) {
            localStorage.setItem('spa_payments', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_reviews')) {
            localStorage.setItem('spa_reviews', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_next_client_id')) {
            localStorage.setItem('spa_next_client_id', '1');
        }
        if (!localStorage.getItem('spa_next_service_id')) {
            localStorage.setItem('spa_next_service_id', '1');
        }
        if (!localStorage.getItem('spa_next_specialist_id')) {
            localStorage.setItem('spa_next_specialist_id', '1');
        }
        if (!localStorage.getItem('spa_next_booking_id')) {
            localStorage.setItem('spa_next_booking_id', '1');
        }
        if (!localStorage.getItem('spa_next_payment_id')) {
            localStorage.setItem('spa_next_payment_id', '1');
        }
        if (!localStorage.getItem('spa_next_review_id')) {
            localStorage.setItem('spa_next_review_id', '1');
        }
        if (!localStorage.getItem('spa_service_specialist_links')) {
            localStorage.setItem('spa_service_specialist_links', JSON.stringify([]));
        }
        if (!localStorage.getItem('spa_specialist_schedules')) {
            localStorage.setItem('spa_specialist_schedules', JSON.stringify({}));
        }
    }

    initStorage();

    // Вспомогательные функции
    function getNextId(key) {
        const id = parseInt(localStorage.getItem(key) || '1');
        localStorage.setItem(key, (id + 1).toString());
        return id;
    }

    function getClients() {
        return JSON.parse(localStorage.getItem('spa_clients') || '[]');
    }

    function getServices() {
        return JSON.parse(localStorage.getItem('spa_services') || '[]');
    }

    function getSpecialists() {
        return JSON.parse(localStorage.getItem('spa_specialists') || '[]');
    }

    function getBookings() {
        return JSON.parse(localStorage.getItem('spa_bookings') || '[]');
    }

    function getPayments() {
        return JSON.parse(localStorage.getItem('spa_payments') || '[]');
    }

    function getReviews() {
        return JSON.parse(localStorage.getItem('spa_reviews') || '[]');
    }

    function saveClients(clients) {
        localStorage.setItem('spa_clients', JSON.stringify(clients));
    }

    function saveServices(services) {
        localStorage.setItem('spa_services', JSON.stringify(services));
    }

    function saveSpecialists(specialists) {
        localStorage.setItem('spa_specialists', JSON.stringify(specialists));
    }

    function saveBookings(bookings) {
        localStorage.setItem('spa_bookings', JSON.stringify(bookings));
    }

    function savePayments(payments) {
        localStorage.setItem('spa_payments', JSON.stringify(payments));
    }

    function saveReviews(reviews) {
        localStorage.setItem('spa_reviews', JSON.stringify(reviews));
    }

    // Генерация временных слотов
    function generateTimeSlots(specialistId, date, serviceId) {
        const schedules = JSON.parse(localStorage.getItem('spa_specialist_schedules') || '{}');
        const bookings = getBookings();
        const services = getServices();
        
        const service = services.find(s => s.id === serviceId);
        const duration = service ? service.duration : 60;
        
        const schedule = schedules[specialistId] || {};
        const dayOfWeek = new Date(date).getDay();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
        const workHours = schedule[dayName] || { start: '09:00', end: '18:00' };
        
        const slots = [];
        const start = parseInt(workHours.start.split(':')[0]);
        const end = parseInt(workHours.end.split(':')[0]);
        
        // Занятые слоты
        const bookedSlots = bookings
            .filter(b => b.specialistId === specialistId && b.date === date && b.status !== 'отменена')
            .map(b => b.time);
        
        for (let hour = start; hour < end; hour++) {
            const slot = `${hour.toString().padStart(2, '0')}:00`;
            if (!bookedSlots.includes(slot)) {
                slots.push(slot);
            }
        }
        
        return slots;
    }

    // Переопределение fetch для перехвата API запросов
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        // Если это не наш API URL, используем оригинальный fetch
        if (!url.includes('/api/')) {
            return originalFetch.apply(this, arguments);
        }

        const method = (options.method || 'GET').toUpperCase();
        
        // Обработка относительных и абсолютных URL
        let path;
        let urlObj;
        try {
            urlObj = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
            path = urlObj.pathname;
        } catch (e) {
            // Если URL уже является путем
            path = url.startsWith('/') ? url : '/' + url;
            // Создаем фиктивный URL объект для поиска параметров
            try {
                urlObj = new URL('http://example.com' + (url.includes('?') ? url : ''));
            } catch (e2) {
                urlObj = { searchParams: new URLSearchParams(url.split('?')[1] || '') };
            }
        }
        
        try {
            let responseData;
            let status = 200;

            // GET /api/clients
            if (path === '/api/clients' && method === 'GET') {
                const clients = getClients();
                responseData = clients.map(c => ({
                    ...c,
                    name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()
                }));

            // GET /api/clients/:id
            } else if (path.match(/^\/api\/clients\/\d+$/) && method === 'GET') {
                const id = parseInt(path.split('/').pop());
                const clients = getClients();
                const client = clients.find(c => c.id === id);
                if (client) {
                    responseData = {
                        ...client,
                        name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()
                    };
                } else {
                    status = 404;
                    responseData = { error: 'Client not found' };
                }

            // GET /api/clients/:id/bookings
            } else if (path.match(/^\/api\/clients\/\d+\/bookings$/) && method === 'GET') {
                const id = parseInt(path.split('/')[3]);
                const bookings = getBookings();
                responseData = bookings.filter(b => b.clientId === id);

            // GET /api/clients/:id/payments
            } else if (path.match(/^\/api\/clients\/\d+\/payments$/) && method === 'GET') {
                const id = parseInt(path.split('/')[3]);
                const payments = getPayments();
                responseData = payments.filter(p => p.clientId === id);

            // POST /api/auth/register
            } else if (path === '/api/auth/register' && method === 'POST') {
                const data = JSON.parse(options.body || '{}');
                const clients = getClients();
                
                // Проверка на существующего пользователя
                const existing = clients.find(c => c.email === data.email);
                if (existing) {
                    status = 400;
                    responseData = { error: 'User already exists', success: false };
                } else {
                    const newClient = {
                        id: getNextId('spa_next_client_id'),
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        password: data.password || '',
                        role: data.role || 'client',
                        bonusPoints: 0
                    };
                    clients.push(newClient);
                    saveClients(clients);
                    responseData = { id: newClient.id, success: true };
                }

            // POST /api/auth/login
            } else if (path === '/api/auth/login' && method === 'POST') {
                const data = JSON.parse(options.body || '{}');
                // Убеждаемся, что администратор существует перед проверкой логина
                initStorage();
                const clients = getClients();
                const client = clients.find(c => c.email === data.email && c.password === data.password);
                if (client) {
                    responseData = {
                        success: true,
                        clientId: client.id,
                        role: client.role || 'client',
                        name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()
                    };
                } else {
                    status = 401;
                    responseData = { success: false, error: 'Invalid credentials' };
                }

            // GET /api/services
            } else if (path === '/api/services' && method === 'GET') {
                const services = getServices();
                const links = JSON.parse(localStorage.getItem('spa_service_specialist_links') || '[]');
                responseData = services.map(service => {
                    const serviceLinks = links.filter(l => l.serviceId === service.id);
                    return {
                        ...service,
                        specialistIds: serviceLinks.map(l => l.specialistId)
                    };
                });

            // GET /api/services/:id
            } else if (path.match(/^\/api\/services\/\d+$/) && method === 'GET') {
                const id = parseInt(path.split('/').pop());
                const services = getServices();
                const service = services.find(s => s.id === id);
                if (service) {
                    const links = JSON.parse(localStorage.getItem('spa_service_specialist_links') || '[]');
                    const serviceLinks = links.filter(l => l.serviceId === id);
                    responseData = {
                        ...service,
                        specialistIds: serviceLinks.map(l => l.specialistId)
                    };
                } else {
                    status = 404;
                    responseData = { error: 'Service not found' };
                }

            // POST /api/services
            } else if (path === '/api/services' && method === 'POST') {
                const data = JSON.parse(options.body || '{}');
                const services = getServices();
                const newService = {
                    id: getNextId('spa_next_service_id'),
                    name: data.name || '',
                    price: parseFloat(data.price) || 0,
                    duration: parseInt(data.duration) || 60,
                    description: data.description || ''
                };
                services.push(newService);
                saveServices(services);
                responseData = { id: newService.id, success: true };

            // PUT /api/services/:id
            } else if (path.match(/^\/api\/services\/\d+$/) && method === 'PUT') {
                const id = parseInt(path.split('/').pop());
                const data = JSON.parse(options.body || '{}');
                const services = getServices();
                const index = services.findIndex(s => s.id === id);
                if (index !== -1) {
                    services[index] = { ...services[index], ...data };
                    saveServices(services);
                    responseData = { success: true };
                } else {
                    status = 404;
                    responseData = { error: 'Service not found' };
                }

            // DELETE /api/services/:id
            } else if (path.match(/^\/api\/services\/\d+$/) && method === 'DELETE') {
                const id = parseInt(path.split('/').pop());
                const services = getServices();
                const filtered = services.filter(s => s.id !== id);
                saveServices(filtered);
                responseData = { success: true };

            // GET /api/specialists
            } else if (path === '/api/specialists' && method === 'GET') {
                responseData = getSpecialists();

            // GET /api/specialists/:id
            } else if (path.match(/^\/api\/specialists\/\d+$/) && method === 'GET') {
                const id = parseInt(path.split('/').pop());
                const specialists = getSpecialists();
                const specialist = specialists.find(s => s.id === id);
                if (specialist) {
                    responseData = specialist;
                } else {
                    status = 404;
                    responseData = { error: 'Specialist not found' };
                }

            // POST /api/specialists
            } else if (path === '/api/specialists' && method === 'POST') {
                const data = JSON.parse(options.body || '{}');
                const specialists = getSpecialists();
                const newSpecialist = {
                    id: getNextId('spa_next_specialist_id'),
                    name: data.name || '',
                    specialization: data.specialization || ''
                };
                specialists.push(newSpecialist);
                saveSpecialists(specialists);
                responseData = { id: newSpecialist.id, success: true };

            // PUT /api/specialists/:id
            } else if (path.match(/^\/api\/specialists\/\d+$/) && method === 'PUT') {
                const id = parseInt(path.split('/').pop());
                const data = JSON.parse(options.body || '{}');
                const specialists = getSpecialists();
                const index = specialists.findIndex(s => s.id === id);
                if (index !== -1) {
                    specialists[index] = { ...specialists[index], ...data };
                    saveSpecialists(specialists);
                    responseData = { success: true };
                } else {
                    status = 404;
                    responseData = { error: 'Specialist not found' };
                }

            // DELETE /api/specialists/:id
            } else if (path.match(/^\/api\/specialists\/\d+$/) && method === 'DELETE') {
                const id = parseInt(path.split('/').pop());
                const specialists = getSpecialists();
                const filtered = specialists.filter(s => s.id !== id);
                saveSpecialists(filtered);
                responseData = { success: true };

            // GET /api/specialists/:id/slots
            } else if (path.match(/^\/api\/specialists\/\d+\/slots$/) && method === 'GET') {
                const id = parseInt(path.split('/')[3]);
                const params = urlObj.searchParams || new URLSearchParams(url.split('?')[1] || '');
                const date = params.get('date');
                const serviceId = parseInt(params.get('serviceId') || '0');
                if (date && serviceId) {
                    responseData = generateTimeSlots(id, date, serviceId);
                } else {
                    responseData = [];
                }

            // GET /api/specialists/:id/schedule
            } else if (path.match(/^\/api\/specialists\/\d+\/schedule$/) && method === 'GET') {
                const id = parseInt(path.split('/')[3]);
                const schedules = JSON.parse(localStorage.getItem('spa_specialist_schedules') || '{}');
                responseData = schedules[id] || {};

            // PUT /api/specialists/:id/schedule
            } else if (path.match(/^\/api\/specialists\/\d+\/schedule$/) && method === 'PUT') {
                const id = parseInt(path.split('/')[3]);
                const data = JSON.parse(options.body || '{}');
                const schedules = JSON.parse(localStorage.getItem('spa_specialist_schedules') || '{}');
                schedules[id] = data;
                localStorage.setItem('spa_specialist_schedules', JSON.stringify(schedules));
                responseData = { success: true };

            // GET /api/specialists/:id/bookings
            } else if (path.match(/^\/api\/specialists\/\d+\/bookings$/) && method === 'GET') {
                const id = parseInt(path.split('/')[3]);
                const params = urlObj.searchParams || new URLSearchParams(url.split('?')[1] || '');
                const date = params.get('date');
                const bookings = getBookings();
                let filtered = bookings.filter(b => b.specialistId === id);
                if (date) {
                    filtered = filtered.filter(b => b.date === date);
                }
                responseData = filtered;

            // POST /api/services/:serviceId/specialists/:specialistId
            } else if (path.match(/^\/api\/services\/\d+\/specialists\/\d+$/) && method === 'POST') {
                const parts = path.split('/');
                const serviceId = parseInt(parts[3]);
                const specialistId = parseInt(parts[5]);
                const links = JSON.parse(localStorage.getItem('spa_service_specialist_links') || '[]');
                const exists = links.some(l => l.serviceId === serviceId && l.specialistId === specialistId);
                if (!exists) {
                    links.push({ serviceId, specialistId });
                    localStorage.setItem('spa_service_specialist_links', JSON.stringify(links));
                }
                responseData = { success: true };

            // GET /api/bookings
            } else if (path === '/api/bookings' && method === 'GET') {
                responseData = getBookings();

            // POST /api/bookings
            } else if (path === '/api/bookings' && method === 'POST') {
                const data = JSON.parse(options.body || '{}');
                const bookings = getBookings();
                const services = getServices();
                const service = services.find(s => s.id === data.serviceId);
                const duration = service ? service.duration : 60;
                
                // Проверка на конфликт
                const conflict = bookings.some(b => 
                    b.specialistId === data.specialistId &&
                    b.date === data.date &&
                    b.time === data.time &&
                    b.status !== 'отменена'
                );
                
                if (conflict) {
                    status = 400;
                    responseData = { error: 'Time slot already booked', success: false };
                } else {
                    const timeParts = data.time.split(':');
                    const startHour = parseInt(timeParts[0]);
                    const endHour = startHour + Math.ceil(duration / 60);
                    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
                    
                    const newBooking = {
                        id: getNextId('spa_next_booking_id'),
                        clientId: data.clientId,
                        serviceId: data.serviceId,
                        specialistId: data.specialistId,
                        date: data.date,
                        time: data.time,
                        endTime: endTime,
                        status: 'запланирована',
                        notes: data.notes || ''
                    };
                    bookings.push(newBooking);
                    saveBookings(bookings);
                    responseData = { id: newBooking.id, success: true };
                }

            // PUT /api/bookings/:id
            } else if (path.match(/^\/api\/bookings\/\d+$/) && method === 'PUT') {
                const id = parseInt(path.split('/').pop());
                const data = JSON.parse(options.body || '{}');
                const bookings = getBookings();
                const index = bookings.findIndex(b => b.id === id);
                if (index !== -1) {
                    bookings[index] = { ...bookings[index], ...data };
                    saveBookings(bookings);
                    responseData = { success: true };
                } else {
                    status = 404;
                    responseData = { error: 'Booking not found' };
                }

            // DELETE /api/bookings/:id
            } else if (path.match(/^\/api\/bookings\/\d+$/) && method === 'DELETE') {
                const id = parseInt(path.split('/').pop());
                const bookings = getBookings();
                const filtered = bookings.filter(b => b.id !== id);
                saveBookings(filtered);
                responseData = { success: true };

            // POST /api/bookings/:id/complete
            } else if (path.match(/^\/api\/bookings\/\d+\/complete$/) && method === 'POST') {
                const id = parseInt(path.split('/')[3]);
                const bookings = getBookings();
                const index = bookings.findIndex(b => b.id === id);
                if (index !== -1) {
                    bookings[index].status = 'выполнена';
                    saveBookings(bookings);
                    responseData = { success: true };
                } else {
                    status = 404;
                    responseData = { error: 'Booking not found' };
                }

            // POST /api/bookings/:id/cancel
            } else if (path.match(/^\/api\/bookings\/\d+\/cancel$/) && method === 'POST') {
                const id = parseInt(path.split('/')[3]);
                const bookings = getBookings();
                const index = bookings.findIndex(b => b.id === id);
                if (index !== -1) {
                    bookings[index].status = 'отменена';
                    saveBookings(bookings);
                    responseData = { success: true };
                } else {
                    status = 404;
                    responseData = { error: 'Booking not found' };
                }

            // GET /api/statistics
            } else if (path === '/api/statistics' && method === 'GET') {
                const bookings = getBookings();
                const clients = getClients();
                const services = getServices();
                const specialists = getSpecialists();
                const completed = bookings.filter(b => b.status === 'выполнена').length;
                const planned = bookings.filter(b => b.status === 'запланирована').length;
                const cancelled = bookings.filter(b => b.status === 'отменена').length;
                
                responseData = {
                    totalClients: clients.length,
                    totalServices: services.length,
                    totalSpecialists: specialists.length,
                    totalBookings: bookings.length,
                    completedBookings: completed,
                    plannedBookings: planned,
                    cancelledBookings: cancelled
                };

            // GET /api/reviews
            } else if (path === '/api/reviews' && method === 'GET') {
                const params = urlObj.searchParams || new URLSearchParams(url.split('?')[1] || '');
                const clientId = params.get('clientId');
                const reviews = getReviews();
                if (clientId) {
                    responseData = reviews.filter(r => r.clientId === parseInt(clientId));
                } else {
                    responseData = reviews;
                }

            // POST /api/specialists/:id/review
            } else if (path.match(/^\/api\/specialists\/\d+\/review$/) && method === 'POST') {
                const id = parseInt(path.split('/')[3]);
                const data = JSON.parse(options.body || '{}');
                const reviews = getReviews();
                const newReview = {
                    id: getNextId('spa_next_review_id'),
                    specialistId: id,
                    clientId: data.clientId,
                    bookingId: data.bookingId,
                    rating: data.rating,
                    comment: data.comment || '',
                    date: new Date().toISOString().split('T')[0]
                };
                reviews.push(newReview);
                saveReviews(reviews);
                responseData = { id: newReview.id, success: true };

            // PUT /api/clients/:id
            } else if (path.match(/^\/api\/clients\/\d+$/) && method === 'PUT') {
                const id = parseInt(path.split('/').pop());
                const data = JSON.parse(options.body || '{}');
                const clients = getClients();
                const index = clients.findIndex(c => c.id === id);
                if (index !== -1) {
                    clients[index] = { ...clients[index], ...data };
                    saveClients(clients);
                    responseData = { success: true };
                } else {
                    status = 404;
                    responseData = { error: 'Client not found' };
                }

            // DELETE /api/clients/:id
            } else if (path.match(/^\/api\/clients\/\d+$/) && method === 'DELETE') {
                const id = parseInt(path.split('/').pop());
                const clients = getClients();
                const filtered = clients.filter(c => c.id !== id);
                saveClients(filtered);
                responseData = { success: true };

            } else {
                status = 404;
                responseData = { error: 'Not found' };
            }

            return new Response(JSON.stringify(responseData), {
                status: status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });

        } catch (error) {
            console.error('Mock API error:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    };

    // Экспортируем функции для прямого использования
    window.mockAPI = {
        init: initStorage,
        clear: function() {
            localStorage.removeItem('spa_clients');
            localStorage.removeItem('spa_services');
            localStorage.removeItem('spa_specialists');
            localStorage.removeItem('spa_bookings');
            localStorage.removeItem('spa_payments');
            localStorage.removeItem('spa_reviews');
            localStorage.removeItem('spa_service_specialist_links');
            localStorage.removeItem('spa_specialist_schedules');
            initStorage();
        }
    };

    console.log('Mock API initialized for GitHub Pages');
})();

