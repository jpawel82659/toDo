// --- Zmienne globalne ---
let tasks = []; // Lokalna kopia zadań
let currentFilter = 'all'; // Aktualny filtr ('all', 'active', 'completed')
const TASKS_STORAGE_KEY = 'todo_app_tasks'; // Klucz do localStorage

// --- Selektory DOM ---
const taskList = document.getElementById('task-list');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('empty-state');
const taskCounter = document.getElementById('task-counter');

// Formularz dodawania
const addTaskForm = document.getElementById('add-task-form');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const assigneeInput = document.getElementById('assignee');
const priorityInput = document.getElementById('priority');
const categoryInput = document.getElementById('category');
const deadlineInput = document.getElementById('deadline'); // PRZYWRÓCONY
let addTaskModal; // Inicjalizowane w DOMContentLoaded

// Formularz edycji
const editTaskForm = document.getElementById('edit-task-form');
const editTaskIdInput = document.getElementById('edit-task-id');
const editTitleInput = document.getElementById('edit-title');
const editDescriptionInput = document.getElementById('edit-description');
const editAssigneeInput = document.getElementById('edit-assignee');
const editPriorityInput = document.getElementById('edit-priority');
const editCategoryInput = document.getElementById('edit-category');
const editDeadlineInput = document.getElementById('edit-deadline'); // PRZYWRÓCONY
let editTaskModal; // Inicjalizowane w DOMContentLoaded

// Modal usuwania
let deleteConfirmModal; // Inicjalizowane w DOMContentLoaded
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Filtry
const filterButtonsContainer = document.getElementById('filter-buttons');

// --- Inicjalizacja Aplikacji ---
document.addEventListener('DOMContentLoaded', () => {
    
    // PRZYWRÓCONE: Inicjalizacja Datepickerów (Polonizacja)
    // Przenosimy opcje tutaj, aby były dostępne dla inicjalizacji globalnej ORAZ w modalach
    const datepickerOptions = {
        format: 'dd.mm.yyyy', // Ustawienie formatu
        autoClose: true,
        i18n: {
            cancel: 'Anuluj',
            clear: 'Wyczyść',
            done: 'OK',
            months: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
            monthsShort: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'],
            weekdays: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
            weekdaysShort: ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'],
            weekdaysAbbrev: ['N', 'P', 'W', 'Ś', 'C', 'P', 'S']
        }
    };

    // Inicjalizacja instancji modali
    addTaskModal = M.Modal.init(document.getElementById('add-task-modal'), {
        onOpenStart: () => {
            // Reinicjalizuj komponenty Materialize wewnątrz modala dodawania
            M.FormSelect.init(document.getElementById('priority'), {});
            // POPRAWKA: Ponowna inicjalizacja Datepickera przy otwarciu modala
            M.Datepicker.init(document.getElementById('deadline'), datepickerOptions);
            M.updateTextFields();
        }
    });
    
    editTaskModal = M.Modal.init(document.getElementById('edit-task-modal'), {
        onOpenStart: () => {
            // Reinicjalizuj komponenty Materialize wewnątrz modala edycji
            M.FormSelect.init(document.getElementById('edit-priority'), {});
            // POPRAWKA: Ponowna inicjalizacja Datepickera przy otwarciu modala
            M.Datepicker.init(document.getElementById('edit-deadline'), datepickerOptions);
            M.updateTextFields();
        }
    });
    
    editTaskModal = M.Modal.init(document.getElementById('edit-task-modal'), {
        onOpenStart: () => {
            // Reinicjalizuj komponenty Materialize wewnątrz modala edycji
            M.FormSelect.init(document.getElementById('edit-priority'), {});
            M.updateTextFields();
        }
    });
    
    deleteConfirmModal = M.Modal.init(document.getElementById('delete-confirm-modal'));

    // Inicjalizacja Select (dla formularzy POZA modalami, gdyby były)
    M.FormSelect.init(document.querySelectorAll('select'));

    // Inicjalizacja wszystkich Datepickerów przy starcie strony
    // (Te w modalach zostaną poprawnie zainicjowane ponownie przy ich otwarciu)
    M.Datepicker.init(document.querySelectorAll('.datepicker'), datepickerOptions);

    // Podpięcie głównych listenerów zdarzeń
    setupEventListeners();
    
    // Wczytanie zadań z localStorage
    loadTasks();
});

/**
 * Ustawia głównych listenerów zdarzeń aplikacji.
 */
