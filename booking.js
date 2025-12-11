// Скрипт для страницы записи клиентов
const API_URL = 'http://localhost:8081';

// Загружаем услуги при загрузке страницы
window.onload = function() {
    loadServices();
    setupDateMin();
};

// Устанавливаем минимальную дату (сегодня)
function setupDateMin() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').setAttribute('min', today);
}

// Загружаем список услуг
async function loadServices() {
    try {
        const response = await fetch(API_URL + '/api/services');
        const services = await response.json();
        
        const select = document.getElementById('booking-service');
        select.innerHTML = '<option value="">-- Выберите услугу --</option>';
        
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.name;
            option.setAttribute('data-price', service.price);
            option.setAttribute('data-duration', service.duration);
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        showMessage('Не удалось загрузить услуги. Проверьте подключение к серверу.', 'error');
    }
}

// Показываем информацию об услуге при выборе
async function loadServiceInfo() {
    const serviceId = parseInt(document.getElementById('booking-service').value);
    const infoDiv = document.getElementById('service-info');
    const specialistSelect = document.getElementById('booking-specialist');
    
    specialistSelect.innerHTML = '<option value="">-- Выберите мастера --</option>';
    infoDiv.classList.remove('active');
    
    if (!serviceId) {
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/services');
        const services = await response.json();
        const service = services.find(s => s.id === serviceId);
        
        if (service) {
            document.getElementById('service-price').textContent = service.price;
            document.getElementById('service-duration').textContent = service.duration;
            document.getElementById('service-description').textContent = service.description || 'Описание отсутствует';
            infoDiv.classList.add('active');
            
            // Загружаем мастеров для этой услуги
            if (service.specialistIds && service.specialistIds.length > 0) {
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
                // Если нет привязанных мастеров, показываем всех
                const specialistsResponse = await fetch(API_URL + '/api/specialists');
                const allSpecialists = await specialistsResponse.json();
                allSpecialists.forEach(specialist => {
                    const option = document.createElement('option');
                    option.value = specialist.id;
                    option.textContent = specialist.name + ' (' + specialist.specialization + ')';
                    specialistSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки информации об услуге:', error);
    }
}

// Загрузка временных слотов для страницы записи
async function loadTimeSlotsForBooking() {
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
            if (slots.length === 0) {
                timeSelect.innerHTML = '<option value="">Нет доступных слотов</option>';
            } else {
                slots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot;
                    option.textContent = slot;
                    timeSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки временных слотов:', error);
    }
}

// Обработка отправки формы
document.getElementById('booking-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const serviceId = parseInt(document.getElementById('booking-service').value);
    const specialistId = parseInt(document.getElementById('booking-specialist').value);
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    
    // Проверяем, что все поля заполнены
    if (!name || !phone || !email || !serviceId || !specialistId || !date || !time) {
        showMessage('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    // Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Введите корректный email адрес', 'error');
        return;
    }
    
    // Валидация года - проверяем, что год состоит из 4 цифр
    if (date) {
        const year = date.split('-')[0];
        if (!year || year.length !== 4 || !/^\d{4}$/.test(year)) {
            showMessage('Год должен состоять из 4 цифр (например, 2024)', 'error');
            return;
        }
    }
    
    try {
        // Сначала создаем или находим клиента
        const clientId = await findOrCreateClient(name, phone, email);
        
        if (!clientId) {
            showMessage('Ошибка при создании клиента', 'error');
            return;
        }
        
        // Создаем запись
        const response = await fetch(API_URL + '/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientId, serviceId, specialistId, date, time })
        });
        
        if (response.ok) {
            showMessage('Запись успешно создана! Мы свяжемся с вами для подтверждения.', 'success');
            // Очищаем форму
            document.getElementById('booking-form').reset();
            document.getElementById('service-info').classList.remove('active');
            document.getElementById('booking-specialist').innerHTML = '<option value="">-- Выберите мастера --</option>';
            document.getElementById('booking-time').innerHTML = '<option value="">Выберите время</option>';
        } else {
            const error = await response.json();
            showMessage('Ошибка при создании записи: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        showMessage('Ошибка подключения к серверу. Попробуйте позже.', 'error');
    }
});

// Находим клиента по телефону или email, или создаем нового
async function findOrCreateClient(name, phone, email) {
    try {
        // Получаем всех клиентов
        const response = await fetch(API_URL + '/api/clients');
        const clients = await response.json();
        
        // Ищем существующего клиента по телефону или email
        let existingClient = clients.find(c => c.phone === phone || c.email === email);
        
        if (existingClient) {
            // Если клиент найден, возвращаем его ID
            return existingClient.id;
        }
        
        // Если клиент не найден, регистрируем нового
        // Разделяем имя на имя и фамилию
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Генерируем простой пароль (в реальном приложении клиент должен вводить пароль)
        const password = 'client' + Date.now();
        
        const createResponse = await fetch(API_URL + '/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, phone, email, password })
        });
        
        if (createResponse.ok) {
            const result = await createResponse.json();
            if (result.id) {
                return result.id;
            }
            
            // Если ID нет в ответе, получаем список клиентов снова
            await new Promise(resolve => setTimeout(resolve, 100));
            const clientsResponse = await fetch(API_URL + '/api/clients');
            if (clientsResponse.ok) {
                const updatedClients = await clientsResponse.json();
                const newClient = updatedClients.find(c => c.phone === phone || c.email === email);
                return newClient ? newClient.id : null;
            }
        } else {
            try {
                const errorData = await createResponse.json();
                console.error('Ошибка создания клиента:', errorData.error || 'Неизвестная ошибка');
            } catch (e) {
                console.error('Ошибка создания клиента: HTTP', createResponse.status);
            }
        }
        
        return null;
    } catch (error) {
        console.error('Ошибка при работе с клиентом:', error);
        return null;
    }
}

// Показываем сообщение пользователю
function showMessage(text, type) {
    // Удаляем старое сообщение если есть
    const oldMsg = document.querySelector('.message');
    if (oldMsg) {
        oldMsg.remove();
    }
    
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = text;
    
    const form = document.getElementById('booking-form');
    form.parentNode.insertBefore(msg, form);
    
    // Прокручиваем к сообщению
    msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Удаляем сообщение через 5 секунд
    setTimeout(() => {
        msg.remove();
    }, 5000);
}

