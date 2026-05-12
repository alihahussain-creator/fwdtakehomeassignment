function generateTodoHTML(todos) {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const completed = todo.completed ? 'completed' : '';
        const strike = todo.completed ? 'text-decoration: line-through;' : '';
        const li = document.createElement('li');
        li.setAttribute('data-index', index);
        li.innerHTML = `<span style="${strike}" contenteditable="true">${todo.text}</span>`;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        const delButton = document.createElement('button');
        delButton.textContent = 'Delete';
        delButton.addEventListener('click', deleteTodo);
        li.appendChild(checkbox);
        li.appendChild(delButton);
        todoList.appendChild(li);
    });
    document.getElementById('remaining-count').textContent = `Remaining: ${todos.filter(todo => !todo.completed).length}`;
}

function addTodo() {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const newTodoInput = document.getElementById('new-todo');
    const newTodo = newTodoInput.value.trim();
    if (newTodo) {
        todos.push({ text: newTodo, completed: false });
        newTodoInput.value = '';
        localStorage.setItem('todos', JSON.stringify(todos));
        generateTodoHTML(todos);
    }
}

function toggleComplete(todoIndex) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos[todoIndex].completed = !todos[todoIndex].completed;
    localStorage.setItem('todos', JSON.stringify(todos));
    generateTodoHTML(todos);
}

function deleteTodo(e) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const todoIndex = Array.prototype.indexOf.call(e.target.parentNode.children, e.target.parentNode);
    todos.splice(todoIndex, 1);
    localStorage.setItem('todos', JSON.stringify(todos));
    generateTodoHTML(todos);
}

function initApp() {
    const addTodoButton = document.getElementById('add-todo');
    addTodoButton.addEventListener('click', addTodo);
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && document.activeElement.id === 'new-todo') {
            addTodo();
        }
    });
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    generateTodoHTML(todos);
    const todoList = document.getElementById('todo-list');
    todoList.addEventListener('change', (e) => {
        if (e.target.nodeName === 'INPUT' && e.target.type === 'checkbox') {
            const todoIndex = Array.prototype.indexOf.call(todoList.children, e.target.parentNode);
            toggleComplete(todoIndex);
        }
    });
}

function getComputedStyle(element) {
    return window.getComputedStyle ? window.getComputedStyle(element) : element.currentStyle;
}

if (typeof module !== 'undefined') {
    module.exports = { generateTodoHTML, addTodo, toggleComplete, deleteTodo, initApp, getComputedStyle };
}
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}