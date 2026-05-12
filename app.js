function addTodo() {
    const newTodo = document.getElementById('new-todo').value.trim();
    if (newTodo) {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        todos.push({ text: newTodo, completed: false });
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodoList();
        renderRemainingCount();
        document.getElementById('new-todo').value = ''; // Clear input field
    }
}

function completeTodo(index) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos[index].completed = true;
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodoList();
    renderRemainingCount();
}

function deleteTodo(index) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos.splice(index, 1);
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodoList();
    renderRemainingCount();
}

function renderTodoList() {
    const todoList = document.getElementById('todo-list');
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const todoItem = document.createElement('li');
        todoItem.textContent = todo.text;
        if (todo.completed) {
            todoItem.style.textDecoration = 'line-through';
            todoItem.style.color = '#ccc';
            const completeBtn = document.createElement('button');
            completeBtn.textContent = 'Mark as incomplete';
            completeBtn.addEventListener('click', () => completeTodo(index));
            todoItem.appendChild(completeBtn);
        } else {
            const completeBtn = document.createElement('button');
            completeBtn.textContent = 'Mark as completed';
            completeBtn.addEventListener('click', () => completeTodo(index));
            todoItem.appendChild(completeBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTodo(index));
        todoItem.appendChild(deleteBtn);
        todoList.appendChild(todoItem);
    });
}

function renderRemainingCount() {
    const remainingCount = JSON.parse(localStorage.getItem('todos')) || [];
    const incompleteTodos = remainingCount.filter(todo => !todo.completed);
    const remainingSpan = document.getElementById('remaining-todos');
    remainingSpan.textContent = incompleteTodos.length;
}

function initApp() {
    const addBtn = document.getElementById('add-btn');
    addBtn.addEventListener('click', addTodo);

    const todoList = document.getElementById('todo-list');
    todoList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.textContent.includes('Mark as')) {
            const index = todoList.children.indexOf(e.target.parentNode);
            const completeBtns = Array.from(todoList.children).map((child, i) => child.querySelector('button') || null).filter(btn => btn !== null);
            completeBtns[index].textContent = completeBtns[index].textContent.includes('Mark as completed') ? 'Mark as incomplete' : 'Mark as completed';
        } else if (e.target.tagName === 'BUTTON' && e.target.textContent === 'Delete') {
            const index = todoList.children.indexOf(e.target.parentNode);
            deleteTodo(index);
        }
    });

    renderTodoList();
    renderRemainingCount();
}

if (typeof module !== 'undefined') module.exports = { addTodo, completeTodo, deleteTodo, renderTodoList, renderRemainingCount, initApp };

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}

---