function initTodos() {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    return todos.map(todo => ({ ...todo, complete: todo.complete === 'true' }));
}

function updateTodos(todos) {
    localStorage.setItem('todos', JSON.stringify(todos.map(todo => ({ complete: todo.complete }))));
}

function createTodoItem(todo, index) {
    const listItem = document.createElement('LI');
    listItem.dataset.index = index;
    listItem.textContent = todo.text;
    if (todo.complete) {
        const textNode = listItem.firstChild;
        textNode.style.textDecoration = 'line-through';
        const checkbox = document.createElement('INPUT');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.addEventListener('change', (e) => toggleTodoCompletion(index));
        listItem.insertBefore(checkbox, textNode);
    }

    const deleteButton = document.createElement('BUTTON');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteTodo(index));
    listItem.appendChild(deleteButton);

    return listItem;
}

function renderTodoList(todos) {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    const remainingCountElement = document.getElementById('remaining-count');
    const incompleteCount = todos.filter(todo => !todo.complete).length;
    remainingCountElement.textContent = `Remaining: ${incompleteCount}`;

    todos.forEach(createTodoItem).forEach(todo => todoList.appendChild(todo));
}

function addTodo() {
    const newText = document.getElementById('new-todo').value;
    if (!newText.trim()) return;
    const newTodo = { text: newText, complete: false };
    const todos = [...initTodos(), newTodo];
    updateTodos(todos);
    renderTodoList(todos);
    document.getElementById('new-todo').value = '';
}

function toggleTodoCompletion(index) {
    const todos = initTodos();
    todos[index].complete = !todos[index].complete;
    updateTodos(todos);
    renderTodoList(todos);
}

function deleteTodo(index) {
    const todos = initTodos();
    todos.splice(index, 1);
    updateTodos(todos);
    renderTodoList(todos);
}

function initApp() {
    const addTodoButton = document.getElementById('add-todo');
    const newTodoInput = document.getElementById('new-todo');
    addTodoButton.addEventListener('click', addTodo);
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    renderTodoList(initTodos());
}

if (typeof module !== 'undefined') module.exports = {
    initTodos, updateTodos, createTodoItem, renderTodoList, addTodo, toggleTodoCompletion, deleteTodo, initApp
};

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}