function setupEventListeners() {
    // Przesłanie formularza dodawania
    addTaskForm.addEventListener('submit', handleAddTask);
    
    // Przesłanie formularza edycji
    editTaskForm.addEventListener('submit', handleEditTask);

    // Kliknięcia na liście zadań (delegacja zdarzeń)
    taskList.addEventListener('click', handleTaskListClick);
    
    // Kliknięcie przycisku potwierdzenia usunięcia
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

    // Kliknięcia filtrów (delegacja zdarzeń)
    filterButtonsContainer.addEventListener('click', handleFilterClick);
}

// --- Logika localStorage (CRUD) ---

/**
 * Wczytuje zadania z localStorage.
 */
function loadTasks() {
    const tasksFromStorage = localStorage.getItem(TASKS_STORAGE_KEY);
    if (tasksFromStorage) {
        tasks = JSON.parse(tasksFromStorage);
    } else {
        tasks = [];
    }
    
    // Sortujemy zadania (opcjonalnie, np. po dacie)
    tasks.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

    renderTasks();
}

/**
 * Zapisuje aktualną tablicę zadań do localStorage.
 */
function saveTasks() {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Obsługuje dodawanie nowego zadania.
 * @param {Event} e Zdarzenie submit formularza
 */
function handleAddTask(e) {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) {
        M.toast({ html: 'Tytuł zadania jest wymagany!' });
        return;
    }

    const now = new Date().toISOString();
    
    const newTask = {
        id: crypto.randomUUID(), // Generowanie unikalnego ID
        title: title,
        description: descriptionInput.value.trim(),
        assignee: assigneeInput.value.trim(),
        priority: priorityInput.value,
        category: categoryInput.value.trim(),
        deadline: deadlineInput.value.trim(), // PRZYWRÓCONY
        status: 'active', // Nowe zadania są domyślnie aktywne
        createdDate: now,
        modifiedDate: now
    };
    
    try {
        tasks.unshift(newTask); // Dodaj na początek listy (dla efektu najnowszego)
        saveTasks();
        renderTasks(); // Prerenderuj listę
        
        M.toast({ html: 'Zadanie dodane pomyślnie!' });
        addTaskForm.reset();
        // Reset selecta Materialize
        M.FormSelect.init(priorityInput, {});
        addTaskModal.close();
    } catch (error) {
        console.error("Błąd podczas dodawania zadania:", error);
        M.toast({ html: `Błąd: ${error.message}` });
    }
}

/**
 * Obsługuje zapisywanie edytowanego zadania.
 * @param {Event} e Zdarzenie submit formularza
 */
function handleEditTask(e) {
    e.preventDefault();
    const id = editTaskIdInput.value;
    const title = editTitleInput.value.trim();

    if (!id || !title) {
        M.toast({ html: 'Wystąpił błąd (brak ID) lub tytuł jest pusty.' });
        return;
    }

    try {
        // Znajdź indeks zadania do aktualizacji
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex === -1) {
            M.toast({ html: 'Błąd: Nie znaleziono zadania do edycji.' });
            return;
        }
        
        // Zaktualizuj dane w obiekcie
        const updatedTask = {
            ...tasks[taskIndex], // Zachowaj stare dane (jak ID, createdDate, status)
            title: title,
            description: editDescriptionInput.value.trim(),
            assignee: editAssigneeInput.value.trim(),
            priority: editPriorityInput.value,
            category: editCategoryInput.value.trim(),
            deadline: editDeadlineInput.value.trim(), // PRZYWRÓCONY
            modifiedDate: new Date().toISOString()
        };
        
        tasks[taskIndex] = updatedTask; // Podmień zadanie w tablicy
        
        saveTasks();
        renderTasks(); // Prerenderuj listę

        M.toast({ html: 'Zadanie zaktualizowane!' });
        editTaskForm.reset();
        editTaskModal.close();
    } catch (error) {
        console.error("Błąd podczas aktualizacji zadania:", error);
        M.toast({ html: `Błąd: ${error.message}` });
    }
}

/**
 * Obsługuje kliknięcia na liście zadań (checkbox, edycja, usuwanie).
 * @param {Event} e Zdarzenie click
 */
function handleTaskListClick(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return; // Kliknięto poza zadaniem

    const taskId = taskItem.dataset.id;
    
    // Kliknięcie checkboxa (zmiana statusu)
    if (e.target.matches('input[type="checkbox"]')) {
        const isCompleted = e.target.checked;
        toggleTaskStatus(taskId, isCompleted);
    }
    
    // Kliknięcie przycisku "Edytuj"
    if (e.target.closest('.edit-btn')) {
        openEditModal(taskId);
    }
    
    // Kliknięcie przycisku "Usuń"
    if (e.target.closest('.delete-btn')) {
        openDeleteConfirmModal(taskId);
    }
}

/**
 * Zmienia status zadania (aktywne / zakończone).
 * @param {string} id ID zadania
 * @param {boolean} isCompleted Nowy status
 */
