function addTodo(text) {
    const todo = { text, completed: false };
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos.push(todo);
    localStorage.setItem('todos', JSON.stringify(todos));
}

function deleteTodo(index) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos.splice(index, 1);
    localStorage.setItem('todos', JSON.stringify(todos));
}

function updateTodoCount() {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const remainingCount = todos.filter(todo => !todo.completed).length;
    document.getElementById('count').textContent = remainingCount;
}

function toggleTodo(index) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos[index].completed = !todos[index].completed;
    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos(todos) {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const todoElement = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(index));
        const text = document.createElement('span');
        if (todo.completed) {
            text.textContent = todo.text;
            text.style.textDecorationLine = 'line-through';
        } else {
            text.textContent = todo.text;
        }
        text.addEventListener('dblclick', () => toggleTodo(index));
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteTodo(index));
        todoElement.appendChild(checkbox);
        todoElement.appendChild(text);
        todoElement.appendChild(deleteButton);
        todoList.appendChild(todoElement);
    });
}

function initApp() {
    const addButtonText = document.getElementById('add-button');
    const newTodoInput = document.getElementById('new-todo');
    const todoList = document.getElementById('todo-list');
    const countElement = document.getElementById('count');
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    addButtonText.addEventListener('click', () => {
        const text = newTodoInput.value.trim();
        if (text) {
            addTodo(text);
            newTodoInput.value = '';
            renderTodos(todos);
            updateTodoCount();
        }
    });
    newTodoInput.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            const text = newTodoInput.value.trim();
            if (text) {
                addTodo(text);
                newTodoInput.value = '';
                renderTodos(todos);
                updateTodoCount();
            }
        }
    });
    todoList.addEventListener('click', event => {
        if (event.target.tagName === 'BUTTON' && event.target.textContent === 'Delete') {
            const index = Array.prototype.indexOf.call(todoList.children, event.target.parentNode);
            deleteTodo(index);
            renderTodos(todos);
            updateTodoCount();
        }
    });
    renderTodos(todos);
    updateTodoCount();
}

function init() {
    if (typeof module !== 'undefined') module.exports = { addTodo, deleteTodo, updateTodoCount, toggleTodo, renderTodos, initApp };
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
        } else {
            initApp();
        }
    }
}
init();