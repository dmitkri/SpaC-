const API_URL = ''; // Используется mock API для GitHub Pages

let clients = [];
let services = [];
let bookings = [];
let specialists = [];
let statistics = null;

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName + '-tab').classList.add('active');
    
    event.target.classList.add('active');
    
    if (tabName === 'clients') {
        loadClients();
    } else if (tabName === 'services') {
        loadServices();
        loadServicesForLinking();
        loadSpecialistsForLinking();
    } else if (tabName === 'specialists') {
        loadSpecialists();
    } else if (tabName === 'specialist-schedule') {
        loadSpecialistsForSchedule();
    } else if (tabName === 'bookings') {
        loadBookings();
        loadClientsForBooking();
        loadServicesForBooking();
    } else if (tabName === 'statistics') {
        loadStatistics();
    } else if (tabName === 'admin-users') {
        // Вкладка пользователей - данные уже загружены
    }
}

// Загрузка клиентов
async function loadClients() {
    try {
        const response = await fetch(API_URL + '/api/clients');
        clients = await response.json();
        displayClients();
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error);
        showMessage('Ошибка загрузки клиентов', 'error');
    }
}

// Отображение клиентов
function displayClients() {
    const list = document.getElementById('clients-list');
    list.innerHTML = '';
    
    if (clients.length === 0) {
        list.innerHTML = '<p>Клиентов пока нет</p>';
        return;
    }
    
    // Создаем таблицу для удобного отображения
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Бонусы</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    clients.forEach(client => {
        const row = document.createElement('tr');
        const fullName = (client.firstName || '') + ' ' + (client.lastName || '');
        const displayName = client.name || fullName || 'Без имени';
        const bonusPoints = client.bonusPoints || 0;
        const role = client.role || 'client';
        
        row.innerHTML = `
            <td>${client.id}</td>
            <td><strong>${displayName}</strong></td>
            <td>${client.phone}</td>
            <td>${client.email}</td>
            <td><span class="role-badge role-${role}">${role}</span></td>
            <td>${bonusPoints}</td>
            <td>
                <button onclick="editClient(${client.id})" class="btn-action btn-edit">Редактировать</button>
                <button onclick="viewClientBookings(${client.id})" class="btn-action btn-info">Записи</button>
                <button onclick="viewClientPayments(${client.id})" class="btn-action btn-info">Транзакции</button>
                <button onclick="deleteClient(${client.id})" class="btn-action btn-delete">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    list.appendChild(table);
}

// Добавление клиента
async function addClient() {
    const firstName = document.getElementById('client-firstname').value.trim();
    const lastName = document.getElementById('client-lastname').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const password = document.getElementById('client-password').value;
    
    if (!firstName || !lastName || !phone || !email || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, phone, email, password })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Клиент зарегистрирован!', 'success');
                document.getElementById('client-firstname').value = '';
                document.getElementById('client-lastname').value = '';
                document.getElementById('client-phone').value = '';
                document.getElementById('client-email').value = '';
                document.getElementById('client-password').value = '';
                loadClients();
            } else {
                showMessage('Ошибка: ' + (result.error || 'Не удалось зарегистрировать клиента'), 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка регистрации' }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось зарегистрировать клиента'), 'error');
        }
    } catch (error) {
        console.error('Ошибка добавления клиента:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Редактирование клиента
let editingClientId = null;

async function editClient(clientId) {
    try {
        const response = await fetch(API_URL + '/api/clients/' + clientId);
        if (response.ok) {
            const client = await response.json();
            // Заполняем форму данными клиента
            document.getElementById('client-firstname').value = client.firstName || '';
            document.getElementById('client-lastname').value = client.lastName || '';
            document.getElementById('client-phone').value = client.phone;
            document.getElementById('client-email').value = client.email;
            document.getElementById('client-password').value = ''; // Пароль не показываем
            editingClientId = clientId;
            
            // Меняем кнопку на "Сохранить изменения"
            const btn = document.querySelector('#clients-tab .form-section button');
            btn.textContent = 'Сохранить изменения';
            btn.onclick = saveClient;
            
            // Прокручиваем к форме
            document.getElementById('client-firstname').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } catch (error) {
        console.error('Ошибка загрузки клиента:', error);
        showMessage('Ошибка загрузки данных клиента', 'error');
    }
}

// Сохранение изменений клиента
async function saveClient() {
    const firstName = document.getElementById('client-firstname').value.trim();
    const lastName = document.getElementById('client-lastname').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const email = document.getElementById('client-email').value.trim();
    
    if (!firstName || !lastName || !phone || !email) {
        showMessage('Заполните все поля', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/clients/' + editingClientId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, phone, email })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Данные клиента обновлены!', 'success');
                // Очищаем форму
                document.getElementById('client-firstname').value = '';
                document.getElementById('client-lastname').value = '';
                document.getElementById('client-phone').value = '';
                document.getElementById('client-email').value = '';
                document.getElementById('client-password').value = '';
                editingClientId = null;
                
                // Возвращаем кнопку в исходное состояние
                const btn = document.querySelector('#clients-tab .form-section button');
                btn.textContent = 'Добавить клиента';
                btn.onclick = addClient;
                
                loadClients();
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка обновления' }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось обновить клиента'), 'error');
        }
    } catch (error) {
        console.error('Ошибка обновления клиента:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Удаление клиента
async function deleteClient(clientId) {
    if (!confirm('Вы уверены, что хотите удалить этого клиента?')) {
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/clients/' + clientId, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Клиент удален!', 'success');
                loadClients();
            } else {
                showMessage('Ошибка удаления клиента', 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка удаления' }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось удалить клиента'), 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления клиента:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Просмотр истории записей клиента
async function viewClientBookings(clientId) {
    try {
        const response = await fetch(API_URL + '/api/clients/' + clientId + '/bookings');
        if (response.ok) {
            const data = await response.json();
            // Убеждаемся, что это массив
            const bookings = Array.isArray(data) ? data : [];
            const servicesResponse = await fetch(API_URL + '/api/services');
            const services = await servicesResponse.json();
            const specialistsResponse = await fetch(API_URL + '/api/specialists');
            const specialists = await specialistsResponse.json();
            
            let message = 'История записей:\n\n';
            if (bookings.length === 0) {
                message = 'У этого клиента пока нет записей.';
            } else {
                bookings.forEach(booking => {
                    const service = services.find(s => s.id === booking.serviceId);
                    const specialist = specialists.find(s => s.id === booking.specialistId);
                    const serviceName = service ? service.name : 'Неизвестная услуга';
                    const specialistName = specialist ? specialist.name : 'Неизвестен';
                    message += `${serviceName} (${specialistName})\n`;
                    message += `${booking.date} ${booking.time} - ${booking.endTime || 'не указано'}\n`;
                    message += `Статус: ${booking.status}\n\n`;
                });
            }
            
            alert(message);
        }
    } catch (error) {
        console.error('Ошибка загрузки записей клиента:', error);
        showMessage('Ошибка загрузки истории записей', 'error');
    }
}

// Просмотр транзакций клиента
async function viewClientPayments(clientId) {
    try {
        const response = await fetch(API_URL + '/api/clients/' + clientId + '/payments');
        if (response.ok) {
            const data = await response.json();
            // Убеждаемся, что это массив
            const payments = Array.isArray(data) ? data : [];
            
            let message = 'Транзакции:\n\n';
            if (payments.length === 0) {
                message = 'У этого клиента нет транзакций.';
            } else {
                let total = 0;
                payments.forEach(payment => {
                    const amount = payment.type === 'возврат' ? -payment.amount : payment.amount;
                    total += amount;
                    message += `${payment.type}: ${amount > 0 ? '+' : ''}${amount} руб.\n`;
                    message += `Дата: ${payment.date}\n`;
                    if (payment.description) {
                        message += `Описание: ${payment.description}\n`;
                    }
                    message += '\n';
                });
                message += `Итого: ${total > 0 ? '+' : ''}${total} руб.`;
            }
            
            alert(message);
        }
    } catch (error) {
        console.error('Ошибка загрузки транзакций:', error);
        showMessage('Ошибка загрузки транзакций', 'error');
    }
}

// Загрузка мастеров
async function loadSpecialists() {
    try {
        const response = await fetch(API_URL + '/api/specialists');
        specialists = await response.json();
        displaySpecialists();
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
        showMessage('Ошибка загрузки мастеров', 'error');
    }
}

// Отображение мастеров
function displaySpecialists() {
    const list = document.getElementById('specialists-list');
    list.innerHTML = '';
    
    if (specialists.length === 0) {
        list.innerHTML = '<p>Мастеров пока нет</p>';
        return;
    }
    
    // Создаем таблицу для удобного отображения
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Специализация</th>
                <th>Рейтинг</th>
                <th>Отзывов</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    specialists.forEach(specialist => {
        const row = document.createElement('tr');
        const rating = specialist.averageRating ? specialist.averageRating.toFixed(1) : '0.0';
        const reviews = specialist.totalReviews || 0;
        
        row.innerHTML = `
            <td>${specialist.id}</td>
            <td><strong>${specialist.name}</strong></td>
            <td>${specialist.specialization}</td>
            <td>${rating}</td>
            <td>${reviews}</td>
            <td>
                <button onclick="editSpecialist(${specialist.id})" class="btn-action btn-edit">Редактировать</button>
                <button onclick="deleteSpecialist(${specialist.id})" class="btn-action btn-delete">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    list.appendChild(table);
}

// Редактирование мастера
function editSpecialist(id) {
    const specialist = specialists.find(s => s.id === id);
    if (!specialist) return;
    
    const newName = prompt('Введите новое имя:', specialist.name);
    if (!newName) return;
    
    const newSpec = prompt('Введите новую специализацию:', specialist.specialization);
    if (!newSpec) return;
    
    // TODO: Добавить API для обновления мастера
    alert('Функция редактирования мастера будет добавлена');
}

// Удаление мастера
async function deleteSpecialist(id) {
    if (!confirm('Вы уверены, что хотите удалить этого мастера?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/specialists/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('Мастер удален!', 'success');
            loadSpecialists();
        } else {
            showMessage('Ошибка удаления мастера', 'error');
        }
    } catch (error) {
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Редактирование услуги
function editService(id) {
    const service = services.find(s => s.id === id);
    if (!service) return;
    
    const newName = prompt('Введите новое название:', service.name);
    if (!newName) return;
    
    const newPrice = prompt('Введите новую цену:', service.price);
    if (!newPrice) return;
    
    // TODO: Добавить API для обновления услуги
    alert('Функция редактирования услуги будет добавлена');
}

// Удаление услуги
async function deleteService(id) {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/services/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('Услуга удалена!', 'success');
            loadServices();
        } else {
            showMessage('Ошибка удаления услуги', 'error');
        }
    } catch (error) {
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Добавление мастера
async function addSpecialist() {
    const name = document.getElementById('specialist-name').value.trim();
    const specialization = document.getElementById('specialist-specialization-new').value.trim();
    
    if (!name || !specialization) {
        showMessage('Заполните все поля', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/specialists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, specialization })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Мастер добавлен!', 'success');
                document.getElementById('specialist-name').value = '';
                document.getElementById('specialist-specialization-new').value = '';
                loadSpecialists();
            } else {
                showMessage('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'HTTP ' + response.status }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось добавить мастера'), 'error');
        }
    } catch (error) {
        console.error('Ошибка добавления мастера:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Загрузка статистики
async function loadStatistics() {
    try {
        const response = await fetch(API_URL + '/api/statistics');
        if (response.ok) {
            statistics = await response.json();
            displayStatistics();
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showMessage('Ошибка загрузки статистики', 'error');
    }
}

// Отображение статистики
function displayStatistics() {
    const content = document.getElementById('statistics-content');
    if (!statistics) {
        content.innerHTML = '<p>Статистика недоступна</p>';
        return;
    }
    
    const completionRate = statistics.totalBookings > 0 
        ? ((statistics.completedBookings / statistics.totalBookings) * 100).toFixed(1)
        : 0;
    
    content.innerHTML = `
        <div class="form-section">
            <h3>Общая статистика</h3>
            <p><strong>Всего записей:</strong> ${statistics.totalBookings}</p>
            <p><strong>Выполнено:</strong> ${statistics.completedBookings}</p>
            <p><strong>Отменено:</strong> ${statistics.cancelledBookings}</p>
            <p><strong>Процент выполнения:</strong> ${completionRate}%</p>
            <p><strong>Общая выручка:</strong> ${statistics.totalRevenue} руб.</p>
        </div>
    `;
}

// Загрузка услуг
async function loadServices() {
    try {
        const response = await fetch(API_URL + '/api/services');
        services = await response.json();
        displayServices();
        loadServicesForLinking();
        loadSpecialistsForLinking();
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        showMessage('Ошибка загрузки услуг', 'error');
    }
}

// Загрузка услуг для привязки
async function loadServicesForLinking() {
    try {
        const response = await fetch(API_URL + '/api/services');
        const data = await response.json();
        const select = document.getElementById('link-service');
        if (select) {
            select.innerHTML = '<option value="">Выберите услугу</option>';
            if (Array.isArray(data)) {
                data.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.id;
                    option.textContent = service.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки услуг для привязки:', error);
    }
}

// Загрузка мастеров для привязки
async function loadSpecialistsForLinking() {
    try {
        const response = await fetch(API_URL + '/api/specialists');
        const data = await response.json();
        const select = document.getElementById('link-specialist');
        if (select) {
            select.innerHTML = '<option value="">Выберите мастера</option>';
            if (Array.isArray(data)) {
                data.forEach(specialist => {
                    const option = document.createElement('option');
                    option.value = specialist.id;
                    option.textContent = specialist.name + ' (' + specialist.specialization + ')';
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки мастеров для привязки:', error);
    }
}

// Привязать мастера к услуге
async function linkSpecialistToService() {
    const serviceId = parseInt(document.getElementById('link-service').value);
    const specialistId = parseInt(document.getElementById('link-specialist').value);
    
    if (!serviceId || !specialistId) {
        showMessage('Выберите услугу и мастера', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/services/' + serviceId + '/specialists/' + specialistId, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Мастер успешно привязан к услуге!', 'success');
                document.getElementById('link-service').value = '';
                document.getElementById('link-specialist').value = '';
                loadServices(); // Обновляем список услуг
            } else {
                showMessage('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'HTTP ' + response.status }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось привязать мастера'), 'error');
        }
    } catch (error) {
        console.error('Ошибка привязки мастера:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Отображение услуг
function displayServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = '';
    
    if (services.length === 0) {
        list.innerHTML = '<p>Услуг пока нет</p>';
        return;
    }
    
    // Создаем таблицу для удобного отображения
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Цена</th>
                <th>Длительность</th>
                <th>Описание</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    services.forEach(service => {
        const row = document.createElement('tr');
        const description = service.description || '—';
        
        row.innerHTML = `
            <td>${service.id}</td>
            <td><strong>${service.name}</strong></td>
            <td>${service.price} ₽</td>
            <td>${service.duration} мин</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${description}">${description}</td>
            <td>
                <button onclick="editService(${service.id})" class="btn-action btn-edit">Редактировать</button>
                <button onclick="deleteService(${service.id})" class="btn-action btn-delete">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    list.appendChild(table);
}

// Добавление услуги
async function addService() {
    const name = document.getElementById('service-name').value.trim();
    const price = parseInt(document.getElementById('service-price').value);
    const duration = parseInt(document.getElementById('service-duration').value);
    const description = document.getElementById('service-description').value.trim();
    
    if (!name || !price || !duration) {
        showMessage('Заполните все обязательные поля', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, price, duration, description })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Услуга добавлена!', 'success');
                document.getElementById('service-name').value = '';
                document.getElementById('service-price').value = '';
                document.getElementById('service-duration').value = '';
                document.getElementById('service-description').value = '';
                loadServices();
            } else {
                showMessage('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'HTTP ' + response.status }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось добавить услугу'), 'error');
        }
    } catch (error) {
        console.error('Ошибка добавления услуги:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Загрузка записей
async function loadBookings() {
    try {
        // Сначала загружаем клиентов и услуги, если они еще не загружены
        if (clients.length === 0) {
            const clientsResponse = await fetch(API_URL + '/api/clients');
            clients = await clientsResponse.json();
        }
        if (services.length === 0) {
            const servicesResponse = await fetch(API_URL + '/api/services');
            services = await servicesResponse.json();
        }
        
        // Теперь загружаем записи
        const response = await fetch(API_URL + '/api/bookings');
        bookings = await response.json();
        displayBookings();
    } catch (error) {
        console.error('Ошибка загрузки записей:', error);
        showMessage('Ошибка загрузки записей', 'error');
    }
}

// Отображение записей
function displayBookings() {
    const list = document.getElementById('bookings-list');
    list.innerHTML = '';
    
    if (bookings.length === 0) {
        list.innerHTML = '<p>Записей пока нет</p>';
        return;
    }
    
    // Создаем таблицу для удобного отображения
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Клиент</th>
                <th>Услуга</th>
                <th>Мастер</th>
                <th>Дата</th>
                <th>Время</th>
                <th>Статус</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    bookings.forEach(booking => {
        const client = clients.find(c => c.id === booking.clientId);
        const service = services.find(s => s.id === booking.serviceId);
        const specialist = specialists.find(s => s.id === booking.specialistId);
        
        const clientName = client ? (client.name || (client.firstName + ' ' + client.lastName)) : 'Неизвестен';
        const serviceName = service ? service.name : 'Неизвестна';
        const specialistName = specialist ? specialist.name : 'Неизвестен';
        
        let statusClass = 'planned';
        if (booking.status === 'выполнена') statusClass = 'completed';
        if (booking.status === 'отменена') statusClass = 'cancelled';
        
        // Формируем кнопки в зависимости от статуса
        let buttonsHtml = '';
        if (booking.status === 'запланирована') {
            buttonsHtml = `
                <button class="btn-action btn-success" onclick="updateBooking(${booking.id}, 'complete')">Завершить</button>
                <button class="btn-action btn-delete" onclick="updateBooking(${booking.id}, 'cancel')">Отменить</button>
            `;
        } else {
            buttonsHtml = '<span style="color: #666666;">—</span>';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.id}</td>
            <td>${clientName}</td>
            <td>${serviceName}</td>
            <td>${specialistName}</td>
            <td>${booking.date}</td>
            <td>${booking.time}${booking.endTime ? ' - ' + booking.endTime : ''}</td>
            <td><span class="status ${statusClass}">${booking.status}</span></td>
            <td>${buttonsHtml}</td>
        `;
        tbody.appendChild(row);
    });
    
    list.appendChild(table);
}

// Загрузка клиентов для выпадающего списка
async function loadClientsForBooking() {
    try {
        const response = await fetch(API_URL + '/api/clients');
        const clientsData = await response.json();
        const select = document.getElementById('booking-client');
        select.innerHTML = '<option value="">Выберите клиента</option>';
        
        clientsData.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error);
    }
}

// Загрузка услуг для выпадающего списка
async function loadServicesForBooking() {
    try {
        const response = await fetch(API_URL + '/api/services');
        const servicesData = await response.json();
        const select = document.getElementById('booking-service');
        select.innerHTML = '<option value="">Выберите услугу</option>';
        
        servicesData.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} (${service.price} руб.)`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
    }
}

// Загрузка мастеров для услуги
async function loadSpecialistsForService() {
    const serviceId = parseInt(document.getElementById('booking-service').value);
    const specialistSelect = document.getElementById('booking-specialist');
    specialistSelect.innerHTML = '<option value="">Выберите мастера</option>';
    
    if (!serviceId) {
        return;
    }
    
    try {
        const servicesResponse = await fetch(API_URL + '/api/services');
        const services = await servicesResponse.json();
        const service = services.find(s => s.id === serviceId);
        
        if (service && service.specialistIds && service.specialistIds.length > 0) {
            const specialistsResponse = await fetch(API_URL + '/api/specialists');
            const allSpecialists = await specialistsResponse.json();
            
            service.specialistIds.forEach(specId => {
                const specialist = allSpecialists.find(s => s.id === specId);
                if (specialist) {
                    const option = document.createElement('option');
                    option.value = specialist.id;
                    option.textContent = specialist.name + ' (' + specialist.specialization + ')';
                    specialistSelect.appendChild(option);
                }
            });
        } else {
            // Если у услуги нет привязанных мастеров, показываем всех
            const specialistsResponse = await fetch(API_URL + '/api/specialists');
            const allSpecialists = await specialistsResponse.json();
            allSpecialists.forEach(specialist => {
                const option = document.createElement('option');
                option.value = specialist.id;
                option.textContent = specialist.name + ' (' + specialist.specialization + ')';
                specialistSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
    }
}

// Загрузка доступных временных слотов
async function loadTimeSlots() {
    const serviceId = parseInt(document.getElementById('booking-service').value);
    const specialistId = parseInt(document.getElementById('booking-specialist').value);
    const date = document.getElementById('booking-date').value;
    const timeSelect = document.getElementById('booking-time');
    
    timeSelect.innerHTML = '<option value="">Выберите время</option>';
    
    if (!serviceId || !specialistId || !date) {
        return;
    }
    
    try {
        const url = `${API_URL}/api/specialists/${specialistId}/slots?date=${date}&serviceId=${serviceId}`;
        const response = await fetch(url);
        if (response.ok) {
            const slots = await response.json();
            slots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot;
                timeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки временных слотов:', error);
    }
}

// Создание записи
async function createBooking() {
    const clientId = parseInt(document.getElementById('booking-client').value);
    const serviceId = parseInt(document.getElementById('booking-service').value);
    const specialistId = parseInt(document.getElementById('booking-specialist').value);
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    const notes = document.getElementById('booking-notes').value.trim();
    
    if (!clientId || !serviceId || !specialistId || !date || !time) {
        showMessage('Заполните все обязательные поля', 'error');
        return;
    }
    
    // Валидация года
    if (date) {
        const year = date.split('-')[0];
        if (!year || year.length !== 4 || !/^\d{4}$/.test(year)) {
            showMessage('Год должен состоять из 4 цифр', 'error');
            return;
        }
    }
    
    try {
        const response = await fetch(API_URL + '/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientId, serviceId, specialistId, date, time, notes })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Запись создана!', 'success');
                document.getElementById('booking-client').value = '';
                document.getElementById('booking-service').value = '';
                document.getElementById('booking-specialist').value = '';
                document.getElementById('booking-date').value = '';
                document.getElementById('booking-time').value = '';
                document.getElementById('booking-notes').value = '';
                loadBookings();
            } else {
                showMessage('Ошибка: ' + (result.error || 'Не удалось создать запись'), 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка создания' }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось создать запись'), 'error');
        }
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Обновление статуса записи
async function updateBooking(bookingId, action) {
    if (action === 'complete') {
        // Показываем окно оплаты
        showPaymentModal(bookingId);
        return;
    }
    
    // Для отмены сразу обновляем статус
    try {
        const response = await fetch(API_URL + '/api/bookings/' + bookingId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Запись отменена!', 'success');
                loadBookings();
            } else {
                showMessage('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'HTTP ' + response.status }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось обновить запись'), 'error');
        }
    } catch (error) {
        console.error('Ошибка обновления записи:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Показать модальное окно оплаты
function showPaymentModal(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
        showMessage('Запись не найдена', 'error');
        return;
    }
    
    const service = services.find(s => s.id === booking.serviceId);
    const client = clients.find(c => c.id === booking.clientId);
    
    if (!service || !client) {
        showMessage('Не найдены данные услуги или клиента', 'error');
        return;
    }
    
    const basePrice = service.price;
    const clientBonusPoints = client.bonusPoints || 0;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'payment-modal';
    modal.className = 'payment-modal';
    modal.innerHTML = `
        <div class="payment-modal-content">
            <div class="payment-modal-header">
                <h2>Оплата записи #${bookingId}</h2>
                <button class="payment-modal-close" onclick="closePaymentModal()">&times;</button>
            </div>
            <div class="payment-modal-body">
                <div class="payment-info">
                    <p><strong>Клиент:</strong> ${client.firstName} ${client.lastName}</p>
                    <p><strong>Услуга:</strong> ${service.name}</p>
                    <p><strong>Базовая цена:</strong> <span id="base-price">${basePrice}</span> ₽</p>
                    <p><strong>Бонусные баллы клиента:</strong> ${clientBonusPoints}</p>
                </div>
                
                <div class="payment-form">
                    <div class="form-group">
                        <label>Способ оплаты *</label>
                        <select id="payment-method" onchange="calculateTotal()">
                            <option value="cash">Наличные</option>
                            <option value="card">Безналичные</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Скидка (%)</label>
                        <input type="number" id="discount" min="0" max="100" value="0" onchange="calculateTotal()" oninput="calculateTotal()">
                    </div>
                    
                    <div class="form-group">
                        <label>Бонусные баллы</label>
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <select id="bonus-action" onchange="updateBonusInput()" style="flex: 1;">
                                <option value="none">Не использовать</option>
                                <option value="earn">Накопить</option>
                                <option value="spend">Списать</option>
                            </select>
                            <input type="number" id="bonus-points" min="0" max="${clientBonusPoints}" value="0" onchange="calculateTotal()" oninput="calculateTotal()" style="flex: 1;" disabled>
                        </div>
                    </div>
                    
                    <div class="payment-summary">
                        <div class="summary-row">
                            <span>Базовая цена:</span>
                            <span id="summary-base">${basePrice} ₽</span>
                        </div>
                        <div class="summary-row" id="summary-discount-row" style="display: none;">
                            <span>Скидка:</span>
                            <span id="summary-discount">0 ₽</span>
                        </div>
                        <div class="summary-row" id="summary-bonus-row" style="display: none;">
                            <span>Списано баллов:</span>
                            <span id="summary-bonus">0 ₽</span>
                        </div>
                        <div class="summary-row summary-total">
                            <span><strong>Итого к оплате:</strong></span>
                            <span id="total-amount"><strong>${basePrice} ₽</strong></span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="payment-modal-footer">
                <button class="btn-secondary" onclick="closePaymentModal()">Отмена</button>
                <button class="btn-primary" onclick="processPayment(${bookingId})">Оплатить и завершить</button>
            </div>
        </div>
    `;
    
    modal.setAttribute('data-booking-id', bookingId);
    document.body.appendChild(modal);
    calculateTotal();
}

// Закрыть модальное окно оплаты
function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.remove();
    }
}

// Обновить поле ввода бонусных баллов
function updateBonusInput() {
    const action = document.getElementById('bonus-action').value;
    const bonusInput = document.getElementById('bonus-points');
    const modal = document.getElementById('payment-modal');
    if (!modal) return;
    
    // Получаем bookingId из атрибута data-booking-id
    const bookingId = parseInt(modal.getAttribute('data-booking-id'));
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const client = clients.find(c => c.id === booking.clientId);
    if (!client) return;
    
    if (action === 'spend') {
        bonusInput.disabled = false;
        bonusInput.max = client.bonusPoints || 0;
    } else if (action === 'earn') {
        bonusInput.disabled = false;
        bonusInput.max = 10000; // Максимум для начисления
    } else {
        bonusInput.disabled = true;
        bonusInput.value = 0;
    }
    calculateTotal();
}

// Пересчитать итоговую сумму
function calculateTotal() {
    const modal = document.getElementById('payment-modal');
    if (!modal) return;
    
    const bookingId = parseInt(modal.getAttribute('data-booking-id'));
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const service = services.find(s => s.id === booking.serviceId);
    const client = clients.find(c => c.id === booking.clientId);
    if (!service || !client) return;
    
    const basePrice = service.price;
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const bonusAction = document.getElementById('bonus-action').value;
    const bonusPoints = parseInt(document.getElementById('bonus-points').value) || 0;
    
    // Рассчитываем скидку
    const discountAmount = (basePrice * discount) / 100;
    const priceAfterDiscount = basePrice - discountAmount;
    
    // Рассчитываем списание баллов (1 балл = 1 рубль)
    let bonusDiscount = 0;
    if (bonusAction === 'spend' && bonusPoints > 0) {
        bonusDiscount = Math.min(bonusPoints, priceAfterDiscount);
    }
    
    const total = Math.max(0, priceAfterDiscount - bonusDiscount);
    
    // Обновляем отображение
    document.getElementById('summary-base').textContent = basePrice + ' ₽';
    
    if (discount > 0) {
        document.getElementById('summary-discount-row').style.display = 'flex';
        document.getElementById('summary-discount').textContent = '-' + discountAmount.toFixed(2) + ' ₽';
    } else {
        document.getElementById('summary-discount-row').style.display = 'none';
    }
    
    if (bonusAction === 'spend' && bonusPoints > 0) {
        document.getElementById('summary-bonus-row').style.display = 'flex';
        document.getElementById('summary-bonus').textContent = '-' + bonusDiscount.toFixed(2) + ' ₽';
    } else {
        document.getElementById('summary-bonus-row').style.display = 'none';
    }
    
    document.getElementById('total-amount').innerHTML = '<strong>' + total.toFixed(2) + ' ₽</strong>';
}

// Обработать оплату
async function processPayment(bookingId) {
    const modal = document.getElementById('payment-modal');
    if (!modal) return;
    
    // Проверяем, что bookingId совпадает
    const modalBookingId = parseInt(modal.getAttribute('data-booking-id'));
    if (modalBookingId !== bookingId) {
        bookingId = modalBookingId;
    }
    
    const paymentMethod = document.getElementById('payment-method').value;
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const bonusAction = document.getElementById('bonus-action').value;
    const bonusPoints = parseInt(document.getElementById('bonus-points').value) || 0;
    
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
        showMessage('Запись не найдена', 'error');
        return;
    }
    
    const service = services.find(s => s.id === booking.serviceId);
    if (!service) {
        showMessage('Услуга не найдена', 'error');
        return;
    }
    
    const basePrice = service.price;
    const discountAmount = (basePrice * discount) / 100;
    const priceAfterDiscount = basePrice - discountAmount;
    const bonusDiscount = (bonusAction === 'spend' && bonusPoints > 0) ? Math.min(bonusPoints, priceAfterDiscount) : 0;
    const finalAmount = Math.max(0, priceAfterDiscount - bonusDiscount);
    
    try {
        console.log('Отправка запроса на завершение записи:', bookingId);
        const response = await fetch(API_URL + '/api/bookings/' + bookingId + '/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentMethod: paymentMethod,
                discount: discount,
                bonusAction: bonusAction,
                bonusPoints: bonusPoints,
                finalAmount: finalAmount
            })
        });
        
        console.log('Ответ сервера:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Результат:', result);
            if (result.success) {
                showMessage('Запись завершена и оплачена!', 'success');
                closePaymentModal();
                loadBookings();
                loadClients(); // Обновляем клиентов для обновления бонусных баллов
            } else {
                showMessage('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
                console.error('Ошибка сервера:', result.error);
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'HTTP ' + response.status }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось обработать оплату'), 'error');
            console.error('Ошибка HTTP:', error);
        }
    } catch (error) {
        console.error('Ошибка обработки оплаты:', error);
        showMessage('Ошибка подключения к серверу: ' + error.message, 'error');
    }
}

// Показать сообщение
function showMessage(text, type) {
    // Удаляем старое сообщение если есть
    const oldMsg = document.querySelector('.message');
    if (oldMsg) {
        oldMsg.remove();
    }
    
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = text;
    
    const container = document.querySelector('.container');
    container.insertBefore(msg, container.firstChild);
    
    // Удаляем сообщение через 3 секунды
    setTimeout(() => {
        msg.remove();
    }, 3000);
}

// Загрузка мастеров для расписания
async function loadSpecialistsForSchedule() {
    try {
        const response = await fetch(API_URL + '/api/specialists');
        const allSpecialists = await response.json();
        const select = document.getElementById('schedule-specialist');
        select.innerHTML = '<option value="">-- Выберите мастера --</option>';
        
        allSpecialists.forEach(specialist => {
            const option = document.createElement('option');
            option.value = specialist.id;
            option.textContent = specialist.name + ' (' + specialist.specialization + ')';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
    }
}

// Загрузка расписания мастера
async function loadSpecialistSchedule() {
    const specialistId = parseInt(document.getElementById('schedule-specialist').value);
    if (!specialistId) {
        document.getElementById('schedule-editor').style.display = 'none';
        document.getElementById('specialist-calendar').innerHTML = '';
        return;
    }
    
    // Показываем индикатор загрузки
    const editor = document.getElementById('schedule-editor');
    const daysContainer = document.getElementById('schedule-days');
    editor.style.display = 'block';
    daysContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Загрузка расписания...</p>';
    
    try {
        // Загружаем мастера
        const response = await fetch(API_URL + '/api/specialists/' + specialistId);
        if (response.ok) {
            const specialist = await response.json();
            console.log('Загружен мастер:', specialist);
            // Рендерим редактор с актуальным расписанием
            await renderScheduleEditor(specialist);
            loadSpecialistCalendar(specialistId);
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка загрузки мастера' }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось загрузить данные мастера'), 'error');
            editor.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        showMessage('Ошибка подключения к серверу', 'error');
        editor.style.display = 'none';
    }
}

// Отображение редактора расписания
async function renderScheduleEditor(specialist) {
    const editor = document.getElementById('schedule-editor');
    editor.style.display = 'block';
    
    const daysContainer = document.getElementById('schedule-days');
    daysContainer.innerHTML = '';
    
    const days = [
        { name: 'Понедельник', key: 'monday' },
        { name: 'Вторник', key: 'tuesday' },
        { name: 'Среда', key: 'wednesday' },
        { name: 'Четверг', key: 'thursday' },
        { name: 'Пятница', key: 'friday' },
        { name: 'Суббота', key: 'saturday' },
        { name: 'Воскресенье', key: 'sunday' }
    ];
    
    // Загружаем расписание из API
    let schedule = {};
    try {
        const scheduleResponse = await fetch(`${API_URL}/api/specialists/${specialist.id}/schedule`);
        if (scheduleResponse.ok) {
            schedule = await scheduleResponse.json();
            console.log('Загружено расписание для мастера', specialist.id, ':', schedule);
        } else {
            console.log('Расписание не найдено, используем значения по умолчанию');
        }
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
    }
    
    // Создаем контейнер с улучшенным дизайном
    const scheduleWrapper = document.createElement('div');
    scheduleWrapper.style.cssText = `
        background: #ffffff;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        border: 1px solid #e8e8e8;
    `;
    
    days.forEach(day => {
        // Получаем расписание для дня из загруженных данных
        const daySchedule = schedule[day.key];
        // Если расписание для дня существует, используем его, иначе значения по умолчанию
        const isEnabled = daySchedule ? (daySchedule.enabled !== false) : true;
        const startTime = daySchedule && daySchedule.start ? daySchedule.start : '09:00';
        const endTime = daySchedule && daySchedule.end ? daySchedule.end : '18:00';
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'schedule-day-item';
        dayDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 20px 24px;
            background: ${isEnabled ? '#f8f9fa' : '#fafafa'};
            border: 2px solid ${isEnabled ? '#d0d0d0' : '#e8e8e8'};
            border-radius: 12px;
            transition: all 0.3s ease;
            box-shadow: ${isEnabled ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'};
        `;
        
        dayDiv.innerHTML = `
            <div style="display: flex; align-items: center; flex: 1;">
                <div style="width: 150px; font-weight: 600; color: #1a1a1a; font-size: 16px; letter-spacing: -0.2px;">${day.name}</div>
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div style="position: relative;">
                        <input 
                            type="time" 
                            id="schedule-${day.key}-start" 
                            value="${startTime}" 
                            ${!isEnabled ? 'disabled' : ''}
                            style="
                                padding: 10px 12px;
                                border: 2px solid ${isEnabled ? '#dee2e6' : '#e9ecef'};
                                border-radius: 8px;
                                font-size: 14px;
                                width: 120px;
                                background: ${isEnabled ? '#ffffff' : '#f8f9fa'};
                                cursor: ${isEnabled ? 'pointer' : 'not-allowed'};
                            "
                        >
                    </div>
                    <span style="color: #666; font-weight: 500; font-size: 16px;">—</span>
                    <div style="position: relative;">
                        <input 
                            type="time" 
                            id="schedule-${day.key}-end" 
                            value="${endTime}" 
                            ${!isEnabled ? 'disabled' : ''}
                            style="
                                padding: 10px 12px;
                                border: 2px solid ${isEnabled ? '#dee2e6' : '#e9ecef'};
                                border-radius: 8px;
                                font-size: 14px;
                                width: 120px;
                                background: ${isEnabled ? '#ffffff' : '#f8f9fa'};
                                cursor: ${isEnabled ? 'pointer' : 'not-allowed'};
                            "
                        >
                    </div>
                </div>
            </div>
            <label style="
                margin-left: 24px;
                display: flex;
                align-items: center;
                cursor: pointer;
                user-select: none;
                padding: 8px 12px;
                border-radius: 8px;
                transition: background 0.2s;
            " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='transparent'">
                <input 
                    type="checkbox" 
                    id="schedule-${day.key}-enabled" 
                    ${isEnabled ? 'checked' : ''} 
                    style="
                        width: 20px;
                        height: 20px;
                        margin-right: 10px;
                        cursor: pointer;
                        accent-color: #007bff;
                    "
                    onchange="toggleScheduleDay('${day.key}')"
                >
                <span style="font-weight: 500; color: #495057; font-size: 14px;">Рабочий день</span>
            </label>
        `;
        scheduleWrapper.appendChild(dayDiv);
    });
    
    daysContainer.appendChild(scheduleWrapper);
    
    // Обновляем статус расписания
    const scheduleStatus = document.getElementById('schedule-status');
    if (scheduleStatus) {
        const workingDays = days.filter(day => {
            const daySchedule = schedule[day.key];
            return daySchedule ? (daySchedule.enabled !== false) : true;
        }).length;
        scheduleStatus.textContent = `Актуальное расписание: ${workingDays} из ${days.length} дней рабочие`;
        scheduleStatus.style.color = workingDays > 0 ? '#28a745' : '#dc3545';
    }
}

// Переключение рабочего дня
function toggleScheduleDay(dayKey) {
    const enabled = document.getElementById(`schedule-${dayKey}-enabled`).checked;
    const startInput = document.getElementById(`schedule-${dayKey}-start`);
    const endInput = document.getElementById(`schedule-${dayKey}-end`);
    const dayDiv = startInput.closest('.schedule-day-item');
    
    if (enabled) {
        startInput.disabled = false;
        endInput.disabled = false;
        dayDiv.style.background = '#f8f9fa';
        dayDiv.style.borderColor = '#e0e0e0';
        startInput.style.background = '#ffffff';
        startInput.style.borderColor = '#dee2e6';
        startInput.style.cursor = 'pointer';
        endInput.style.background = '#ffffff';
        endInput.style.borderColor = '#dee2e6';
        endInput.style.cursor = 'pointer';
    } else {
        startInput.disabled = true;
        endInput.disabled = true;
        dayDiv.style.background = '#ffffff';
        dayDiv.style.borderColor = '#f0f0f0';
        startInput.style.background = '#f8f9fa';
        startInput.style.borderColor = '#e9ecef';
        startInput.style.cursor = 'not-allowed';
        endInput.style.background = '#f8f9fa';
        endInput.style.borderColor = '#e9ecef';
        endInput.style.cursor = 'not-allowed';
    }
}

// Сохранение расписания мастера
async function saveSpecialistSchedule() {
    const specialistId = parseInt(document.getElementById('schedule-specialist').value);
    if (!specialistId) {
        showMessage('Выберите мастера', 'error');
        return;
    }
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const schedule = {};
    
    days.forEach(day => {
        const enabled = document.getElementById(`schedule-${day}-enabled`).checked;
        const start = document.getElementById(`schedule-${day}-start`).value;
        const end = document.getElementById(`schedule-${day}-end`).value;
        
        schedule[day] = {
            enabled: enabled,
            start: enabled ? start : null,
            end: enabled ? end : null
        };
    });
    
    try {
        const response = await fetch(`${API_URL}/api/specialists/${specialistId}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(schedule)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Расписание сохранено!', 'success');
                loadSpecialistCalendar(specialistId);
            } else {
                showMessage('Ошибка сохранения расписания: ' + (result.error || 'Неизвестная ошибка'), 'error');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка сохранения' }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось сохранить расписание'), 'error');
            console.error('Ошибка сохранения расписания:', error);
        }
    } catch (error) {
        console.error('Ошибка сохранения расписания:', error);
        showMessage('Ошибка подключения к серверу: ' + error.message, 'error');
    }
}

// Загрузка календаря мастера
async function loadSpecialistCalendar(specialistId) {
    try {
        const response = await fetch(`${API_URL}/api/specialists/${specialistId}/bookings`);
        if (response.ok) {
            const data = await response.json();
            const bookings = Array.isArray(data) ? data : [];
            const clientsResponse = await fetch(API_URL + '/api/clients');
            const clients = await clientsResponse.json();
            const servicesResponse = await fetch(API_URL + '/api/services');
            const services = await servicesResponse.json();
            
            renderSpecialistCalendar(bookings, clients, services);
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка загрузки записей' }));
            showMessage('Ошибка: ' + (error.error || 'Не удалось загрузить записи мастера'), 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки календаря мастера:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Отображение календаря мастера
function renderSpecialistCalendar(bookings, clients, services) {
    const container = document.getElementById('specialist-calendar');
    
    // Группируем записи по датам
    const bookingsByDate = {};
    bookings.forEach(booking => {
        if (!bookingsByDate[booking.date]) {
            bookingsByDate[booking.date] = [];
        }
        bookingsByDate[booking.date].push(booking);
    });
    
    // Сортируем даты
    const dates = Object.keys(bookingsByDate).sort();
    
    if (dates.length === 0) {
        container.innerHTML = '<p>У мастера пока нет записей</p>';
        return;
    }
    
    let html = '<div style="display: grid; gap: 16px;">';
    
    dates.forEach(date => {
        const dateBookings = bookingsByDate[date];
        const dateObj = new Date(date + 'T00:00:00');
        const dateStr = dateObj.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        html += `<div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e9ecef;">`;
        html += `<h4 style="margin-bottom: 16px; color: #212529;">${dateStr}</h4>`;
        html += '<div style="display: grid; gap: 12px;">';
        
        dateBookings.forEach(booking => {
            const client = clients.find(c => c.id === booking.clientId);
            const service = services.find(s => s.id === booking.serviceId);
            const clientName = client ? (client.name || client.firstName + ' ' + client.lastName) : 'Неизвестен';
            const serviceName = service ? service.name : 'Неизвестная услуга';
            const statusClass = booking.status === 'выполнена' ? 'completed' : 
                               booking.status === 'отменена' ? 'cancelled' : 'planned';
            
            html += `
                <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid ${statusClass === 'completed' ? '#28a745' : statusClass === 'cancelled' ? '#dc3545' : '#0d6efd'};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">${serviceName}</div>
                            <div style="color: #6c757d; font-size: 14px; margin-bottom: 4px;">${clientName}</div>
                            <div style="color: #6c757d; font-size: 14px;">${booking.time} - ${booking.endTime || 'не указано'}</div>
                            ${booking.notes ? `<div style="color: #6c757d; font-size: 13px; margin-top: 8px; font-style: italic;">${booking.notes}</div>` : ''}
                        </div>
                        <span class="status ${statusClass}" style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${booking.status}
                        </span>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Загружаем данные при загрузке страницы
window.onload = function() {
    // Проверяем роль пользователя
    const role = localStorage.getItem('clientRole');
    if (role === 'superadmin') {
        const adminUsersBtn = document.getElementById('admin-users-btn');
        if (adminUsersBtn) {
            adminUsersBtn.style.display = 'block';
        }
    }
    
    loadClients();
    loadServices();
    loadSpecialists();
    loadBookings();
    loadClientsForBooking();
    loadServicesForBooking();
};

// Создать администратора (только для суперадмина)
async function createAdmin() {
    const firstName = document.getElementById('admin-firstname').value;
    const lastName = document.getElementById('admin-lastname').value;
    const phone = document.getElementById('admin-phone').value;
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (!firstName || !lastName || !phone || !email || !password) {
        alert('Все поля обязательны');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName,
                lastName,
                phone,
                email,
                password,
                role: 'admin'
            })
        });
        
        const data = await response.json();
        if (data.id) {
            alert('Администратор создан!');
            document.getElementById('admin-firstname').value = '';
            document.getElementById('admin-lastname').value = '';
            document.getElementById('admin-phone').value = '';
            document.getElementById('admin-email').value = '';
            document.getElementById('admin-password').value = '';
        } else {
            alert(data.error || 'Ошибка создания администратора');
        }
    } catch (error) {
        alert('Ошибка соединения с сервером');
    }
}

// Создать мастера (только для суперадмина)
async function createSpecialistUser() {
    const firstName = document.getElementById('specialist-firstname').value;
    const lastName = document.getElementById('specialist-lastname').value;
    const phone = document.getElementById('specialist-phone').value;
    const email = document.getElementById('specialist-email').value;
    const specialization = document.getElementById('specialist-user-specialization').value;
    const password = document.getElementById('specialist-password').value;
    
    if (!firstName || !lastName || !phone || !email || !specialization || !password) {
        alert('Все поля обязательны');
        return;
    }
    
    try {
        // Сначала создаем пользователя с ролью specialist
        const userResponse = await fetch(API_URL + '/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName,
                lastName,
                phone,
                email,
                password,
                role: 'specialist'
            })
        });
        
        const userData = await userResponse.json();
        if (userData.id) {
            // Затем создаем мастера
            const specialistResponse = await fetch(API_URL + '/api/specialists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: firstName + ' ' + lastName,
                    specialization: specialization
                })
            });
            
            const specialistData = await specialistResponse.json();
            if (specialistData.id) {
                alert('Мастер создан!');
                document.getElementById('specialist-firstname').value = '';
                document.getElementById('specialist-lastname').value = '';
                document.getElementById('specialist-phone').value = '';
                document.getElementById('specialist-email').value = '';
                document.getElementById('specialist-user-specialization').value = '';
                document.getElementById('specialist-password').value = '';
                loadSpecialists();
            } else {
                alert('Пользователь создан, но ошибка создания мастера');
            }
        } else {
            alert(userData.error || 'Ошибка создания пользователя');
        }
    } catch (error) {
        alert('Ошибка соединения с сервером');
    }
}

