function updateRemaining() {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const incompleteCount = todos.filter(todo => !todo.done).length;
    document.getElementById('remaining-todos').textContent = incompleteCount;
}

function renderTodos() {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const list = document.getElementById('todos-list');
    list.innerHTML = '';
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.textContent = todo.text;
        li.style.textDecoration = todo.done ? 'line-through' : 'none';
        if (todo.done) {
            li.style.color = 'gray';
            li.style.opacity = 0.7;
        }
        li.addEventListener('click', () => toggleTodo(todo));
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => deleteTodo(todo));
        li.appendChild(delBtn);
        list.appendChild(li);
    });
    updateRemaining();
}

function deleteTodo(todo) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const index = todos.indexOf(todo);
    if (index !== -1) todos.splice(index, 1);
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodos();
}

function toggleTodo(todo) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todo.done = !todo.done;
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodos();
}

function addTodo() {
    const newTodoText = document.getElementById('new-todo').value;
    if (newTodoText.trim() !== '') {
        const todo = { text: newTodoText, done: false };
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        todos.push(todo);
        localStorage.setItem('todos', JSON.stringify(todos));
        document.getElementById('new-todo').value = '';
        renderTodos();
    }
}

function initApp() {
    const addBtn = document.getElementById('add-todo-btn');
    addBtn.addEventListener('click', addTodo);
    document.getElementById('new-todo').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addTodo();
        }
    });
    renderTodos();
}

if (typeof module !== 'undefined') module.exports = { updateRemaining, renderTodos, deleteTodo, toggleTodo, addTodo, initApp };

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}