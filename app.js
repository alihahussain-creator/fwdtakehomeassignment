// Named functions at the top
function createTodoElement(todo) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;

    const description = document.createElement('span');
    description.textContent = todo.description;
    if (todo.completed) description.style.textDecoration = 'line-through';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';

    const li = document.createElement('li');
    li.appendChild(checkbox);
    li.appendChild(description);
    li.appendChild(deleteBtn);

    deleteBtn.addEventListener('click', () => {
        deleteTodo(todo.id);
    });
    checkbox.addEventListener('change', () => {
        toggleTodo(todo.id);
    });

    return li;
}

function renderTodos(todos) {
    const ul = document.getElementById('todo-list');
    ul.innerHTML = '';

    const remainingCount = todos.filter(todo => !todo.completed).length;
    document.getElementById('remaining-todos-count').textContent = `${remainingCount} items left`;

    todos.forEach(todo => {
        ul.appendChild(createTodoElement(todo));
    });
}

function addTodo() {
    const input = document.getElementById('todo-input');
    const description = input.value.trim();
    if (description) {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        const newTodo = { description, id: Date.now(), completed: false };
        todos.push(newTodo);
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos(todos);
        input.value = '';
    }
}

function toggleTodo(id) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex !== -1) {
        todos[todoIndex].completed = !todos[todoIndex].completed;
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos(todos);
    }
}

function deleteTodo(id) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const newTodos = todos.filter(todo => todo.id !== id);
    localStorage.setItem('todos', JSON.stringify(newTodos));
    renderTodos(newTodos);
}

function initApp() {
    const addTodoBtn = document.getElementById('add-todo-btn');
    addTodoBtn.addEventListener('click', addTodo);
    const todoInput = document.getElementById('todo-input');
    todoInput.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            addTodo();
        }
    });
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    renderTodos(todos);
}

// Export functions
if (typeof module !== 'undefined') module.exports = { createTodoElement, addTodo, toggleTodo, deleteTodo, initApp, renderTodos };

// Browser startup block
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}