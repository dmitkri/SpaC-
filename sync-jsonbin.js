// Простая синхронизация через JSONBin.io
// Не требует Firebase, работает через REST API

(function() {
    'use strict';

    let syncEnabled = false;
    let syncConfig = null;
    let binId = null;
    let syncInProgress = false;

    // Проверка и инициализация
    function initSync() {
        const configStr = localStorage.getItem('spa_sync_config');
        if (configStr) {
            try {
                syncConfig = JSON.parse(configStr);
                if (syncConfig.enabled && syncConfig.type === 'jsonbin' && syncConfig.apiKey) {
                    syncEnabled = true;
                    binId = syncConfig.binId;
                    
                    // Загружаем данные из облака при старте
                    loadFromCloud();
                    
                    // Настраиваем автоматическую синхронизацию при изменениях
                    setupAutoSync();
                    
                    console.log('JSONBin синхронизация включена');
                }
            } catch (e) {
                console.error('Ошибка инициализации синхронизации:', e);
            }
        }
    }

    // Загрузка данных из облака
    async function loadFromCloud() {
        if (!syncEnabled || syncInProgress) return;
        
        try {
            syncInProgress = true;
            
            // Если binId нет, создаем новый bin
            if (!binId) {
                binId = await createBin();
                if (binId) {
                    syncConfig.binId = binId;
                    localStorage.setItem('spa_sync_config', JSON.stringify(syncConfig));
                }
            }

            if (!binId) {
                console.error('Не удалось создать или получить bin ID');
                return;
            }

            // Загружаем данные
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: {
                    'X-Master-Key': syncConfig.apiKey,
                    'X-Bin-Meta': 'false'
                }
            });

            if (response.ok) {
                const cloudData = await response.json();
                
                // Устанавливаем флаг синхронизации, чтобы не создавать цикл
                localStorage.setItem('spa_syncing_from_cloud', 'true');
                
                // Применяем данные из облака
                if (cloudData && typeof cloudData === 'object') {
                    Object.keys(cloudData).forEach(key => {
                        if (key.startsWith('spa_')) {
                            try {
                                localStorage.setItem(key, JSON.stringify(cloudData[key]));
                            } catch (e) {
                                console.error('Ошибка сохранения ключа:', key, e);
                            }
                        }
                    });
                }
                
                localStorage.removeItem('spa_syncing_from_cloud');
                
                // Уведомляем об обновлении
                window.dispatchEvent(new CustomEvent('spaDataSynced'));
                
                console.log('Данные загружены из облака');
            } else if (response.status === 404 && !syncConfig.binId) {
                // Bin не существует, создадим при первой записи
                console.log('Bin не найден, будет создан при сохранении');
            } else {
                console.error('Ошибка загрузки из облака:', response.status);
            }
        } catch (error) {
            console.error('Ошибка синхронизации из облака:', error);
        } finally {
            syncInProgress = false;
        }
    }

    // Создание нового bin
    async function createBin() {
        try {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('spa_')) {
                    try {
                        data[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        data[key] = localStorage.getItem(key);
                    }
                }
            }

            const response = await fetch('https://api.jsonbin.io/v3/b', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': syncConfig.apiKey,
                    'X-Bin-Name': 'SPA Salon Data'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                return result.metadata.id;
            } else {
                const error = await response.json();
                console.error('Ошибка создания bin:', error);
                return null;
            }
        } catch (error) {
            console.error('Ошибка создания bin:', error);
            return null;
        }
    }

    // Сохранение в облако
    async function saveToCloud() {
        if (!syncEnabled || syncInProgress) return;
        if (localStorage.getItem('spa_syncing_from_cloud') === 'true') return;

        try {
            syncInProgress = true;

            if (!binId) {
                binId = await createBin();
                if (binId) {
                    syncConfig.binId = binId;
                    localStorage.setItem('spa_sync_config', JSON.stringify(syncConfig));
                } else {
                    console.error('Не удалось создать bin для синхронизации');
                    return;
                }
            }

            // Собираем все данные
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('spa_')) {
                    try {
                        data[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        data[key] = localStorage.getItem(key);
                    }
                }
            }

            // Сохраняем в JSONBin
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': syncConfig.apiKey
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log('Данные синхронизированы в облако');
            } else {
                const error = await response.json();
                console.error('Ошибка синхронизации в облако:', error);
            }
        } catch (error) {
            console.error('Ошибка сохранения в облако:', error);
        } finally {
            syncInProgress = false;
        }
    }

    // Настройка автоматической синхронизации
    function setupAutoSync() {
        // Перехватываем изменения localStorage
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            
            if (key && key.startsWith('spa_') && syncEnabled && 
                localStorage.getItem('spa_syncing_from_cloud') !== 'true') {
                // Отложенная синхронизация
                clearTimeout(window.jsonbinSyncTimeout);
                window.jsonbinSyncTimeout = setTimeout(() => {
                    saveToCloud();
                }, 2000); // Синхронизация через 2 секунды после последнего изменения
            }
        };

        // Периодическая синхронизация (каждые 30 секунд)
        setInterval(() => {
            if (syncEnabled) {
                loadFromCloud();
            }
        }, 30000);
    }

    // Инициализация при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSync);
    } else {
        initSync();
    }

    // Экспорт функций
    window.jsonbinSync = {
        saveNow: saveToCloud,
        loadNow: loadFromCloud,
        isEnabled: () => syncEnabled
    };
})();

