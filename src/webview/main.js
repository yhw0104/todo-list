(function () {
  const vscode = acquireVsCodeApi();

  const $todos = document.getElementById('todos');
  const $empty = document.getElementById('empty');
  const $counter = document.getElementById('counter');
  const $form = document.getElementById('composer');
  const $input = document.getElementById('input');

  let items = [];
  let editingId = null;

  function send(msg) {
    vscode.postMessage(msg);
  }

  function render() {
    $todos.innerHTML = '';
    $empty.hidden = items.length > 0;

    const remaining = items.filter((t) => !t.done).length;
    $counter.textContent = `${remaining}개 남음 · 총 ${items.length}개`;

    for (const todo of items) {
      const li = document.createElement('li');
      li.className = 'todo' + (todo.done ? ' todo--done' : '');
      li.dataset.id = String(todo.id);

      const check = document.createElement('button');
      check.className = 'todo__check';
      check.type = 'button';
      check.setAttribute('aria-label', todo.done ? '완료 취소' : '완료');
      check.textContent = todo.done ? '✓' : '';
      check.addEventListener('click', () => send({ type: 'toggle', id: todo.id }));
      li.appendChild(check);

      if (editingId === todo.id) {
        const editInput = document.createElement('input');
        editInput.className = 'todo__edit-input';
        editInput.type = 'text';
        editInput.value = todo.text;
        const commit = () => {
          const next = editInput.value.trim();
          editingId = null;
          if (next && next !== todo.text) {
            send({ type: 'update', id: todo.id, text: next });
          } else {
            render();
          }
        };
        const cancel = () => {
          editingId = null;
          render();
        };
        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        });
        editInput.addEventListener('blur', commit);
        li.appendChild(editInput);
        setTimeout(() => editInput.focus(), 0);
      } else {
        const text = document.createElement('div');
        text.className = 'todo__text';
        text.textContent = todo.text;
        text.addEventListener('dblclick', () => {
          editingId = todo.id;
          render();
        });
        li.appendChild(text);

        const actions = document.createElement('div');
        actions.className = 'todo__actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.type = 'button';
        editBtn.title = '수정';
        editBtn.textContent = '✎';
        editBtn.addEventListener('click', () => {
          editingId = todo.id;
          render();
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'icon-btn';
        removeBtn.type = 'button';
        removeBtn.title = '삭제';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => {
          send({ type: 'remove', id: todo.id });
        });

        actions.appendChild(editBtn);
        actions.appendChild(removeBtn);
        li.appendChild(actions);
      }

      $todos.appendChild(li);
    }
  }

  $form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $input.value.trim();
    if (!text) return;
    send({ type: 'add', text });
    $input.value = '';
  });

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg && msg.type === 'todos') {
      items = msg.items;
      render();
    }
  });

  send({ type: 'load' });
})();
