// Клиентский скрипт для онлайн записи
const API_URL = ''; // Используется mock API для GitHub Pages

// Состояние записи
let bookingState = {
    serviceId: null,
    specialistId: null,
    date: null,
    time: null,
    service: null,
    specialist: null
};

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let services = [];
let specialists = [];

// Инициализация
window.onload = function() {
    loadServices();
    setupDateMin();
};

// Установка минимальной даты (сегодня)
function setupDateMin() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    renderCalendar();
}

// Загрузка услуг
async function loadServices() {
    try {
        const response = await fetch(API_URL + '/api/services');
        const data = await response.json();
        // Убираем дубликаты при загрузке
        const uniqueServices = [];
        const seenIds = new Set();
        if (Array.isArray(data)) {
            data.forEach(service => {
                if (!seenIds.has(service.id)) {
                    seenIds.add(service.id);
                    uniqueServices.push(service);
                }
            });
        }
        services = uniqueServices;
        renderServices();
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        showMessage('Не удалось загрузить услуги', 'error');
    }
}

// Отображение услуг
let renderServicesInProgress = false;
function renderServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    
    // Предотвращаем множественные одновременные рендеринги
    if (renderServicesInProgress) {
        console.log('Рендеринг услуг уже выполняется, пропускаем...');
        return;
    }
    renderServicesInProgress = true;
    
    // Полностью очищаем grid перед рендерингом
    while (grid.firstChild) {
        grid.removeChild(grid.firstChild);
    }
    grid.innerHTML = '';
    
    // Убираем дубликаты из массива перед рендерингом
    const uniqueServices = [];
    const seenIds = new Set();
    services.forEach(service => {
        if (service && service.id && !seenIds.has(service.id)) {
            seenIds.add(service.id);
            uniqueServices.push(service);
        }
    });
    
    // Обновляем массив services уникальными значениями
    services.length = 0;
    services.push(...uniqueServices);
    
    console.log(`Рендерим ${services.length} уникальных услуг`);
    
    // Рендерим только уникальные услуги
    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.setAttribute('data-service-id', service.id);
        card.onclick = () => selectService(service);
        
        if (bookingState.serviceId === service.id) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <h3>${service.name}</h3>
            <div class="price">${service.price} ₽</div>
            <div class="duration">⏱ ${service.duration} мин</div>
            <div class="description">${service.description || ''}</div>
        `;
        
        grid.appendChild(card);
    });
    
    renderServicesInProgress = false;
}

// Выбор услуги
function selectService(service) {
    bookingState.serviceId = service.id;
    bookingState.service = service;
    // Не перерендериваем все услуги, просто обновляем выделение
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
        if (parseInt(card.getAttribute('data-service-id')) === service.id) {
            card.classList.add('selected');
        }
    });
    document.getElementById('btn-next-1').disabled = false;
    loadSpecialistsForService();
}

// Загрузка мастеров для услуги
async function loadSpecialistsForService() {
    if (!bookingState.serviceId) return;
    
    // Предотвращаем множественные одновременные загрузки
    if (loadSpecialistsForService.loading) return;
    loadSpecialistsForService.loading = true;
    
    try {
        const service = services.find(s => s.id === bookingState.serviceId);
        const allSpecialistsResponse = await fetch(API_URL + '/api/specialists');
        const allSpecialists = await allSpecialistsResponse.json();
        
        let filteredSpecialists = [];
        if (service && service.specialistIds && service.specialistIds.length > 0) {
            filteredSpecialists = allSpecialists.filter(s => service.specialistIds.includes(s.id));
        } else {
            filteredSpecialists = allSpecialists;
        }
        
        // Убираем дубликаты мастеров
        const uniqueSpecialists = [];
        const seenIds = new Set();
        filteredSpecialists.forEach(specialist => {
            if (specialist && specialist.id && !seenIds.has(specialist.id)) {
                seenIds.add(specialist.id);
                uniqueSpecialists.push(specialist);
            }
        });
        
        // Полностью заменяем массив, а не добавляем к нему
        specialists.length = 0;
        specialists.push(...uniqueSpecialists);
        
        // Всегда рендерим мастеров, если мы на шаге 2 или переходим на него
        const step2El = document.querySelector('.step-content[data-content="2"]');
        if (step2El && step2El.classList.contains('active')) {
            renderSpecialists();
        }
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
        showMessage('Не удалось загрузить мастеров', 'error');
    } finally {
        loadSpecialistsForService.loading = false;
    }
}

// Отображение мастеров
let renderSpecialistsInProgress = false;
function renderSpecialists() {
    const grid = document.getElementById('specialists-grid');
    if (!grid) return;
    
    // Предотвращаем множественные одновременные рендеринги
    if (renderSpecialistsInProgress) {
        console.log('Рендеринг мастеров уже выполняется, пропускаем...');
        return;
    }
    renderSpecialistsInProgress = true;
    
    // Полностью очищаем grid перед рендерингом
    while (grid.firstChild) {
        grid.removeChild(grid.firstChild);
    }
    grid.innerHTML = '';
    
    if (specialists.length === 0) {
        grid.innerHTML = '<p>Нет доступных мастеров для этой услуги</p>';
        renderSpecialistsInProgress = false;
        return;
    }
    
    // Убираем дубликаты мастеров по ID перед рендерингом
    const uniqueSpecialists = [];
    const seenIds = new Set();
    specialists.forEach(specialist => {
        if (specialist && specialist.id && !seenIds.has(specialist.id)) {
            seenIds.add(specialist.id);
            uniqueSpecialists.push(specialist);
        }
    });
    
    // Обновляем массив specialists уникальными значениями
    specialists.length = 0;
    specialists.push(...uniqueSpecialists);
    
    console.log(`Рендерим ${specialists.length} уникальных мастеров`);
    
    // Рендерим только уникальных мастеров
    specialists.forEach(specialist => {
        const card = document.createElement('div');
        card.className = 'specialist-card';
        card.setAttribute('data-specialist-id', specialist.id);
        card.onclick = () => selectSpecialist(specialist);
        
        if (bookingState.specialistId === specialist.id) {
            card.classList.add('selected');
        }
        
        const initials = specialist.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        card.innerHTML = `
            <div class="specialist-avatar">${initials}</div>
            <div class="specialist-name">${specialist.name}</div>
            <div class="specialist-spec">${specialist.specialization}</div>
        `;
        
        grid.appendChild(card);
    });
    
    renderSpecialistsInProgress = false;
}

// Выбор мастера
function selectSpecialist(specialist) {
    bookingState.specialistId = specialist.id;
    bookingState.specialist = specialist;
    // Не перерендериваем всех мастеров, просто обновляем выделение
    document.querySelectorAll('.specialist-card').forEach(card => {
        card.classList.remove('selected');
        const cardId = card.getAttribute('data-specialist-id');
        if (cardId && parseInt(cardId) === specialist.id) {
            card.classList.add('selected');
        }
    });
    document.getElementById('btn-next-2').disabled = false;
}

// Переход между шагами
async function goToStep(stepNumber) {
    // Скрываем все шаги
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Показываем нужный шаг
    const targetStep = stepNumber + 1;
    document.querySelector(`.step-content[data-content="${targetStep}"]`).classList.add('active');
    
    // Обновляем индикаторы шагов
    for (let i = 1; i <= targetStep; i++) {
        const stepEl = document.querySelector(`.step[data-step="${i}"]`);
        if (i < targetStep) {
            stepEl.classList.add('completed');
        } else {
            stepEl.classList.add('active');
        }
    }
    
    // Загружаем данные для шага
    if (targetStep === 2) {
        // Загружаем мастеров для выбранной услуги, если еще не загружены
        if (bookingState.serviceId && specialists.length === 0) {
            loadSpecialistsForService().then(() => {
                renderSpecialists();
            });
        } else {
            renderSpecialists();
        }
    } else if (targetStep === 3) {
        renderCalendar();
        // Загружаем слоты только если все данные есть
        if (bookingState.specialistId && bookingState.serviceId) {
            loadTimeSlots();
        }
    } else if (targetStep === 4) {
        renderSummary();
        // Если клиент авторизован, заполняем контактные данные автоматически
        await fillClientDataIfLoggedIn();
    }
}

// Заполнение контактных данных для авторизованного клиента
async function fillClientDataIfLoggedIn() {
    const clientId = localStorage.getItem('clientId');
    if (!clientId) return;
    
    try {
        const response = await fetch(`${API_URL}/api/clients/${clientId}`);
        const client = await response.json();
        
        if (client.id) {
            document.getElementById('client-name').value = `${client.firstName || ''} ${client.lastName || ''}`.trim();
            document.getElementById('client-phone').value = client.phone || '';
            document.getElementById('client-email').value = client.email || '';
            
            // Делаем поля только для чтения
            document.getElementById('client-name').readOnly = true;
            document.getElementById('client-phone').readOnly = true;
            document.getElementById('client-email').readOnly = true;
        }
    } catch (error) {
        console.error('Ошибка загрузки данных клиента:', error);
    }
}

// Рендеринг календаря
function renderCalendar() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    document.getElementById('calendar-month').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    // Дни недели
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayNames.forEach(name => {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day-name';
        dayEl.textContent = name;
        grid.appendChild(dayEl);
    });
    
    // Первый день месяца
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Понедельник = 0
    
    // Количество дней в месяце
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Сегодняшняя дата
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    // Пустые ячейки в начале
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day';
        grid.appendChild(empty);
    }
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = formatDate(date);
        
        // Проверяем, не прошедшая ли дата
        if (date < today && (date.getDate() !== todayDate || date.getMonth() !== todayMonth || date.getFullYear() !== todayYear)) {
            dayEl.classList.add('disabled');
        } else {
            dayEl.onclick = () => selectDate(dateStr, dayEl);
            
            // Выделяем сегодня
            if (day === todayDate && currentMonth === todayMonth && currentYear === todayYear) {
                dayEl.classList.add('today');
            }
            
            // Выделяем выбранную дату
            if (bookingState.date === dateStr) {
                dayEl.classList.add('selected');
            }
        }
        
        grid.appendChild(dayEl);
    }
}

// Форматирование даты
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Изменение месяца
function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
    // Загружаем слоты только если все данные есть
    if (bookingState.date && bookingState.specialistId && bookingState.serviceId) {
        loadTimeSlots();
    }
}

// Выбор даты
function selectDate(date, element) {
    // Убираем выделение с предыдущей даты
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    bookingState.date = date;
    element.classList.add('selected');
    loadTimeSlots();
}

// Загрузка временных слотов
async function loadTimeSlots() {
    const timeSlotsEl = document.getElementById('time-slots');
    if (!timeSlotsEl) {
        console.error('Элемент time-slots не найден');
        return;
    }
    
    if (!bookingState.specialistId || !bookingState.date || !bookingState.serviceId) {
        timeSlotsEl.innerHTML = '<p style="color: #6c757d;">Выберите дату</p>';
        // Убираем лишний вывод в консоль - это нормальная ситуация при первом открытии календаря
        return;
    }
    
    timeSlotsEl.innerHTML = '<p style="color: #6c757d;">Загрузка...</p>';
    
    try {
        const url = `${API_URL}/api/specialists/${bookingState.specialistId}/slots?date=${bookingState.date}&serviceId=${bookingState.serviceId}`;
        console.log('Запрос временных слотов:', url);
        const response = await fetch(url);
        
        if (response.ok) {
            const slots = await response.json();
            console.log('Получены слоты:', slots);
            if (Array.isArray(slots)) {
                renderTimeSlots(slots);
            } else {
                timeSlotsEl.innerHTML = '<p style="color: #c33;">Ошибка: неверный формат данных</p>';
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка загрузки' }));
            timeSlotsEl.innerHTML = '<p style="color: #c33;">Ошибка: ' + (error.error || 'Не удалось загрузить время') + '</p>';
            console.error('Ошибка ответа:', error);
        }
    } catch (error) {
        console.error('Ошибка загрузки временных слотов:', error);
        timeSlotsEl.innerHTML = '<p style="color: #c33;">Ошибка подключения к серверу</p>';
    }
}

// Отображение временных слотов
function renderTimeSlots(slots) {
    const container = document.getElementById('time-slots');
    container.innerHTML = '';
    
    if (slots.length === 0) {
        container.innerHTML = '<p style="color: #6c757d;">Нет доступного времени на эту дату</p>';
        return;
    }
    
    slots.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = 'time-slot';
        slotEl.textContent = slot;
        
        if (bookingState.time === slot) {
            slotEl.classList.add('selected');
        }
        
        slotEl.onclick = () => selectTime(slot, slotEl);
        container.appendChild(slotEl);
    });
}

// Выбор времени
function selectTime(time, element) {
    // Убираем выделение с предыдущего времени
    document.querySelectorAll('.time-slot.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    bookingState.time = time;
    element.classList.add('selected');
    document.getElementById('btn-next-3').disabled = false;
}

// Отображение сводки
function renderSummary() {
    const summary = document.getElementById('booking-summary');
    
    if (!bookingState.service || !bookingState.specialist) {
        summary.innerHTML = '<p>Ошибка: не выбраны услуга или мастер</p>';
        return;
    }
    
    summary.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Услуга:</span>
            <span class="summary-value">${bookingState.service.name}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Мастер:</span>
            <span class="summary-value">${bookingState.specialist.name}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Дата:</span>
            <span class="summary-value">${formatDateDisplay(bookingState.date)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Время:</span>
            <span class="summary-value">${bookingState.time}</span>
        </div>
        <div class="summary-item summary-total">
            <span>Итого:</span>
            <span>${bookingState.service.price} ₽</span>
        </div>
    `;
}

