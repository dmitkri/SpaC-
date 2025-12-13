// Модуль синхронизации данных через облачное хранилище
// Поддерживает Firebase Realtime Database и Firebase Firestore

(function() {
    'use strict';

    let firebaseApp = null;
    let firebaseDatabase = null;
    let firestore = null;
    let useCloud = false;
    let syncEnabled = false;

    // Проверяем, включена ли синхронизация
    function checkCloudSync() {
        const config = localStorage.getItem('spa_cloud_config');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                useCloud = parsed.enabled === true;
                return parsed;
            } catch (e) {
                console.error('Ошибка парсинга конфига облака:', e);
            }
        }
        return null;
    }

    // Инициализация Firebase
    function initFirebase(config) {
        if (!config || !config.apiKey || !config.databaseURL) {
            console.warn('Конфигурация Firebase неполная');
            return false;
        }

        try {
            // Проверяем, есть ли уже Firebase
            if (typeof firebase === 'undefined') {
                console.error('Firebase SDK не загружен. Добавьте скрипт Firebase в HTML.');
                return false;
            }

            firebaseApp = firebase.initializeApp({
                apiKey: config.apiKey,
                authDomain: config.authDomain,
                databaseURL: config.databaseURL,
                projectId: config.projectId,
                storageBucket: config.storageBucket,
                messagingSenderId: config.messagingSenderId,
                appId: config.appId
            });

            // Используем Realtime Database
            firebaseDatabase = firebase.database();
            useCloud = true;
            syncEnabled = true;

            // Слушаем изменения в облаке
            setupCloudListeners();

            return true;
        } catch (error) {
            console.error('Ошибка инициализации Firebase:', error);
            return false;
        }
    }

    // Настройка слушателей изменений из облака
    function setupCloudListeners() {
        if (!firebaseDatabase) return;

        const ref = firebaseDatabase.ref('spa_data');
        
        ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Синхронизируем данные из облака в localStorage
                syncFromCloud(data);
            }
        }, (error) => {
            console.error('Ошибка синхронизации из облака:', error);
        });
    }

    // Синхронизация из облака в localStorage
    function syncFromCloud(cloudData) {
        if (!cloudData) return;

        // Сохраняем флаг, что идет синхронизация из облака (чтобы не создавать цикл)
        localStorage.setItem('spa_syncing_from_cloud', 'true');

        try {
            Object.keys(cloudData).forEach(key => {
                if (key.startsWith('spa_')) {
                    localStorage.setItem(key, JSON.stringify(cloudData[key]));
                }
            });
        } catch (error) {
            console.error('Ошибка синхронизации данных:', error);
        } finally {
            localStorage.removeItem('spa_syncing_from_cloud');
            
            // Уведомляем об обновлении данных
            window.dispatchEvent(new CustomEvent('spaDataSynced'));
        }
    }

    // Синхронизация в облако
    function syncToCloud() {
        if (!firebaseDatabase || !syncEnabled) return;
        if (localStorage.getItem('spa_syncing_from_cloud') === 'true') return;

        try {
            const allData = {};
            
            // Собираем все данные из localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('spa_')) {
                    try {
                        allData[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        // Если не JSON, сохраняем как строку
                        allData[key] = localStorage.getItem(key);
                    }
                }
            }

            // Отправляем в Firebase
            firebaseDatabase.ref('spa_data').set(allData)
                .then(() => {
                    console.log('Данные синхронизированы в облако');
                })
                .catch((error) => {
                    console.error('Ошибка синхронизации в облако:', error);
                });
        } catch (error) {
            console.error('Ошибка подготовки данных для облака:', error);
        }
    }

    // Загрузка данных из облака
    async function loadFromCloud() {
        if (!firebaseDatabase || !syncEnabled) return null;

        try {
            const snapshot = await firebaseDatabase.ref('spa_data').once('value');
            const data = snapshot.val();
            if (data) {
                syncFromCloud(data);
                return data;
            }
        } catch (error) {
            console.error('Ошибка загрузки из облака:', error);
        }
        return null;
    }

    // Перехватываем изменения localStorage для автоматической синхронизации
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        
        if (key && key.startsWith('spa_') && syncEnabled && 
            localStorage.getItem('spa_syncing_from_cloud') !== 'true') {
            // Отложенная синхронизация (debounce)
            clearTimeout(window.spaSyncTimeout);
            window.spaSyncTimeout = setTimeout(() => {
                syncToCloud();
            }, 1000); // Синхронизация через 1 секунду после последнего изменения
        }
    };

    // Инициализация при загрузке
    const config = checkCloudSync();
    if (config && config.enabled) {
        // Ждем загрузки Firebase SDK
        if (typeof firebase !== 'undefined') {
            initFirebase(config);
        } else {
            // Пытаемся инициализировать позже
            window.addEventListener('load', () => {
                if (typeof firebase !== 'undefined') {
                    initFirebase(config);
                }
            });
        }
    }

    // Экспорт функций для использования
    window.cloudSync = {
        init: function(firebaseConfig) {
            const configToSave = {
                enabled: true,
                ...firebaseConfig
            };
            localStorage.setItem('spa_cloud_config', JSON.stringify(configToSave));
            return initFirebase(firebaseConfig);
        },
        disable: function() {
            useCloud = false;
            syncEnabled = false;
            localStorage.setItem('spa_cloud_config', JSON.stringify({ enabled: false }));
            if (firebaseDatabase) {
                firebaseDatabase.ref('spa_data').off();
            }
        },
        isEnabled: function() {
            return syncEnabled;
        },
        syncNow: syncToCloud,
        loadNow: loadFromCloud,
        checkConfig: checkCloudSync
    };
})();