function toggleTaskStatus(id, isCompleted) {
    const newStatus = isCompleted ? 'completed' : 'active';
    
    try {
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex === -1) return;

        tasks[taskIndex].status = newStatus;
        tasks[taskIndex].modifiedDate = new Date().toISOString();
        
        saveTasks();
        renderTasks(); // Prerenderuj listę, aby odzwierciedlić zmianę statusu
        
        M.toast({ html: `Status zadania zaktualizowany.` });
    } catch (error) {
        console.error("Błąd zmiany statusu:", error);
        M.toast({ html: `Błąd: ${error.message}` });
    }
}

/**
 * Otwiera modal potwierdzenia usunięcia.
 * @param {string} id ID zadania do usunięcia
 */
function openDeleteConfirmModal(id) {
    // Przechowujemy ID zadania w atrybucie data przycisku potwierdzenia
    confirmDeleteBtn.dataset.taskId = id;
    deleteConfirmModal.open();
}

/**
 * Obsługuje potwierdzenie usunięcia zadania.
 */
function handleConfirmDelete() {
    const id = confirmDeleteBtn.dataset.taskId;
    if (!id) return;

    try {
        // Odfiltruj usunięte zadanie
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks(); // Prerenderuj listę
        
        M.toast({ html: 'Zadanie usunięte.' });
        deleteConfirmModal.close();
    } catch (error) {
        console.error("Błąd podczas usuwania zadania:", error);
        M.toast({ html: `Błąd: ${error.message}` });
    }
}

/**
 * Otwiera modal edycji i wypełnia go danymi zadania.
 * @param {string} id ID zadania do edycji
 */
function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
        M.toast({ html: 'Nie znaleziono zadania!' });
        return;
    }

    // Wypełnij formularz edycji
    editTaskIdInput.value = task.id;
    editTitleInput.value = task.title;
    editDescriptionInput.value = task.description || '';
    editAssigneeInput.value = task.assignee || '';
    editPriorityInput.value = task.priority || 'medium';
    editCategoryInput.value = task.category || '';
    editDeadlineInput.value = task.deadline || ''; // PRZYWRÓCONY
    
    // Aktywuj etykiety Materialize (przesuń je do góry)
    M.updateTextFields();

    // Otwórz modal (reszta inicjalizacji dzieje się w onOpenStart)
    editTaskModal.open();
}


// --- Renderowanie i UI ---

/**
 * Renderuje listę zadań na podstawie aktualnego filtra.
 */
function renderTasks() {
    taskList.innerHTML = ''; // Wyczyść listę

    // Filtrowanie zadań
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'all') return true;
        return task.status === currentFilter;
    });

    // Sprawdzenie, czy lista jest pusta
    if (filteredTasks.length === 0) {
        // Jeśli nie ma przefiltrowanych, ale są jakieś zadania ogólnie, pokaż inny komunikat
        if (tasks.length > 0) {
            emptyState.querySelector('h5').textContent = 'Brak zadań';
            emptyState.querySelector('p').textContent = `Nie masz żadnych ${currentFilter === 'active' ? 'aktywnych' : 'zakończonych'} zadań.`;
        } else {
            emptyState.querySelector('h5').textContent = 'Brak zadań';
            emptyState.querySelector('p').textContent = 'Nie masz obecnie żadnych zadań. Dodaj nowe, klikając przycisk "+"!';
        }
        emptyState.classList.remove('hide');
    } else {
        emptyState.classList.add('hide');
        filteredTasks.forEach(task => {
            const taskElement = createTaskListItem(task);
            taskList.appendChild(taskElement);
        });
    }
    
    updateTaskCounter();
}

/**
 * Tworzy element HTML (LI) dla pojedynczego zadania.
 * @param {object} task Obiekt zadania
 * @returns {HTMLElement} Element LI
 */
