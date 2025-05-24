        // Глобальный объект для хранения данных всех вкладок (поддерживает оба варианта)
        let allTabsData = {
            "Сведения паспортные": { data: {} },
            "Сведения при обращении": { data: {} }, // Старое название
            "Сведения о состоянии": { data: {} },   // Новое название
            "Сведения в динамике": { data: {} }
        };

        // Исходные данные JSON
        let jsonData = {};

        // Инициализация при загрузке страницы
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('fileInput').addEventListener('change', handleFileSelect);
            document.getElementById('saveButton').addEventListener('click', saveAllData);
            document.getElementById('clearButton').addEventListener('click', clearForm);
            document.getElementById('reloadButton').addEventListener('click', reloadPage);
        });

        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (file) {
                clearForm();
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        jsonData = JSON.parse(e.target.result);
                        initializeTabsData();
                        renderTabs();
                        showNotification("Файл загружен успешно!", "success");
                    } catch (error) {
                        showNotification("Ошибка при чтении файла: " + error.message, "error");
                    }
                };
                reader.readAsText(file);
            }
        }

        function initializeTabsData() {
            // Определяем, какой вариант названий используется в загруженном JSON
            const tabsInJson = Object.keys(jsonData['Описание GUI для ПС']?.['Шаблон']?.['Ввод наблюдений']?.['Вкладка'] || {});
            
            // Создаем временный объект с нужными вкладками
            const tempData = {};
            
            // Копируем данные, сохраняя совместимость с обоими вариантами
            for (const tabName in allTabsData) {
                // Проверяем, есть ли такая вкладка в загруженном JSON
                if (tabsInJson.includes(tabName)) {
                    tempData[tabName] = { data: allTabsData[tabName].data || {} };
                }
            }
            
            // Для совместимости: если есть "Сведения о состоянии", но нет "Сведения при обращении"
            if (tempData["Сведения о состоянии"] && !tempData["Сведения при обращении"]) {
                tempData["Сведения при обращении"] = { data: tempData["Сведения о состоянии"].data };
            }
            // И наоборот
            else if (tempData["Сведения при обращении"] && !tempData["Сведения о состоянии"]) {
                tempData["Сведения о состоянии"] = { data: tempData["Сведения при обращении"].data };
            }
            
            allTabsData = tempData;
        }

        function showNotification(message, type = "success") {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.style.color = type === "success" ? "green" : "red";
            setTimeout(() => {
                notification.textContent = '';
            }, 3000);
        }

        function clearForm() {
            // Очищаем данные во всех вкладках
            for (const tabName in allTabsData) {
                allTabsData[tabName].data = {};
            }
            
            // Если есть активная вкладка, перерисовываем её
            const activeTab = document.querySelector('.tab-header.active');
            if (activeTab) {
                renderTabContent(activeTab.innerText.trim());
            }
            
            showNotification("Форма очищена!", "success");
        }

        function reloadPage() {
            location.reload();
        }

        function renderTabs() {
            const tabHeaders = document.querySelector('.tab-headers');
            const tabContents = document.querySelector('.tab-contents');
            tabHeaders.innerHTML = '';
            tabContents.innerHTML = '';

            // Получаем список вкладок из загруженного JSON
            const jsonTabs = jsonData['Описание GUI для ПС']?.['Шаблон']?.['Ввод наблюдений']?.['Вкладка'] || {};
            const tabsToRender = Object.keys(jsonTabs);
            
            // Фильтруем только существующие вкладки
            const availableTabs = Object.keys(allTabsData).filter(tab => tabsToRender.includes(tab));
            
            availableTabs.forEach(tabName => {
                const tabHeader = document.createElement('div');
                tabHeader.innerText = tabName;
                tabHeader.classList.add('tab-header');
                tabHeader.onclick = () => {
                    document.querySelectorAll('.tab-header').forEach(header => {
                        header.classList.remove('active');
                    });
                    tabHeader.classList.add('active');
                    renderTabContent(tabName);
                };
                tabHeaders.appendChild(tabHeader);
            });

            if (availableTabs.length > 0) {
                document.querySelector('.tab-header:first-child').classList.add('active');
                renderTabContent(availableTabs[0]);
            }
        }

        function renderTabContent(tabName) {
            const tabContents = document.querySelector('.tab-contents');
            tabContents.innerHTML = '';
            
            // Определяем актуальное название вкладки в JSON (для совместимости)
            let actualTabName = tabName;
            const jsonTabs = jsonData['Описание GUI для ПС']?.['Шаблон']?.['Ввод наблюдений']?.['Вкладка'] || {};
            
            // Если запрошенной вкладки нет, проверяем альтернативные названия
            if (!jsonTabs[tabName]) {
                if (tabName === "Сведения при обращении" && jsonTabs["Сведения о состоянии"]) {
                    actualTabName = "Сведения о состоянии";
                } else if (tabName === "Сведения о состоянии" && jsonTabs["Сведения при обращении"]) {
                    actualTabName = "Сведения при обращении";
                }
            }
            
            const tabStructure = jsonTabs[actualTabName] || {};
            renderJSON(tabStructure, tabContents, false, tabName); // Передаем исходное название для сохранения данных
        }

        function renderJSON(data, container, skipHeaders = false, tabName) {
            for (const key in data) {
                // Пропускаем служебные ключи
                if (key === 'Качественное значение' || key === 'Числовое значение' || 
                    key === 'единица измерения' || key === 'место записи в документе' ||
                    key === 'путь к узлу документа') {
                    continue;
                }

                // Пропускаем промежуточные узлы
                const isIntermediateNode = [
                    'Вершина меню', 
                    'Идентификация', 
                    'Группа',
                    'Вкладка',
                    'Шаблон',
                    'Описание GUI для ПС'
                ].includes(key);
                
                if (isIntermediateNode) {
                    renderJSON(data[key], container, true, tabName);
                    continue;
                }

                const div = document.createElement('div');
                if (!skipHeaders) {
                    div.classList.add('nested');
                }

                if (typeof data[key] === 'object' && data[key] !== null) {
                    // Обработка качественных значений
                    if (data[key]['Качественное значение']) {
                        const label = document.createElement('label');
                        label.textContent = `${key}: `;
                        div.appendChild(label);

                        const select = document.createElement('select');
                        select.name = key;
                        
                        const emptyOption = document.createElement('option');
                        emptyOption.value = "";
                        emptyOption.textContent = "-- Выберите значение --";
                        select.appendChild(emptyOption);
                        
                        const qualitativeValues = data[key]['Качественное значение'];
                        for (const qualitativeKey in qualitativeValues) {
                            const optionElement = document.createElement('option');
                            optionElement.value = qualitativeKey;
                            optionElement.textContent = qualitativeKey;
                            
                            if (allTabsData[tabName].data[key] === qualitativeKey) {
                                optionElement.selected = true;
                            }
                            
                            select.appendChild(optionElement);
                        }
                        
                        select.addEventListener('change', function() {
                            allTabsData[tabName].data[key] = this.value;
                        });
                        
                        div.appendChild(select);
                    } 
                    // Обработка числовых значений
                    else if (data[key]['Числовое значение']) {
                        const label = document.createElement('label');
                        label.textContent = `${key}: `;
                        div.appendChild(label);

                        const input = document.createElement('input');
                        input.type = 'number';
                        input.name = key;
                        input.placeholder = `Введите значение (${data[key]['Числовое значение']['единица измерения']})`;
                        
                        if (allTabsData[tabName].data[key] !== undefined) {
                            input.value = allTabsData[tabName].data[key];
                        }
                        
                        input.addEventListener('input', function() {
                            allTabsData[tabName].data[key] = this.value ? Number(this.value) : null;
                        });
                        
                        div.appendChild(input);
                    }
                    // Обработка присутствия/отсутствия
                    else if (data[key]['присутствие'] || data[key]['отсутствует']) {
                        // Создаем блок для симптома
                        const wrapperDiv = document.createElement('div');
                        wrapperDiv.classList.add('symptom-wrapper');
                        
                        // Добавляем название симптома
                        const symptomLabel = document.createElement('label');
                        symptomLabel.textContent = `${key}: `;
                        symptomLabel.style.fontWeight = 'bold';
                        wrapperDiv.appendChild(symptomLabel);
                        
                        // Создаем select для выбора присутствия/отсутствия
                        const select = document.createElement('select');
                        select.name = key;
                        select.classList.add('presence-select');
                        
                        const optionPresent = document.createElement('option');
                        optionPresent.value = 'присутствие';
                        optionPresent.textContent = 'Присутствует';
                        select.appendChild(optionPresent);
                        
                        const optionAbsent = document.createElement('option');
                        optionAbsent.value = 'отсутствует';
                        optionAbsent.textContent = 'Отсутствует';
                        select.appendChild(optionAbsent);
                        
                        // Устанавливаем текущее значение, если оно есть
                        if (allTabsData[tabName].data[key] === 'присутствие' || 
                            allTabsData[tabName].data[key] === 'отсутствует') {
                            select.value = allTabsData[tabName].data[key];
                        }
                        
                        // Создаем контейнер для характеристик
                        const characteristicsDiv = document.createElement('div');
                        characteristicsDiv.classList.add('characteristics');
                        
                        // Показываем характеристики только если выбран "присутствие"
                        if (data[key]['присутствие'] && data[key]['присутствие']['Характеристика']) {
                            characteristicsDiv.style.display = select.value === 'присутствие' ? 'block' : 'none';
                            renderJSON(data[key]['присутствие']['Характеристика'], characteristicsDiv, true, tabName);
                        }
                        
                        // Обработчик изменения выбора
                        select.addEventListener('change', function() {
                            allTabsData[tabName].data[key] = this.value;
                            if (characteristicsDiv) {
                                characteristicsDiv.style.display = this.value === 'присутствие' ? 'block' : 'none';
                            }
                        });
                        
                        wrapperDiv.appendChild(select);
                        if (characteristicsDiv.childNodes.length > 0) {
                            wrapperDiv.appendChild(characteristicsDiv);
                        }
                        
                        div.appendChild(wrapperDiv);
                    }
                    // Обработка специальных блоков (Дневник наблюдений, Анамнез заболевания и т.д.)
                    else if (key === 'Дневник наблюдений' || key === 'Анамнез заболевания' || 
                             key === 'Назначение лечения' || key === 'Жалобы' || key === 'Осмотр' || 
                             key === 'Опрос' || key === 'Сведения паспортные' || key === 'Сведения при обращении' ||
                             key === 'Сведения в динамике') {
                        // Создаем контейнер для всей секции
                        const sectionDiv = document.createElement('div');
                        sectionDiv.classList.add('collapsible-section');
                        
                        // Создаем заголовок секции (кнопка для раскрытия/скрытия)
                        const headerButton = document.createElement('button');
                        headerButton.classList.add('section-header');
                        headerButton.textContent = key;
                        headerButton.addEventListener('click', function() {
                            this.classList.toggle('active');
                            const content = this.nextElementSibling;
                            content.style.display = content.style.display === 'block' ? 'none' : 'block';
                        });
                        
                        // Создаем контейнер для содержимого секции
                        const contentDiv = document.createElement('div');
                        contentDiv.classList.add('section-content');
                        contentDiv.style.display = 'none'; // По умолчанию скрыто
                        
                        // Рендерим содержимое секции
                        renderJSON(data[key], contentDiv, true, tabName);
                        
                        // Добавляем элементы в DOM
                        sectionDiv.appendChild(headerButton);
                        sectionDiv.appendChild(contentDiv);
                        div.appendChild(sectionDiv);
                    }
                    // Рекурсивный рендеринг вложенных объектов
                    else {
                        if (!skipHeaders && Object.keys(data[key]).length > 0) {
                            const header = document.createElement('h3');
                            header.textContent = key;
                            div.appendChild(header);
                        }
                        
                        renderJSON(data[key], div, skipHeaders, tabName);
                    }
                }
                
                if (div.childNodes.length > 0) {
                    container.appendChild(div);
                }
            }
        }

        function saveAllData() {
            const ibId = "ИБ_" + new Date().getTime();
            const outputData = {
                "История болезни или наблюдений v.4": {
                    [ibId]: {
                        "дата обращения": new Date().toLocaleString('ru-RU'),
                        "Паспортная часть": { "Факт": {} },
                        "Жалобы": { "Признак": [] },
                        "Объективное состояние": {
                            "Общий осмотр": { "Признак": [] },
                            "Осмотр по системам": {}
                        },
                        "Дневники": {},
                        "История настоящего заболевания": { "Динамика текущего заболевания": {} },
                        "Лечение, назначенное врачом": { "Медикаментозная терапия": {} }
                    }
                }
            };
        
            const ibData = outputData["История болезни или наблюдений v.4"][ibId];
        
            // 1. Сохраняем паспортные данные
            const passportData = allTabsData["Сведения паспортные"].data;
            if (passportData["Возраст"]) {
                ibData["Паспортная часть"]["Факт"]["Возраст"] = {
                    "Числовые значения": {
                        "значение": Number(passportData["Возраст"]),
                        "единица измерения": "лет"
                    }
                };
            }
            if (passportData["Национальность"]) {
                ibData["Паспортная часть"]["Факт"]["Национальность"] = {
                    "Качественные значения": {
                        "значение": [passportData["Национальность"]]
                    }
                };
            }
        
            // 2. Сохраняем данные о состоянии (жалобы и осмотр)
            const stateData = allTabsData["Сведения о состоянии"].data || allTabsData["Сведения при обращении"].data;
            
            // Жалобы
            if (stateData["Головокружение"]) {
                const symptom = {
                    "Головокружение": {
                        "Характеристика": {
                            "Присутствие": {
                                "Качественные значения": {
                                    "значение": [stateData["Головокружение"] === "присутствие" ? "имеется" : "отсутствует"]
                                }
                            }
                        }
                    }
                };
                
                if (stateData["Головокружение_Характеристика"]?.Выраженность) {
                    symptom["Головокружение"]["Характеристика"]["Выраженность"] = {
                        "Качественные значения": {
                            "значение": [stateData["Головокружение_Характеристика"].Выраженность]
                        }
                    };
                }
                ibData["Жалобы"]["Признак"].push(symptom);
            }
        
            if (stateData["Боль в грудной клетке"]) {
                const symptom = {
                    "Боль в грудной клетке": {
                        "Характеристика": {
                            "Присутствие": {
                                "Качественные значения": {
                                    "значение": [stateData["Боль в грудной клетке"] === "присутствие" ? "имеется" : "отсутствует"]
                                }
                            }
                        }
                    }
                };
                
                if (stateData["Боль в грудной клетке_Характеристика"]?.Характер) {
                    symptom["Боль в грудной клетке"]["Характеристика"]["Характер"] = {
                        "Качественные значения": {
                            "значение": [stateData["Боль в грудной клетке_Характеристика"].Характер]
                        }
                    };
                }
                
                if (stateData["Боль в грудной клетке_Характеристика"]?.Периодичность) {
                    symptom["Боль в грудной клетке"]["Характеристика"]["Периодичность"] = {
                        "Качественные значения": {
                            "значение": [stateData["Боль в грудной клетке_Характеристика"].Периодичность]
                        }
                    };
                }
                ibData["Жалобы"]["Признак"].push(symptom);
            }
        
            if (stateData["Нарушение сна"]) {
                ibData["Жалобы"]["Признак"].push({
                    "Нарушение сна": {
                        "Качественные значения": {
                            "значение": [stateData["Нарушение сна"]]
                        }
                    }
                });
            }
        
            if (stateData["Сонливость"]) {
                ibData["Жалобы"]["Признак"].push({
                    "Сонливость": {
                        "Качественные значения": {
                            "значение": [stateData["Сонливость"]]
                        }
                    }
                });
            }
        
            // Осмотр
            if (stateData["Окраска кожи"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Окраска кожи": {
                        "Качественные значения": {
                            "значение": [stateData["Окраска кожи"]]
                        }
                    }
                });
            }
        
            if (stateData["Влажность"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Влажность": {
                        "Качественные значения": {
                            "значение": [stateData["Влажность"]]
                        }
                    }
                });
            }
        
            if (stateData["Окраска слизистой"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Окраска слизистой": {
                        "Качественные значения": {
                            "значение": [stateData["Окраска слизистой"]]
                        }
                    }
                });
            }
        
            if (stateData["Влажность слизистой"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Влажность слизистой": {
                        "Качественные значения": {
                            "значение": [stateData["Влажность слизистой"]]
                        }
                    }
                });
            }
        
            if (stateData["Частота сердечных сокращений"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Частота сердечных сокращений": {
                        "Числовые значения": {
                            "значение": Number(stateData["Частота сердечных сокращений"]),
                            "единица измерения": "уд/мин"
                        }
                    }
                });
            }
        
            if (stateData["Систолическое артериальное давление"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Систолическое артериальное давление": {
                        "Числовые значения": {
                            "значение": Number(stateData["Систолическое артериальное давление"]),
                            "единица измерения": "мм.рт.ст."
                        }
                    }
                });
            }
        
            if (stateData["Диастолическое артериальное давление"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Диастолическое артериальное давление": {
                        "Числовые значения": {
                            "значение": Number(stateData["Диастолическое артериальное давление"]),
                            "единица измерения": "мм.рт.ст."
                        }
                    }
                });
            }
        
            if (stateData["Раздражительность"]) {
                ibData["Объективное состояние"]["Общий осмотр"]["Признак"].push({
                    "Раздражительность": {
                        "Качественные значения": {
                            "значение": [stateData["Раздражительность"]]
                        }
                    }
                });
            }
        
            // Опрос
            if (stateData["Чувство страха"]) {
                const symptom = {
                    "Чувство страха": {
                        "Характеристика": {
                            "Присутствие": {
                                "Качественные значения": {
                                    "значение": [stateData["Чувство страха"] === "присутствие" ? "имеется" : "отсутствует"]
                                }
                            }
                        }
                    }
                };
                
                if (stateData["Чувство страха_Характеристика"]?.["Вид страха"]) {
                    symptom["Чувство страха"]["Характеристика"]["Вид страха"] = {
                        "Качественные значения": {
                            "значение": [stateData["Чувство страха_Характеристика"]["Вид страха"]]
                        }
                    };
                }
                ibData["Жалобы"]["Признак"].push(symptom);
            }
        
            // Диагноз
            if (stateData["Клинический диагноз"]) {
                ibData["Жалобы"]["Признак"].push({
                    "Клинический диагноз": {
                        "Качественные значения": {
                            "значение": [stateData["Клинический диагноз"]]
                        }
                    }
                });
            }
        
            if (stateData["Сопутствующий диагноз"]) {
                ibData["Жалобы"]["Признак"].push({
                    "Сопутствующий диагноз": {
                        "Качественные значения": {
                            "значение": [stateData["Сопутствующий диагноз"]]
                        }
                    }
                });
            }
        
            if (stateData["Операции"]) {
                ibData["Жалобы"]["Признак"].push({
                    "Операции": {
                        "Качественные значения": {
                            "значение": [stateData["Операции"]]
                        }
                    }
                });
            }
        
            // 3. Сохраняем динамические данные
            const dynamicData = allTabsData["Сведения в динамике"].data;
            const diaryId = "Запись_" + new Date().getTime();
            ibData["Дневники"][diaryId] = {
                "Объективное состояние": {
                    "Общий осмотр": { "Признак": [] }
                }
            };
        
            // Дневник наблюдений
            if (dynamicData["Головокружение"]) {
                const symptom = {
                    "Головокружение": {
                        "Характеристика": {
                            "Присутствие": {
                                "Качественные значения": {
                                    "значение": [dynamicData["Головокружение"] === "присутствие" ? "имеется" : "отсутствует"]
                                }
                            }
                        }
                    }
                };
                
                if (dynamicData["Головокружение_Характеристика"]?.Выраженность) {
                    symptom["Головокружение"]["Характеристика"]["Выраженность"] = {
                        "Качественные значения": {
                            "значение": [dynamicData["Головокружение_Характеристика"].Выраженность]
                        }
                    };
                }
                ibData["Дневники"][diaryId]["Объективное состояние"]["Общий осмотр"]["Признак"].push(symptom);
            }
        
            if (dynamicData["Боль в грудной клетке"]) {
                const symptom = {
                    "Боль в грудной клетке": {
                        "Характеристика": {
                            "Присутствие": {
                                "Качественные значения": {
                                    "значение": [dynamicData["Боль в грудной клетке"] === "присутствие" ? "имеется" : "отсутствует"]
                                }
                            }
                        }
                    }
                };
                
                if (dynamicData["Боль в грудной клетке_Характеристика"]?.Характер) {
                    symptom["Боль в грудной клетке"]["Характеристика"]["Характер"] = {
                        "Качественные значения": {
                            "значение": [dynamicData["Боль в грудной клетке_Характеристика"].Характер]
                        }
                    };
                }
                
                if (dynamicData["Боль в грудной клетке_Характеристика"]?.Периодичность) {
                    symptom["Боль в грудной клетке"]["Характеристика"]["Периодичность"] = {
                        "Качественные значения": {
                            "значение": [dynamicData["Боль в грудной клетке_Характеристика"].Периодичность]
                        }
                    };
                }
                ibData["Дневники"][diaryId]["Объективное состояние"]["Общий осмотр"]["Признак"].push(symptom);
            }
        
            if (dynamicData["Чувство страха"]) {
                const symptom = {
                    "Чувство страха": {
                        "Характеристика": {
                            "Присутствие": {
                                "Качественные значения": {
                                    "значение": [dynamicData["Чувство страха"] === "присутствие" ? "имеется" : "отсутствует"]
                                }
                            }
                        }
                    }
                };
                ibData["Дневники"][diaryId]["Объективное состояние"]["Общий осмотр"]["Признак"].push(symptom);
            }
        
            // Назначение лечения
            const treatmentId = "Запись_" + new Date().getTime();
            ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId] = {
                "запись о лечении": {}
            };
        
            if (dynamicData["название"]) {
                ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId]["запись о лечении"]["название"] = {
                    "Качественные значения": {
                        "значение": [dynamicData["название"]]
                    }
                };
            }
        
            if (dynamicData["режим приема"]) {
                ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId]["запись о лечении"]["режим приема"] = {
                    "Качественные значения": {
                        "значение": [dynamicData["режим приема"]]
                    }
                };
            }
        
            if (dynamicData["органические нитраты короткого действия"]) {
                ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId]["запись о лечении"]["органические нитраты короткого действия"] = {
                    "Качественные значения": {
                        "значение": [dynamicData["органические нитраты короткого действия"]]
                    }
                };
            }
        
            if (dynamicData["терапия ПегИФН + РБВ"]) {
                ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId]["запись о лечении"]["терапия ПегИФН + РБВ"] = {
                    "Качественные значения": {
                        "значение": [dynamicData["терапия ПегИФН + РБВ"]]
                    }
                };
            }
        
            if (dynamicData["ПВТ (противовирусной терапии)"]) {
                ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId]["запись о лечении"]["ПВТ (противовирусной терапии)"] = {
                    "Качественные значения": {
                        "значение": [dynamicData["ПВТ (противовирусной терапии)"]]
                    }
                };
            }
        
            if (dynamicData["Значение"]) {
                ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId]["запись о лечении"]["Значение"] = {
                    "Качественные значения": {
                        "значение": [dynamicData["Значение"]]
                    }
                };
            }
        
            if (dynamicData["Явление"]) {
                ibData["Лечение, назначенное врачом"]["Медикаментозная терапия"][treatmentId]["запись о лечении"]["Явление"] = {
                    "Качественные значения": {
                        "значение": [dynamicData["Явление"]]
                    }
                };
            }
        
            // Проверка на пустоту
            let isEmpty = true;
            for (const section in ibData) {
                if (Object.keys(ibData[section]).length > 0) {
                    isEmpty = false;
                    break;
                }
            }
            
            if (isEmpty) {
                showNotification("Нет данных для сохранения!", "error");
                return;
            }
        
            const jsonOutput = JSON.stringify(outputData, null, 2);
        
            const blob = new Blob([jsonOutput], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'история_болезни.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification("Данные сохранены в формате ИБ!", "success");
        }