// Форматирование даты для отображения
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${days[date.getDay()]}`;
}

// Отправка записи
async function submitBooking() {
    // Проверяем, авторизован ли клиент
    const loggedInClientId = localStorage.getItem('clientId');
    
    let clientId = null;
    let name = '', phone = '', email = '';
    
    if (loggedInClientId) {
        // Если клиент авторизован, используем его ID
        clientId = parseInt(loggedInClientId);
        name = document.getElementById('client-name').value.trim();
        phone = document.getElementById('client-phone').value.trim();
        email = document.getElementById('client-email').value.trim();
    } else {
        // Если не авторизован, требуем заполнения полей
        name = document.getElementById('client-name').value.trim();
        phone = document.getElementById('client-phone').value.trim();
        email = document.getElementById('client-email').value.trim();
        
        if (!name || !phone || !email) {
            showMessage('Заполните все обязательные поля', 'error');
            return;
        }
    }
    
    const notes = document.getElementById('client-notes').value.trim();
    
    if (!bookingState.serviceId || !bookingState.specialistId || !bookingState.date || !bookingState.time) {
        showMessage('Ошибка: не все данные выбраны', 'error');
        return;
    }
    
    // Валидация года
    const year = bookingState.date.split('-')[0];
    if (!year || year.length !== 4 || !/^\d{4}$/.test(year)) {
        showMessage('Ошибка: неверный формат даты', 'error');
        return;
    }
    
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Отправка...';
    
    try {
        // Если клиент не авторизован, находим или создаем клиента
        if (!clientId) {
            clientId = await findOrCreateClient(name, phone, email);
            
            if (!clientId) {
                throw new Error('Не удалось создать или найти клиента');
            }
        }
        
        // Создаем запись
        const response = await fetch(API_URL + '/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId,
                serviceId: bookingState.serviceId,
                specialistId: bookingState.specialistId,
                date: bookingState.date,
                time: bookingState.time,
                notes
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Запись успешно создана! Мы свяжемся с вами для подтверждения.', 'success');
                // Очищаем форму через 3 секунды
                setTimeout(() => {
                    location.reload();
                }, 3000);
            } else {
                throw new Error(result.error || 'Не удалось создать запись');
            }
        } else {
            const error = await response.json().catch(() => ({ error: 'Ошибка создания записи' }));
            throw new Error(error.error || 'Не удалось создать запись');
        }
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        showMessage('Ошибка: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Записаться';
    }
}

// Найти или создать клиента
async function findOrCreateClient(name, phone, email) {
    try {
        const response = await fetch(API_URL + '/api/clients');
        const clients = await response.json();
        
        // Ищем существующего клиента
        let existingClient = clients.find(c => c.phone === phone || c.email === email);
        
        if (existingClient) {
            return existingClient.id;
        }
        
        // Создаем нового клиента
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(' ') || '';
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
            
            // Если ID нет, ждем и ищем снова
            await new Promise(resolve => setTimeout(resolve, 100));
            const clientsResponse = await fetch(API_URL + '/api/clients');
            if (clientsResponse.ok) {
                const updatedClients = await clientsResponse.json();
                const newClient = updatedClients.find(c => c.phone === phone || c.email === email);
                return newClient ? newClient.id : null;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Ошибка при работе с клиентом:', error);
        return null;
    }
}

// Показать сообщение
function showMessage(message, type) {
    const messageEl = document.getElementById('booking-message');
    messageEl.className = type === 'error' ? 'error-message' : 'success-message';
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