function createTaskListItem(task) {
    const li = document.createElement('li');
    li.className = 'collection-item task-item';
    li.dataset.id = task.id;

    if (task.status === 'completed') {
        li.classList.add('completed');
    }

    const priorityClass = getPriorityClass(task.priority);
    const priorityText = { low: 'Niski', medium: 'Średni', high: 'Wysoki' }[task.priority] || 'Brak';
    
    // PRZYWRÓCONE: Sprawdzenie przeterminowania
    const overdue = isTaskOverdue(task);
    if (overdue) {
        li.classList.add('overdue-task'); // Dodanie klasy do całego elementu
    }

    li.innerHTML = `
        <div class="row" style="margin-bottom: 0;">
            <!-- Checkbox i Tytuł -->
            <div class="col s12 m8 l9">
                <p style="margin-top: 10px;">
                    <label>
                        <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} />
                        <span class="task-title">${escapeHTML(task.title)}</span>
                    </label>
                </p>
                ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
            </div>
            
            <!-- Przyciski Akcji (Edytuj, Usuń) -->
            <div class="col s12 m4 l3 task-actions secondary-content" style="text-align: right; padding-top: 10px;">
                <a href="#!" class="btn-flat waves-effect waves-teal edit-btn" title="Edytuj">
                    <i class="material-icons blue-text text-darken-2">edit</i>
                </a>
                <a href="#!" class="btn-flat waves-effect waves-red delete-btn" title="Usuń">
                    <i class="material-icons red-text text-darken-2">delete_forever</i>
                </a>
            </div>
            
            <!-- Szczegóły zadania (meta-dane) -->
            <div class="col s12 task-details">
                <!-- Priorytet -->
                <span class="priority-badge ${priorityClass}">${priorityText}</span>
                
                <!-- Termin wykonania (PRZYWRÓCONY) -->
                ${task.deadline ? `
                <span class="task-meta chip ${overdue ? 'red-text text-darken-2 overdue-chip' : ''}">
                    <i class="material-icons">date_range</i>
                    ${escapeHTML(task.deadline)}
                </span>` : ''}

                <!-- Wykonawca -->
                ${task.assignee ? `
                <span class="task-meta chip">
                    <i class="material-icons">person</i>
                    ${escapeHTML(task.assignee)}
                </span>` : ''}
                
                <!-- Kategoria -->
                ${task.category ? `
                <span class="task-meta chip">
                    <i class="material-icons">label</i>
                    ${escapeHTML(task.category)}
                </span>` : ''}
                
            </div>
        </div>
    `;
    return li;
}

/**
 * Aktualizuje licznik aktywnych zadań.
 */
function updateTaskCounter() {
    const activeTasksCount = tasks.filter(task => task.status === 'active').length;
    taskCounter.textContent = `Aktywne zadania: ${activeTasksCount}`;
    taskCounter.classList.remove('hide');
}

/**
 * Obsługuje kliknięcie przycisków filtrów.
 * @param {Event} e Zdarzenie click
 */
function handleFilterClick(e) {
    e.preventDefault();
    const clickedButton = e.target.closest('a.btn, a.btn-flat'); // Znajdź kliknięty link
    
    if (!clickedButton || !clickedButton.dataset.filter) return; // Wyjdź, jeśli kliknięto poza przyciskiem

    const filter = clickedButton.dataset.filter;
    if (filter === currentFilter) return; // Nie rób nic, jeśli filtr jest już aktywny

    currentFilter = filter;
    
    // Zaktualizuj wygląd przycisków
    filterButtonsContainer.querySelectorAll('a').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('blue'); // Aktywny filtr
            btn.classList.remove('btn-flat');
        } else {
            btn.classList.remove('blue');
            btn.classList.add('btn-flat');
        }
    });

    renderTasks(); // Prerenderuj listę z nowym filtrem
}


// --- Funkcje pomocnicze ---

/**
 * Zwraca klasę CSS dla priorytetu.
 * @param {string} priority 'low', 'medium', 'high'
 * @returns {string} Klasa CSS
 */
function getPriorityClass(priority) {
    switch (priority) {
        case 'low': return 'low';
        case 'medium': return 'medium';
        case 'high': return 'high';
        default: return 'medium'; // Domyślny
    }
}

/**
 * Zabezpiecza tekst przed wstrzyknięciem HTML.
 * @param {string} str Tekst do zabezpieczenia
 * @returns {string} Zabezpieczony tekst
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

/**
 * Paruje datę z formatu dd.mm.yyyy do obiektu Date.
 * @param {string} dateString Data w formacie dd.mm.yyyy
 * @returns {Date | null} Obiekt Date lub null
 */
function parseDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('.');
    if (parts.length === 3) {
        // Miesiące w Date są 0-indeksowane (0=Styczeń, 11=Grudzień)
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
}

/**
 * Sprawdza, czy zadanie jest przeterminowane.
 * @param {object} task Obiekt zadania
 * @returns {boolean} True, jeśli przeterminowane
 */
function isTaskOverdue(task) {
    if (task.status === 'completed' || !task.deadline) {
        return false;
    }
    const deadlineDate = parseDate(task.deadline);
    if (!deadlineDate) return false;

    // Resetujemy 'today' na początek dnia dla czystego porównania
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Jeśli data terminu jest wcześniejsza niż początek dzisiejszego dnia,
    // oznacza to, że termin minął wczoraj lub wcześniej.
    return deadlineDate < todayStart;
}